import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { dbStore } from './db/store';
import { postsDatabase } from './db/posts';
import { authUsersDatabase } from './db/auth-users';
import {
  AuthRequest,
  createSessionToken,
  getAuthClientApp,
  optionalAuth,
  requireAdmin,
  requireAuth,
  verifySessionToken,
} from './auth';
import { calculateOrderTotals, isValidStatusTransition } from './domain/rules';
import { OrderStatus } from './db/types';

export const apiRouter = express.Router();

// Health check with DB mode & provisional details
apiRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const branch = await dbStore.getBranch();
    const database = await dbStore.getStorageStatus();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      branch: {
        name: branch.name,
        address: branch.address,
        isProvisional: branch.isProvisional,
      },
      database,
      postsDatabase: postsDatabase.getStatus(),
      accountsDatabase: authUsersDatabase.getStatus(),
      paymentMethods: {
        cod: 'ACTIVE',
        upi: 'DEMO_SANDBOX_ONLY (Credentials not yet configured by business)',
      },
    });
  } catch (err: any) {
    console.error('Storage health check failed:', err);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        type: process.env.DATABASE_URL ? 'PostgreSQL (StoreState JSONB)' : 'File-Backed Transactional Store (.data/waffle_db.json)',
        connected: false,
        persistenceActive: false,
      },
      postsDatabase: postsDatabase.getStatus(),
      accountsDatabase: authUsersDatabase.getStatus(),
      error: 'Storage initialization failed',
    });
  }
});

// Read-only view of the existing PostgreSQL post feed for the staff dashboard.
apiRouter.get('/admin/posts', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await postsDatabase.getPosts();
    res.json(result);
  } catch (err: any) {
    console.error('Could not load posts:', err?.code || 'database error');
    res.status(503).json({ error: 'Posts are temporarily unavailable.' });
  }
});

// Branch settings
apiRouter.get('/branch', async (_req: Request, res: Response) => {
  const branch = await dbStore.getBranch();
  res.json({ branch });
});

// Categories & Products
apiRouter.get('/categories', async (_req: Request, res: Response) => {
  const categories = await dbStore.getCategories();
  res.json({ categories });
});

apiRouter.get('/products', async (req: Request, res: Response) => {
  const includeUnavailable = req.query.all === 'true';
  const products = await dbStore.getProducts(includeUnavailable);
  res.json({ products });
});

apiRouter.get('/products/:id', async (req: Request, res: Response) => {
  const product = await dbStore.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ product });
});

// Customer Authentication
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().transform((value) => value.replace(/\D/g, '')).pipe(
    z.string().min(10, 'Valid 10-digit mobile number required').max(15, 'Mobile number must be 15 digits or fewer'),
  ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
});

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function setSessionCookie(res: Response, token: string, role: string) {
  const cookieName = role === 'CUSTOMER' ? 'customer_session' : 'staff_session';
  res.cookie(cookieName, token, {
    ...sessionCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    if (getAuthClientApp(req) === 'admin') {
      return res.status(403).json({ error: 'Customer registration is not available in the staff app.' });
    }
    const parsed = registerSchema.parse(req.body);
    const existing = await dbStore.getUserByPhone(parsed.phone);
    if (existing) {
      return res.status(400).json({ error: 'An account with this mobile number already exists.' });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await dbStore.createUser({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email || undefined,
      passwordHash,
      role: 'CUSTOMER',
    });

    const token = createSessionToken({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });

    setSessionCookie(res, token, user.role);

    res.status(201).json({
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role },
      token,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues?.[0]?.message || 'Validation error' });
    }
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

const loginSchema = z.object({
  phone: z.string().trim().transform((value) => value.replace(/\D/g, '')).pipe(
    z.string().min(10, 'Valid 10-digit mobile number required').max(15, 'Mobile number must be 15 digits or fewer'),
  ),
  password: z.string().min(1, 'Password required'),
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const user = await dbStore.getUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    const clientApp = getAuthClientApp(req);
    const isStaff = user.role === 'ADMIN' || user.role === 'OPERATOR';
    if (clientApp === 'admin' && !isStaff) {
      return res.status(403).json({ error: 'Use a staff account to sign in to the admin app.' });
    }
    if (clientApp === 'customer' && isStaff) {
      return res.status(403).json({ error: 'Staff accounts must sign in through the admin app.' });
    }

    const token = createSessionToken({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });

    setSessionCookie(res, token, user.role);

    res.json({
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role },
      token,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues?.[0]?.message || 'Validation error' });
    }
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const clientApp = getAuthClientApp(req);
  if (clientApp === 'admin') {
    res.clearCookie('staff_session', sessionCookieOptions);
  } else if (clientApp === 'customer') {
    res.clearCookie('customer_session', sessionCookieOptions);
  } else {
    res.clearCookie('staff_session', sessionCookieOptions);
    res.clearCookie('customer_session', sessionCookieOptions);
  }

  const legacyUser = req.cookies?.token ? verifySessionToken(req.cookies.token) : null;
  const clearLegacy = !clientApp || (clientApp === 'admin'
    ? legacyUser?.role === 'ADMIN' || legacyUser?.role === 'OPERATOR'
    : legacyUser?.role === 'CUSTOMER');
  if (clearLegacy) res.clearCookie('token', sessionCookieOptions);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, message: 'Logged out successfully' });
});

apiRouter.get('/auth/me', optionalAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user || null });
});

apiRouter.put('/auth/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const updated = await dbStore.updateUser(req.user!.id, { name, email });
    res.json({
      user: { id: updated.id, name: updated.name, phone: updated.phone, email: updated.email, role: updated.role },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Profile update failed' });
  }
});

// Addresses
apiRouter.get('/addresses', requireAuth, async (req: AuthRequest, res: Response) => {
  const addresses = await dbStore.getUserAddresses(req.user!.id);
  res.json({ addresses });
});

apiRouter.post('/addresses', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { label, street, landmark, city, postalCode, instructions, isDefault } = req.body;
    if (!street) {
      return res.status(400).json({ error: 'Street address is required' });
    }
    const newAddress = await dbStore.addAddress({
      userId: req.user!.id,
      label: label || 'Home',
      street,
      landmark,
      city: city || 'Mandadam',
      postalCode,
      instructions,
      isDefault: Boolean(isDefault),
    });
    res.status(201).json({ address: newAddress });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save address' });
  }
});

// Cart Validation endpoint (authoritative prices from DB)
const cartValidateSchema = z.object({
  fulfilmentMode: z.enum(['DELIVERY', 'TAKEAWAY']),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      variantName: z.string().optional(),
      addons: z
        .array(
          z.object({
            name: z.string(),
            quantity: z.number().int().positive(),
          })
        )
        .optional(),
    })
  ),
});

apiRouter.post('/cart/validate', async (req: Request, res: Response) => {
  try {
    const { items, fulfilmentMode } = cartValidateSchema.parse(req.body);
    const branch = await dbStore.getBranch();

    const calculationItems = [];
    const verifiedItems = [];

    for (const item of items) {
      const prod = await dbStore.getProductById(item.productId);
      if (!prod) {
        return res.status(400).json({ error: `Product ID ${item.productId} not found in catalog.` });
      }
      if (!prod.isAvailable) {
        return res.status(400).json({
          error: `"${prod.name}" is currently unavailable or sold out. Please remove it to proceed.`,
        });
      }

      let variantPriceDelta = 0;
      if (item.variantName) {
        const variant = prod.variants.find((v) => v.name === item.variantName);
        if (variant) variantPriceDelta = Number(variant.priceDelta);
      }

      const verifiedAddons: Array<{ name: string; price: number; quantity: number }> = [];
      if (item.addons) {
        for (const a of item.addons) {
          const addonDef = prod.addons.find((ad) => ad.name === a.name);
          if (addonDef) {
            verifiedAddons.push({
              name: addonDef.name,
              price: Number(addonDef.price),
              quantity: a.quantity,
            });
          }
        }
      }

      calculationItems.push({
        basePrice: Number(prod.basePrice),
        quantity: item.quantity,
        variantPriceDelta,
        addons: verifiedAddons,
      });

      const unitPrice = Number(prod.basePrice) + variantPriceDelta;
      const addonsCost = verifiedAddons.reduce((acc, a) => acc + a.price * a.quantity, 0);

      verifiedItems.push({
        productId: prod.id,
        productName: prod.name,
        imageUrl: prod.imageUrl,
        unitPrice: unitPrice + addonsCost,
        quantity: item.quantity,
        variantName: item.variantName,
        addons: verifiedAddons,
        subtotal: Math.round((unitPrice + addonsCost) * item.quantity * 100) / 100,
      });
    }

    const totals = calculateOrderTotals(calculationItems, fulfilmentMode, Number(branch.deliveryFee));

    res.json({
      items: verifiedItems,
      totals,
      branch: {
        id: branch.id,
        name: branch.name,
        minOrderAmount: branch.minOrderAmount,
        deliveryFee: branch.deliveryFee,
        orderAcceptancePaused: branch.orderAcceptancePaused,
        deliveryAvailable: branch.deliveryAvailable,
        takeawayAvailable: branch.takeawayAvailable,
        isProvisional: branch.isProvisional,
      },
      isEligible: totals.subtotal >= branch.minOrderAmount,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues?.[0]?.message || 'Invalid cart payload' });
    }
    res.status(400).json({ error: err.message || 'Cart validation failed' });
  }
});

// Orders
const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name required'),
  customerPhone: z.string().trim().min(10, 'Valid 10-digit mobile number required'),
  fulfilmentMode: z.enum(['DELIVERY', 'TAKEAWAY']),
  deliveryAddressSnapshot: z
    .object({
      label: z.string(),
      street: z.string().min(3, 'Street address required'),
      landmark: z.string().optional(),
      city: z.string().default('Mandadam'),
      postalCode: z.string().optional(),
      instructions: z.string().optional(),
    })
    .optional(),
  takeawayPickupTime: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      variantName: z.string().optional(),
      addons: z.array(z.object({ name: z.string(), quantity: z.number() })).optional(),
    })
  ),
  paymentMethod: z.enum(['COD', 'UPI']),
  customerNotes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

apiRouter.post('/orders', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createOrderSchema.parse(req.body);

    if (parsed.fulfilmentMode === 'DELIVERY' && !parsed.deliveryAddressSnapshot) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
    }

    const newOrder = await dbStore.createOrder({
      userId: req.user?.id,
      customerName: parsed.customerName,
      customerPhone: parsed.customerPhone,
      fulfilmentMode: parsed.fulfilmentMode,
      deliveryAddressSnapshot: parsed.deliveryAddressSnapshot,
      takeawayPickupTime: parsed.takeawayPickupTime,
      items: parsed.items,
      paymentMethod: parsed.paymentMethod,
      customerNotes: parsed.customerNotes,
      idempotencyKey: parsed.idempotencyKey,
    });

    res.status(201).json({ order: newOrder });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues?.[0]?.message || 'Order validation failed' });
    }
    res.status(400).json({ error: err.message || 'Failed to place order' });
  }
});

apiRouter.get('/orders/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const order = await dbStore.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Security check: If authenticated customer, verify they own the order
  if (req.user && req.user.role === 'CUSTOMER' && order.userId && order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to view this order.' });
  }

  res.json({ order });
});

apiRouter.get('/orders/user/history', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await dbStore.getOrders({ userId: req.user!.id, limit: 50 });
  res.json({ orders: result.orders });
});

apiRouter.post('/orders/:id/cancel', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const actorRole = req.user?.role || 'CUSTOMER';
    const actor = {
      id: req.user?.id,
      name: req.user?.name || 'Customer',
      role: actorRole,
    };
    const updated = await dbStore.cancelOrder(req.params.id, actor, reason || 'Customer requested cancellation');
    res.json({ order: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to cancel order' });
  }
});

// Support Tickets
apiRouter.get('/tickets', requireAuth, async (req: AuthRequest, res: Response) => {
  const tickets = await dbStore.getTickets({ userId: req.user!.id });
  res.json({ tickets });
});

apiRouter.post('/tickets', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { customerName, customerPhone, category, orderId, message } = req.body;
    if (!message || !category) {
      return res.status(400).json({ error: 'Category and message are required' });
    }
    const ticket = await dbStore.createTicket({
      userId: req.user?.id,
      orderId,
      customerName: customerName || req.user?.name || 'Customer',
      customerPhone: customerPhone || req.user?.phone || '',
      category,
      message,
    });
    res.status(201).json({ ticket });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create ticket' });
  }
});

apiRouter.post('/tickets/:id/reply', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message cannot be empty' });

    const ticket = await dbStore.addTicketReply(req.params.id, {
      senderId: req.user?.id,
      senderRole: 'CUSTOMER',
      senderName: req.user?.name || 'Customer',
      message,
    });
    res.json({ ticket });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to send reply' });
  }
});

// Feedback
apiRouter.get('/feedback', async (_req: Request, res: Response) => {
  const feedback = await dbStore.getFeedback(true);
  res.json({ feedback });
});

apiRouter.post('/feedback', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, rating, comment } = req.body;
    if (!orderId || !rating || !comment) {
      return res.status(400).json({ error: 'Order ID, rating (1-5), and written comment are required' });
    }
    const order = await dbStore.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['DELIVERED', 'PICKED_UP'].includes(order.orderStatus)) {
      return res.status(400).json({ error: 'Feedback can only be submitted for completed orders.' });
    }

    const entry = await dbStore.submitFeedback({
      orderId,
      userId: req.user?.id,
      customerName: order.customerName,
      rating: Number(rating),
      comment,
    });
    res.status(201).json({ feedback: entry });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit feedback' });
  }
});

// ================= ADMIN & OPERATOR ENDPOINTS ================= //

// Admin overview metrics
apiRouter.get('/admin/metrics', requireAdmin, async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const metrics = await dbStore.getMetrics(startDate, endDate);
  res.json({ metrics });
});

// Admin orders list
apiRouter.get('/admin/orders', requireAdmin, async (req: Request, res: Response) => {
  const { status, search, limit, offset } = req.query as {
    status?: OrderStatus;
    search?: string;
    limit?: string;
    offset?: string;
  };
  const result = await dbStore.getOrders({
    status,
    search,
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  });
  res.json(result);
});

// Admin update order status
apiRouter.patch('/admin/orders/:id/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { newStatus, reason } = req.body;
    if (!newStatus) return res.status(400).json({ error: 'newStatus is required' });

    const order = await dbStore.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const check = isValidStatusTransition(order.orderStatus, newStatus as OrderStatus, order.fulfilmentMode);
    if (!check.allowed) {
      return res.status(400).json({ error: check.reason });
    }

    const updated = await dbStore.updateOrderStatus(
      order.id,
      newStatus as OrderStatus,
      { id: req.user!.id, name: req.user!.name, role: req.user!.role },
      reason
    );
    res.json({ order: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update status' });
  }
});

// Admin record COD payment collection
apiRouter.post('/admin/orders/:id/payment', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const updated = await dbStore.recordPaymentCollection(
      req.params.id,
      { id: req.user!.id, name: req.user!.name, role: req.user!.role },
      notes
    );
    res.json({ order: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record payment' });
  }
});

// Admin product CRUD
apiRouter.post('/admin/products', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, categoryId, description, imageUrl, basePrice, variants, addons, isFeatured, isAvailable } = req.body;
    if (!name || !categoryId || basePrice === undefined) {
      return res.status(400).json({ error: 'Product name, category, and price are required' });
    }
    const newProduct = await dbStore.createProduct(
      {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        categoryId,
        description: description || '',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1568051243851-f9b136146e97?auto=format&fit=crop&w=700&q=80',
        basePrice: Number(basePrice),
        variants: variants || [],
        addons: addons || [],
        isFeatured: Boolean(isFeatured),
        isAvailable: isAvailable !== false,
        isDemoPrice: true,
      },
      { id: req.user!.id, name: req.user!.name, role: req.user!.role }
    );
    res.status(201).json({ product: newProduct });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create product' });
  }
});

apiRouter.put('/admin/products/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await dbStore.updateProduct(
      req.params.id,
      req.body,
      { id: req.user!.id, name: req.user!.name, role: req.user!.role }
    );
    res.json({ product: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update product' });
  }
});

// Admin branch & operational settings
apiRouter.patch('/admin/branch', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await dbStore.updateBranch(
      req.body,
      { id: req.user!.id, name: req.user!.name, role: req.user!.role }
    );
    res.json({ branch: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update branch settings' });
  }
});

// Admin tickets
apiRouter.get('/admin/tickets', requireAdmin, async (_req: Request, res: Response) => {
  const tickets = await dbStore.getTickets();
  res.json({ tickets });
});

apiRouter.post('/admin/tickets/:id/reply', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { message, newStatus, isInternal } = req.body;
    if (!message) return res.status(400).json({ error: 'Message cannot be empty' });

    const ticket = await dbStore.addTicketReply(req.params.id, {
      senderId: req.user!.id,
      senderRole: 'STAFF',
      senderName: req.user!.name,
      message,
      isInternal: Boolean(isInternal),
      newStatus,
    });
    res.json({ ticket });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to send reply' });
  }
});

// Admin feedback moderation
apiRouter.get('/admin/feedback', requireAdmin, async (_req: Request, res: Response) => {
  const feedback = await dbStore.getFeedback(false);
  res.json({ feedback });
});

// Admin audit logs
apiRouter.get('/admin/audit-logs', requireAdmin, async (_req: Request, res: Response) => {
  const auditLogs = await dbStore.getAuditLogs(100);
  res.json({ auditLogs });
});

// Admin registered customers list
apiRouter.get('/admin/customers', requireAdmin, async (_req: Request, res: Response) => {
  const users = await dbStore.getAllUsers();
  res.json({ users });
});
