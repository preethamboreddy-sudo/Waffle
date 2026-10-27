// Domain types and enums for Waffle Pops and Company

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

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface UserEntity {
  id: string;
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface BranchEntity {
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
  createdAt: string;
  updatedAt: string;
}

export interface AddressEntity {
  id: string;
  userId: string;
  label: string;
  street: string;
  landmark?: string;
  city: string;
  postalCode?: string;
  instructions?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantEntity {
  id: string;
  productId: string;
  name: string;
  priceDelta: number;
}

export interface ProductAddonEntity {
  id: string;
  productId: string;
  name: string;
  price: number;
  maxQuantity: number;
}

export interface ProductEntity {
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
  variants: ProductVariantEntity[];
  addons: ProductAddonEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemSnapshot {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  variantSnapshot?: { name: string; priceDelta: number };
  addonsSnapshot?: Array<{ name: string; price: number; quantity: number }>;
  subtotal: number;
}

export interface OrderStatusHistoryEntity {
  id: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  actorId?: string;
  actorRole?: string;
  reason?: string;
  timestamp: string;
}

export interface PaymentRecordEntity {
  id: string;
  orderId: string;
  method: PaymentMethod;
  provider: string;
  transactionId?: string;
  amount: number;
  status: PaymentStatus;
  collectedBy?: string;
  collectedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface OrderEntity {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  fulfilmentMode: FulfilmentMode;
  deliveryAddressId?: string;
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
  internalNotes?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemSnapshot[];
  statusHistory: OrderStatusHistoryEntity[];
  paymentRecords: PaymentRecordEntity[];
}

export interface SupportTicketEntity {
  id: string;
  ticketNumber: string;
  userId?: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
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

export interface FeedbackEntity {
  id: string;
  orderId: string;
  userId?: string;
  customerName: string;
  rating: number;
  comment: string;
  isModerated: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface AuditLogEntity {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  changeSummary: string;
  ipAddress?: string;
  createdAt: string;
}
