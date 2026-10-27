// Shared Client Interfaces

export type Role = 'CUSTOMER' | 'ADMIN' | 'OPERATOR';
export type FulfilmentMode = 'DELIVERY' | 'TAKEAWAY';
export type PaymentMethod = 'COD' | 'UPI';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export type OrderStatus =
  | 'ORDER_PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_DISPATCH'
  | 'OUT_FOR_DELIVERY'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'PICKED_UP'
  | 'REJECTED'
  | 'CANCELLED';

export interface ProductVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  maxQuantity: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isDemoPrice: boolean;
  variants: ProductVariant[];
  addons: ProductAddon[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode?: string;
  phone?: string;
  isOpen: boolean;
  orderAcceptancePaused: boolean;
  deliveryAvailable: boolean;
  takeawayAvailable: boolean;
  minOrderAmount: number;
  deliveryFee: number;
  estimatedPrepTimeMins: number;
  isProvisional: boolean;
  notes?: string;
}

export interface CartItemAddon {
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string; // unique cart entry key
  productId: string;
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedAddons: CartItemAddon[];
  unitPrice: number;
  itemTotal: number;
}

export interface OrderItemSnapshot {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  variantSnapshot?: { name: string; priceDelta: number };
  addonsSnapshot?: Array<{ name: string; price: number; quantity: number }>;
  subtotal: number;
}

export interface OrderStatusHistory {
  id: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  actorRole?: string;
  reason?: string;
  timestamp: string;
}

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  provider: string;
  amount: number;
  status: PaymentStatus;
  collectedBy?: string;
  collectedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
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
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  cancellationReason?: string;
  rejectionReason?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemSnapshot[];
  statusHistory: OrderStatusHistory[];
  paymentRecords: PaymentRecord[];
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  landmark?: string;
  city: string;
  postalCode?: string;
  instructions?: string;
  isDefault: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId?: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  category: string;
  priority: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    senderId?: string;
    senderRole: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
    senderName: string;
    message: string;
    isInternal: boolean;
    createdAt: string;
  }>;
}

export interface Feedback {
  id: string;
  orderId: string;
  userId?: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  changeSummary: string;
  createdAt: string;
}

export interface AdminMetrics {
  todayOrderCount: number;
  pendingOrderCount: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
  totalOrders: number;
  grossSales: number;
  netFoodSales: number;
  deliveryCharges: number;
  taxesCollected: number;
  avgOrderValue: number;
  statusCounts: Record<string, number>;
  popularProducts: Array<{ name: string; count: number; revenue: number }>;
}

export interface AdminPost {
  id: number;
  userId: number;
  content: string;
  createdAt: string | null;
}
