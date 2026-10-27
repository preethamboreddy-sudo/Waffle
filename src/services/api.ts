// Typed API Client for Waffle Pops and Company

import {
  Address,
  AuditLog,
  AdminPost,
  Branch,
  Category,
  Feedback,
  Order,
  OrderStatus,
  Product,
  SupportTicket,
  User,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

type ApiClientKind = 'customer' | 'admin';
type ApiRequest = <T>(endpoint: string, options?: RequestInit) => Promise<T>;

function createRequest(clientKind: ApiClientKind): ApiRequest {
  return async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const headers = new Headers(options.headers || {});
    headers.set('X-Client-App', clientKind);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error || `Request failed with status ${res.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  };
}

function createApi(request: ApiRequest) {
  return {
  // Health
  getHealth: () => request<{ status: string; branch: any; database: any; postsDatabase?: any; accountsDatabase?: any; paymentMethods: any }>('/health'),

  // Storefront & Menu
  getBranch: () => request<{ branch: Branch }>('/branch'),
  getCategories: () => request<{ categories: Category[] }>('/categories'),
  getProducts: (all = false) => request<{ products: Product[] }>(`/products${all ? '?all=true' : ''}`),
  getProduct: (id: string) => request<{ product: Product }>(`/products/${id}`),

  // Cart Authoritative Validation
  validateCart: (payload: {
    fulfilmentMode: 'DELIVERY' | 'TAKEAWAY';
    items: Array<{
      productId: string;
      quantity: number;
      variantName?: string;
      addons?: Array<{ name: string; quantity: number }>;
    }>;
  }) => request<{
    items: any[];
    totals: { subtotal: number; deliveryFee: number; tax: number; discount: number; totalAmount: number };
    branch: any;
    isEligible: boolean;
  }>('/cart/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Auth
  register: (payload: { name: string; phone: string; password: string; email?: string }) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { phone: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<{ user: User | null }>('/auth/me'),
  updateProfile: (payload: { name?: string; email?: string }) =>
    request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Addresses
  getAddresses: () => request<{ addresses: Address[] }>('/addresses'),
  addAddress: (payload: Omit<Address, 'id' | 'userId'>) =>
    request<{ address: Address }>('/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Orders
  createOrder: (payload: {
    customerName: string;
    customerPhone: string;
    fulfilmentMode: 'DELIVERY' | 'TAKEAWAY';
    deliveryAddressSnapshot?: any;
    takeawayPickupTime?: string;
    items: Array<{
      productId: string;
      quantity: number;
      variantName?: string;
      addons?: Array<{ name: string; quantity: number }>;
    }>;
    paymentMethod: 'COD' | 'UPI';
    customerNotes?: string;
    idempotencyKey?: string;
  }) => request<{ order: Order }>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getOrder: (id: string) => request<{ order: Order }>(`/orders/${id}`),
  getUserOrders: () => request<{ orders: Order[] }>('/orders/user/history'),
  cancelOrder: (id: string, reason?: string) =>
    request<{ order: Order }>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Support
  getTickets: () => request<{ tickets: SupportTicket[] }>('/tickets'),
  createTicket: (payload: { customerName?: string; customerPhone?: string; category: string; orderId?: string; message: string }) =>
    request<{ ticket: SupportTicket }>('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  replyTicket: (ticketId: string, message: string) =>
    request<{ ticket: SupportTicket }>(`/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Feedback
  getFeedback: () => request<{ feedback: Feedback[] }>('/feedback'),
  submitFeedback: (payload: { orderId: string; rating: number; comment: string }) =>
    request<{ feedback: Feedback }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin
  getAdminMetrics: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    return request<{ metrics: any }>(`/admin/metrics?${q.toString()}`);
  },
  getAdminPosts: () => request<{ posts: AdminPost[]; total: number }>('/admin/posts'),
  getAdminOrders: (params?: { status?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.limit) q.append('limit', String(params.limit));
    return request<{ orders: Order[]; total: number }>(`/admin/orders?${q.toString()}`);
  },
  updateOrderStatus: (id: string, newStatus: OrderStatus, reason?: string) =>
    request<{ order: Order }>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ newStatus, reason }),
    }),
  recordPaymentCollection: (id: string, notes?: string) =>
    request<{ order: Order }>(`/admin/orders/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  createProduct: (payload: any) =>
    request<{ product: Product }>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProduct: (id: string, payload: any) =>
    request<{ product: Product }>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateBranchSettings: (payload: any) =>
    request<{ branch: Branch }>('/admin/branch', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getAdminTickets: () => request<{ tickets: SupportTicket[] }>('/admin/tickets'),
  adminReplyTicket: (id: string, payload: { message: string; newStatus?: string; isInternal?: boolean }) =>
    request<{ ticket: SupportTicket }>(`/admin/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminFeedback: () => request<{ feedback: any[] }>('/admin/feedback'),
  getAdminAuditLogs: () => request<{ auditLogs: AuditLog[] }>('/admin/audit-logs'),
  getAdminCustomers: () => request<{ users: any[] }>('/admin/customers'),
  };
}

export const api = createApi(createRequest('customer'));
export const adminApi = createApi(createRequest('admin'));
