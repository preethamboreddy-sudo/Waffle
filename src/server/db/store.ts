import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { authUsersDatabase } from './auth-users';
import {
  AddressEntity,
  AuditLogEntity,
  BranchEntity,
  CategoryEntity,
  FeedbackEntity,
  FulfilmentMode,
  OrderEntity,
  OrderItemSnapshot,
  OrderStatus,
  PaymentMethod,
  PaymentRecordEntity,
  PaymentStatus,
  ProductEntity,
  Role,
  SupportTicketEntity,
  UserEntity,
} from './types';
import {
  INITIAL_BRANCH,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  getInitialUsers,
} from './seed-data';

interface DatabaseData {
  branch: BranchEntity;
  categories: CategoryEntity[];
  products: ProductEntity[];
  users: UserEntity[];
  addresses: AddressEntity[];
  orders: OrderEntity[];
  tickets: SupportTicketEntity[];
  feedback: FeedbackEntity[];
  auditLogs: AuditLogEntity[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'waffle_db.json');

class DataStore {
  private data: DatabaseData | null = null;
  private isInitialized = false;
  private initialization: Promise<void> | null = null;
  private postgresTableReady = false;
  private pendingWrite: Promise<unknown> = Promise.resolve();
  private readonly pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
    : null;

  private async ensureInitialized() {
    if (this.isInitialized && this.data) return;
    if (!this.initialization) {
      this.initialization = this.initialize().finally(() => {
        this.initialization = null;
      });
    }
    await this.initialization;
  }

  async connect() {
    await this.ensureInitialized();
    if (this.pool) await this.pool.query('SELECT 1');
  }

  private async ensurePostgresTable() {
    if (!this.pool || this.postgresTableReady) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "StoreState" (
        "id" INTEGER PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
        "data" JSONB NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.postgresTableReady = true;
  }

  private async initialize() {

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (this.pool) {
      await this.ensurePostgresTable();
      const result = await this.pool.query<{ data: DatabaseData }>(
        'SELECT "data" FROM "StoreState" WHERE "id" = 1'
      );
      if (result.rows[0]) {
        this.data = result.rows[0].data;
        this.isInitialized = true;
        return;
      }
    }

    let loadedFromFile = false;
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        loadedFromFile = true;
      } catch (err) {
        console.warn('Error reading saved store data, re-seeding:', err);
      }
    }

    if (loadedFromFile) {
      if (this.pool) await this.persist();
      this.isInitialized = true;
      return;
    }

    // Seed fresh data
    const initialUsers = await getInitialUsers();
    this.data = {
      branch: INITIAL_BRANCH,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      users: initialUsers,
      addresses: [
        {
          id: 'addr-01',
          userId: 'usr-customer-01',
          label: 'Home',
          street: 'Plot 42, Green Meadows',
          landmark: 'Near Krishna Canal View',
          city: 'Mandadam',
          postalCode: '522503',
          instructions: 'Call on arrival at the gate',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      orders: [],
      tickets: [],
      feedback: [],
      auditLogs: [
        {
          id: 'audit-init-01',
          actorName: 'System Bootstrap',
          actorRole: 'SYSTEM',
          action: 'STORE_INITIALIZED',
          entityType: 'BRANCH',
          entityId: INITIAL_BRANCH.id,
          changeSummary: 'Initialized Mandadam provisional branch with Belgian waffles catalog.',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    await this.persist();
    this.isInitialized = true;
  }

  private async persist() {
    if (!this.data) return;

    const serialized = JSON.stringify(this.data);
    if (this.pool) {
      await this.ensurePostgresTable();
      const write = this.pendingWrite
        .catch(() => undefined)
        .then(() => this.pool!.query(
          `INSERT INTO "StoreState" ("id", "data", "updatedAt")
           VALUES (1, $1::jsonb, CURRENT_TIMESTAMP)
           ON CONFLICT ("id") DO UPDATE
           SET "data" = EXCLUDED."data", "updatedAt" = CURRENT_TIMESTAMP`,
          [serialized]
        ));
      this.pendingWrite = write;
      await write;
      return;
    }

    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
      throw e;
    }
  }

  async getStorageStatus() {
    await this.ensureInitialized();
    if (this.pool) {
      await this.pool.query('SELECT 1');
      return {
        type: 'PostgreSQL (StoreState JSONB)',
        connected: true,
        persistenceActive: true,
      };
    }
    return {
      type: 'File-Backed Transactional Store (.data/waffle_db.json)',
      connected: true,
      persistenceActive: true,
    };
  }

  // Branch
  async getBranch(): Promise<BranchEntity> {
    await this.ensureInitialized();
    return { ...this.data!.branch };
  }

  async updateBranch(updates: Partial<BranchEntity>, actor: { id: string; name: string; role: string }): Promise<BranchEntity> {
    await this.ensureInitialized();
    this.data!.branch = {
      ...this.data!.branch,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'BRANCH_SETTINGS_UPDATED',
      entityType: 'BRANCH',
      entityId: this.data!.branch.id,
      changeSummary: `Updated branch settings: ${Object.keys(updates).join(', ')}`,
    });
    await this.persist();
    return { ...this.data!.branch };
  }

  // Categories & Products
  async getCategories(): Promise<CategoryEntity[]> {
    await this.ensureInitialized();
    return [...this.data!.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getProducts(includeUnavailable = false): Promise<ProductEntity[]> {
    await this.ensureInitialized();
    if (includeUnavailable) return [...this.data!.products];
    return this.data!.products.filter((p) => p.isAvailable);
  }

  async getProductById(id: string): Promise<ProductEntity | null> {
    await this.ensureInitialized();
    const prod = this.data!.products.find((p) => p.id === id);
    return prod ? { ...prod } : null;
  }

  async updateProduct(id: string, updates: Partial<ProductEntity>, actor: { id: string; name: string; role: string }): Promise<ProductEntity> {
    await this.ensureInitialized();
    const idx = this.data!.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');

    this.data!.products[idx] = {
      ...this.data!.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: id,
      changeSummary: `Updated product "${this.data!.products[idx].name}": ${Object.keys(updates).join(', ')}`,
    });

    await this.persist();
    return { ...this.data!.products[idx] };
  }

  async createProduct(prod: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt'>, actor: { id: string; name: string; role: string }): Promise<ProductEntity> {
    await this.ensureInitialized();
    const newProduct: ProductEntity = {
      ...prod,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data!.products.push(newProduct);
    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: newProduct.id,
      changeSummary: `Created product "${newProduct.name}" in category ${newProduct.categoryId}`,
    });
    await this.persist();
    return { ...newProduct };
  }

  // Users & Auth
  async getUserByPhone(phone: string): Promise<UserEntity | null> {
    await this.ensureInitialized();
    const postgresUser = await authUsersDatabase.findByPhone(phone);
    if (postgresUser) return postgresUser;
    const u = this.data!.users.find((user) => user.phone === phone);
    return u ? { ...u } : null;
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    await this.ensureInitialized();
    const postgresUser = await authUsersDatabase.findById(id);
    if (postgresUser) return postgresUser;
    const u = this.data!.users.find((user) => user.id === id);
    return u ? { ...u } : null;
  }

  async getAllUsers(): Promise<Omit<UserEntity, 'passwordHash'>[]> {
    await this.ensureInitialized();
    const postgresUsers = await authUsersDatabase.list();
    return [...postgresUsers, ...this.data!.users].map(({ passwordHash: _, ...rest }) => rest);
  }

  async createUser(user: { name: string; phone: string; passwordHash: string; role?: Role; email?: string }): Promise<UserEntity> {
    await this.ensureInitialized();
    const existing = this.data!.users.find((u) => u.phone === user.phone);
    if (existing) {
      throw new Error('A user with this mobile number already exists');
    }
    const newUser: UserEntity = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: user.name,
      phone: user.phone,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role || 'CUSTOMER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (authUsersDatabase.isConfigured) return authUsersDatabase.create(newUser);
    this.data!.users.push(newUser);
    await this.persist();
    return { ...newUser };
  }

  async updateUser(id: string, updates: { name?: string; email?: string }): Promise<UserEntity> {
    await this.ensureInitialized();
    const postgresUser = await authUsersDatabase.update(id, updates);
    if (postgresUser) return postgresUser;
    const idx = this.data!.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    this.data!.users[idx] = {
      ...this.data!.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return { ...this.data!.users[idx] };
  }

  // Addresses
  async getUserAddresses(userId: string): Promise<AddressEntity[]> {
    await this.ensureInitialized();
    return this.data!.addresses.filter((a) => a.userId === userId);
  }

  async addAddress(addr: Omit<AddressEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AddressEntity> {
    await this.ensureInitialized();
    if (addr.isDefault) {
      this.data!.addresses.forEach((a) => {
        if (a.userId === addr.userId) a.isDefault = false;
      });
    }
    const newAddr: AddressEntity = {
      ...addr,
      id: `addr-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data!.addresses.push(newAddr);
    await this.persist();
    return { ...newAddr };
  }

  // Orders
  async getOrderById(id: string): Promise<OrderEntity | null> {
    await this.ensureInitialized();
    const order = this.data!.orders.find((o) => o.id === id || o.orderNumber === id);
    return order ? JSON.parse(JSON.stringify(order)) : null;
  }

  async getOrders(params?: {
    userId?: string;
    status?: OrderStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: OrderEntity[]; total: number }> {
    await this.ensureInitialized();
    let list = [...this.data!.orders];

    if (params?.userId) {
      list = list.filter((o) => o.userId === params.userId);
    }
    if (params?.status) {
      list = list.filter((o) => o.orderStatus === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q)
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = list.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 50;
    const paginated = list.slice(offset, offset + limit);

    return { orders: paginated, total };
  }

  // Order creation with full server-side validation & transaction
  async createOrder(payload: {
    userId?: string;
    customerName: string;
    customerPhone: string;
    fulfilmentMode: FulfilmentMode;
    deliveryAddressSnapshot?: {
      label: string;
      street: string;
      landmark?: string;
      city: string;
      postalCode?: string;
      instructions?: string;
    };
    takeawayPickupTime?: string;
    items: Array<{
      productId: string;
      quantity: number;
      variantName?: string;
      addons?: Array<{ name: string; quantity: number }>;
    }>;
    paymentMethod: PaymentMethod;
    customerNotes?: string;
    idempotencyKey?: string;
  }): Promise<OrderEntity> {
    await this.ensureInitialized();

    // Idempotency check
    if (payload.idempotencyKey) {
      const existing = this.data!.orders.find((o) => o.idempotencyKey === payload.idempotencyKey);
      if (existing) {
        return JSON.parse(JSON.stringify(existing));
      }
    }

    const branch = this.data!.branch;
    if (branch.orderAcceptancePaused) {
      throw new Error('Online ordering is currently paused by the store.');
    }
    if (payload.fulfilmentMode === 'DELIVERY' && !branch.deliveryAvailable) {
      throw new Error('Delivery is currently unavailable at this branch.');
    }
    if (payload.fulfilmentMode === 'TAKEAWAY' && !branch.takeawayAvailable) {
      throw new Error('Takeaway/pickup is currently unavailable at this branch.');
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `WP-${dateStr}-${randomSuffix}`;

    const orderItems: OrderItemSnapshot[] = [];
    let calculatedSubtotal = 0;

    for (const itemInput of payload.items) {
      const product = this.data!.products.find((p) => p.id === itemInput.productId);
      if (!product) {
        throw new Error(`Product ${itemInput.productId} not found.`);
      }
      if (!product.isAvailable) {
        throw new Error(`"${product.name}" is currently sold out and unavailable.`);
      }
      if (itemInput.quantity <= 0 || !Number.isInteger(itemInput.quantity)) {
        throw new Error(`Invalid quantity for ${product.name}.`);
      }

      let unitPrice = Number(product.basePrice);
      let variantSnapshot: { name: string; priceDelta: number } | undefined;

      if (itemInput.variantName) {
        const variant = product.variants.find((v) => v.name === itemInput.variantName);
        if (!variant) {
          throw new Error(`Invalid variant "${itemInput.variantName}" for ${product.name}`);
        }
        unitPrice += Number(variant.priceDelta);
        variantSnapshot = { name: variant.name, priceDelta: Number(variant.priceDelta) };
      }

      const addonsSnapshot: Array<{ name: string; price: number; quantity: number }> = [];
      let addonsCostPerItem = 0;

      if (itemInput.addons && itemInput.addons.length > 0) {
        for (const addonReq of itemInput.addons) {
          const addonDef = product.addons.find((a) => a.name === addonReq.name);
          if (!addonDef) {
            throw new Error(`Invalid addon "${addonReq.name}" for ${product.name}`);
          }
          if (addonReq.quantity > addonDef.maxQuantity) {
            throw new Error(`Maximum ${addonDef.maxQuantity} allowed for addon "${addonReq.name}".`);
          }
          const cost = Number(addonDef.price) * addonReq.quantity;
          addonsCostPerItem += cost;
          addonsSnapshot.push({
            name: addonDef.name,
            price: Number(addonDef.price),
            quantity: addonReq.quantity,
          });
        }
      }

      const itemTotalPrice = (unitPrice + addonsCostPerItem) * itemInput.quantity;
      calculatedSubtotal += itemTotalPrice;

      orderItems.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        productId: product.id,
        productName: product.name,
        unitPrice: unitPrice + addonsCostPerItem,
        quantity: itemInput.quantity,
        variantSnapshot,
        addonsSnapshot: addonsSnapshot.length > 0 ? addonsSnapshot : undefined,
        subtotal: Math.round(itemTotalPrice * 100) / 100,
      });
    }

    if (calculatedSubtotal < branch.minOrderAmount) {
      throw new Error(`Minimum order amount is ₹${branch.minOrderAmount.toFixed(2)}. Current subtotal: ₹${calculatedSubtotal.toFixed(2)}`);
    }

    const deliveryFee = payload.fulfilmentMode === 'DELIVERY' ? Number(branch.deliveryFee) : 0;
    // Standard 5% GST on restaurant food
    const tax = Math.round(calculatedSubtotal * 0.05 * 100) / 100;
    const discount = 0;
    const totalAmount = Math.round((calculatedSubtotal + deliveryFee + tax - discount) * 100) / 100;

    const initialHistory = {
      id: `osh-${Date.now()}`,
      orderId,
      fromStatus: 'ORDER_PLACED' as OrderStatus,
      toStatus: 'ORDER_PLACED' as OrderStatus,
      actorRole: 'CUSTOMER',
      reason: 'Order placed by customer via online portal',
      timestamp: new Date().toISOString(),
    };

    let paymentStatus: PaymentStatus = 'PENDING';
    const paymentRecord: PaymentRecordEntity = {
      id: `pay-${Date.now()}`,
      orderId,
      method: payload.paymentMethod,
      provider: payload.paymentMethod === 'COD' ? 'COD_CASH_ON_DELIVERY' : 'UPI_DEMO_SANDBOX',
      amount: totalAmount,
      status: paymentStatus,
      metadata:
        payload.paymentMethod === 'UPI'
          ? { note: 'UPI demo mode: safe testing abstraction. Real gateway not yet configured.' }
          : { note: 'Cash to be collected upon delivery/takeaway handoff.' },
      createdAt: new Date().toISOString(),
    };

    const newOrder: OrderEntity = {
      id: orderId,
      orderNumber,
      userId: payload.userId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      branchId: branch.id,
      fulfilmentMode: payload.fulfilmentMode,
      deliveryAddressSnapshot: payload.deliveryAddressSnapshot,
      takeawayPickupTime: payload.takeawayPickupTime,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      deliveryFee,
      tax,
      discount,
      totalAmount,
      paymentMethod: payload.paymentMethod,
      paymentStatus,
      orderStatus: 'ORDER_PLACED',
      customerNotes: payload.customerNotes,
      idempotencyKey: payload.idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: orderItems,
      statusHistory: [initialHistory],
      paymentRecords: [paymentRecord],
    };

    this.data!.orders.push(newOrder);
    await this.persist();

    return JSON.parse(JSON.stringify(newOrder));
  }

  // Strict state machine transitions
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    actor: { id?: string; name: string; role: string },
    reason?: string
  ): Promise<OrderEntity> {
    await this.ensureInitialized();
    const order = this.data!.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) throw new Error('Order not found');

    const currentStatus = order.orderStatus;
    if (currentStatus === newStatus) return JSON.parse(JSON.stringify(order));

    // Terminal states cannot transition further
    if (['DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'].includes(currentStatus)) {
      throw new Error(`Cannot change status: Order is in terminal state "${currentStatus}".`);
    }

    // Fulfilment mode checks
    if (order.fulfilmentMode === 'DELIVERY' && ['READY_FOR_PICKUP', 'PICKED_UP'].includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}" for delivery order.`);
    }
    if (order.fulfilmentMode === 'TAKEAWAY' && ['READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}" for takeaway order.`);
    }

    // Transition rules:
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      ORDER_PLACED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      ACCEPTED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY_FOR_DISPATCH', 'READY_FOR_PICKUP', 'CANCELLED'],
      READY_FOR_DISPATCH: ['OUT_FOR_DELIVERY', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
      READY_FOR_PICKUP: ['PICKED_UP', 'CANCELLED'],
      DELIVERED: [],
      PICKED_UP: [],
      REJECTED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid state transition from "${currentStatus}" to "${newStatus}".`);
    }

    order.orderStatus = newStatus;
    order.updatedAt = new Date().toISOString();

    if (newStatus === 'CANCELLED' && reason) {
      order.cancellationReason = reason;
    }
    if (newStatus === 'REJECTED' && reason) {
      order.rejectionReason = reason;
    }

    const historyEntry = {
      id: `osh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      fromStatus: currentStatus,
      toStatus: newStatus,
      actorId: actor.id,
      actorRole: actor.role,
      reason: reason || `Status changed to ${newStatus}`,
      timestamp: new Date().toISOString(),
    };
    order.statusHistory.push(historyEntry);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: order.id,
      changeSummary: `Order ${order.orderNumber} status changed from ${currentStatus} to ${newStatus}${reason ? ` (${reason})` : ''}`,
    });

    await this.persist();
    return JSON.parse(JSON.stringify(order));
  }

  // Cancel order (Customer or Admin)
  async cancelOrder(orderId: string, actor: { id?: string; name: string; role: string }, reason: string): Promise<OrderEntity> {
    await this.ensureInitialized();
    const order = this.data!.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) throw new Error('Order not found');

    // Customer can only cancel while in ORDER_PLACED
    if (actor.role === 'CUSTOMER' && order.orderStatus !== 'ORDER_PLACED') {
      throw new Error('Order has already been accepted or is being prepared. Please contact customer care for cancellation requests.');
    }

    return this.updateOrderStatus(order.id, 'CANCELLED', actor, reason);
  }

  // Record COD collection
  async recordPaymentCollection(orderId: string, actor: { id?: string; name: string; role: string }, notes?: string): Promise<OrderEntity> {
    await this.ensureInitialized();
    const order = this.data!.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) throw new Error('Order not found');

    order.paymentStatus = 'COMPLETED';
    order.updatedAt = new Date().toISOString();

    const record: PaymentRecordEntity = {
      id: `pay-${Date.now()}`,
      orderId: order.id,
      method: order.paymentMethod,
      provider: 'COD_CASH_COLLECTED',
      amount: order.totalAmount,
      status: 'COMPLETED',
      collectedBy: actor.name,
      collectedAt: new Date().toISOString(),
      metadata: { notes: notes || 'Cash collected on handoff' },
      createdAt: new Date().toISOString(),
    };
    order.paymentRecords.push(record);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'PAYMENT_COLLECTED',
      entityType: 'ORDER',
      entityId: order.id,
      changeSummary: `Recorded COD collection of ₹${order.totalAmount} for order ${order.orderNumber}`,
    });

    await this.persist();
    return JSON.parse(JSON.stringify(order));
  }

  // Support Tickets
  async getTickets(params?: { userId?: string; status?: string }): Promise<SupportTicketEntity[]> {
    await this.ensureInitialized();
    let list = [...this.data!.tickets];
    if (params?.userId) list = list.filter((t) => t.userId === params.userId);
    if (params?.status) list = list.filter((t) => t.status === params.status);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  async getTicketById(id: string): Promise<SupportTicketEntity | null> {
    await this.ensureInitialized();
    const t = this.data!.tickets.find((tick) => tick.id === id || tick.ticketNumber === id);
    return t ? JSON.parse(JSON.stringify(t)) : null;
  }

  async createTicket(payload: {
    userId?: string;
    orderId?: string;
    customerName: string;
    customerPhone: string;
    category: string;
    message: string;
  }): Promise<SupportTicketEntity> {
    await this.ensureInitialized();
    const ticketId = `tick-${Date.now()}`;
    const ticketNumber = `TCK-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTicket: SupportTicketEntity = {
      id: ticketId,
      ticketNumber,
      userId: payload.userId,
      orderId: payload.orderId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      category: payload.category,
      priority: 'MEDIUM',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: payload.userId,
          senderRole: 'CUSTOMER',
          senderName: payload.customerName,
          message: payload.message,
          isInternal: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    this.data!.tickets.push(newTicket);
    await this.persist();
    return newTicket;
  }

  async addTicketReply(ticketId: string, reply: {
    senderId?: string;
    senderRole: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
    senderName: string;
    message: string;
    isInternal?: boolean;
    newStatus?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  }): Promise<SupportTicketEntity> {
    await this.ensureInitialized();
    const ticket = this.data!.tickets.find((t) => t.id === ticketId || t.ticketNumber === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.messages.push({
      id: `msg-${Date.now()}`,
      senderId: reply.senderId,
      senderRole: reply.senderRole,
      senderName: reply.senderName,
      message: reply.message,
      isInternal: reply.isInternal || false,
      createdAt: new Date().toISOString(),
    });

    if (reply.newStatus) {
      ticket.status = reply.newStatus;
    }
    ticket.updatedAt = new Date().toISOString();
    await this.persist();
    return JSON.parse(JSON.stringify(ticket));
  }

  // Feedback
  async submitFeedback(payload: {
    orderId: string;
    userId?: string;
    customerName: string;
    rating: number;
    comment: string;
  }): Promise<FeedbackEntity> {
    await this.ensureInitialized();
    const existing = this.data!.feedback.find((f) => f.orderId === payload.orderId);
    if (existing) {
      throw new Error('Feedback has already been submitted for this order.');
    }

    const newFeedback: FeedbackEntity = {
      id: `fb-${Date.now()}`,
      orderId: payload.orderId,
      userId: payload.userId,
      customerName: payload.customerName,
      rating: Math.max(1, Math.min(5, payload.rating)),
      comment: payload.comment,
      isModerated: false,
      isApproved: true,
      createdAt: new Date().toISOString(),
    };

    this.data!.feedback.push(newFeedback);
    await this.persist();
    return newFeedback;
  }

  async getFeedback(approvedOnly = true): Promise<FeedbackEntity[]> {
    await this.ensureInitialized();
    let list = [...this.data!.feedback];
    if (approvedOnly) list = list.filter((f) => f.isApproved);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  // Metrics calculation
  async getMetrics(startDate?: string, endDate?: string) {
    await this.ensureInitialized();
    let orders = [...this.data!.orders];

    if (startDate) {
      orders = orders.filter((o) => new Date(o.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      orders = orders.filter((o) => new Date(o.createdAt) <= new Date(endDate));
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const todayOrders = orders.filter((o) => {
      const createdAt = new Date(o.createdAt);
      return createdAt >= startOfToday && createdAt < startOfTomorrow;
    });

    const pendingOrders = orders.filter((o) =>
      ['ORDER_PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)
    );
    const completedOrders = orders.filter((o) => ['DELIVERED', 'PICKED_UP'].includes(o.orderStatus));
    const cancelledOrders = orders.filter((o) => ['CANCELLED', 'REJECTED'].includes(o.orderStatus));

    // Sales are realized only after payment collection; cancelled and rejected orders never count.
    const validOrdersForSales = orders.filter((o) =>
      !['CANCELLED', 'REJECTED'].includes(o.orderStatus) && o.paymentStatus === 'COMPLETED'
    );
    const grossSales = validOrdersForSales.reduce((sum, o) => sum + o.totalAmount, 0);
    const deliveryCharges = validOrdersForSales.reduce((sum, o) => sum + o.deliveryFee, 0);
    const taxesCollected = validOrdersForSales.reduce((sum, o) => sum + o.tax, 0);
    const netFoodSales = validOrdersForSales.reduce((sum, o) => sum + o.subtotal, 0);
    const avgOrderValue = validOrdersForSales.length > 0 ? grossSales / validOrdersForSales.length : 0;

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const o of orders) {
      statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
    }

    // Popular items
    const productSoldMap: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const o of validOrdersForSales) {
      for (const item of o.items) {
        if (!productSoldMap[item.productId]) {
          productSoldMap[item.productId] = { name: item.productName, count: 0, revenue: 0 };
        }
        productSoldMap[item.productId].count += item.quantity;
        productSoldMap[item.productId].revenue += item.subtotal;
      }
    }
    const popularProducts = Object.values(productSoldMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      todayOrderCount: todayOrders.length,
      pendingOrderCount: pendingOrders.length,
      completedOrderCount: completedOrders.length,
      cancelledOrderCount: cancelledOrders.length,
      totalOrders: orders.length,
      grossSales: Math.round(grossSales * 100) / 100,
      netFoodSales: Math.round(netFoodSales * 100) / 100,
      deliveryCharges: Math.round(deliveryCharges * 100) / 100,
      taxesCollected: Math.round(taxesCollected * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      statusCounts,
      popularProducts,
    };
  }

  // Audit Logging
  async logAudit(log: Omit<AuditLogEntity, 'id' | 'createdAt'>) {
    if (!this.data) return;
    const entry: AuditLogEntity = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs.pop();
    }
  }

  async getAuditLogs(limit = 50): Promise<AuditLogEntity[]> {
    await this.ensureInitialized();
    return this.data!.auditLogs.slice(0, limit);
  }
}

export const dbStore = new DataStore();
