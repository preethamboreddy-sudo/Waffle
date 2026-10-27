// Pure domain rules and calculation engine for Waffle Pops and Company

export type FulfilmentMode = 'DELIVERY' | 'TAKEAWAY';

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

export interface CalculationInputItem {
  basePrice: number;
  quantity: number;
  variantPriceDelta?: number;
  addons?: Array<{ price: number; quantity: number }>;
}

export interface CalculationResult {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
}

/**
 * Calculates authoritative order pricing.
 * Monetary calculations avoid floating point drift by rounding cents.
 */
export function calculateOrderTotals(
  items: CalculationInputItem[],
  fulfilmentMode: FulfilmentMode,
  branchDeliveryFee: number,
  discount: number = 0
): CalculationResult {
  let subtotal = 0;

  for (const item of items) {
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      throw new Error(`Quantity must be a positive integer, received: ${item.quantity}`);
    }
    const unitPrice = item.basePrice + (item.variantPriceDelta || 0);
    const addonsCost = (item.addons || []).reduce((acc, a) => acc + a.price * a.quantity, 0);
    const itemTotal = (unitPrice + addonsCost) * item.quantity;
    subtotal += itemTotal;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const deliveryFee = fulfilmentMode === 'DELIVERY' ? Math.round(branchDeliveryFee * 100) / 100 : 0;
  // Restaurant GST 5%
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const safeDiscount = Math.max(0, Math.min(subtotal, Math.round(discount * 100) / 100));
  const totalAmount = Math.round((subtotal + deliveryFee + tax - safeDiscount) * 100) / 100;

  return {
    subtotal,
    deliveryFee,
    tax,
    discount: safeDiscount,
    totalAmount,
  };
}

/**
 * Validates state transition according to fulfillment mode and allowed paths.
 */
export function isValidStatusTransition(
  current: OrderStatus,
  target: OrderStatus,
  mode: FulfilmentMode
): { allowed: boolean; reason?: string } {
  if (current === target) {
    return { allowed: true };
  }

  const terminalStates: OrderStatus[] = ['DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'];
  if (terminalStates.includes(current)) {
    return { allowed: false, reason: `Cannot transition from terminal status ${current}` };
  }

  // Delivery vs Takeaway exclusivity
  if (mode === 'DELIVERY') {
    if (target === 'READY_FOR_PICKUP' || target === 'PICKED_UP') {
      return { allowed: false, reason: `Pickup statuses are invalid for delivery orders` };
    }
  } else if (mode === 'TAKEAWAY') {
    if (target === 'READY_FOR_DISPATCH' || target === 'OUT_FOR_DELIVERY' || target === 'DELIVERED') {
      return { allowed: false, reason: `Dispatch and delivery statuses are invalid for takeaway orders` };
    }
  }

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

  const allowedList = validTransitions[current] || [];
  if (!allowedList.includes(target)) {
    return { allowed: false, reason: `Transition from ${current} to ${target} is not permitted` };
  }

  return { allowed: true };
}

/**
 * Checks customer cancellation eligibility.
 * Customers can only cancel directly while in ORDER_PLACED status.
 */
export function isCustomerCancellationEligible(status: OrderStatus): boolean {
  return status === 'ORDER_PLACED';
}
