import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderTotals,
  isValidStatusTransition,
  isCustomerCancellationEligible,
} from './rules';

test('calculateOrderTotals computes correct pricing and 5% tax for delivery', () => {
  const items = [
    {
      basePrice: 119.00,
      quantity: 2,
      variantPriceDelta: 0,
      addons: [{ price: 25.00, quantity: 1 }],
    },
    {
      basePrice: 179.00,
      quantity: 1,
      variantPriceDelta: 80.00,
      addons: [{ price: 35.00, quantity: 1 }],
    },
  ];
  const result = calculateOrderTotals(items, 'DELIVERY', 30.00);
  assert.equal(result.subtotal, 582.00);
  assert.equal(result.deliveryFee, 30.00);
  assert.equal(result.tax, 29.10);
  assert.equal(result.totalAmount, 641.10);
});

test('calculateOrderTotals waives delivery fee for takeaway', () => {
  const items = [{ basePrice: 100.00, quantity: 1 }];
  const result = calculateOrderTotals(items, 'TAKEAWAY', 30.00);
  assert.equal(result.subtotal, 100.00);
  assert.equal(result.deliveryFee, 0.00);
  assert.equal(result.tax, 5.00);
  assert.equal(result.totalAmount, 105.00);
});

test('isValidStatusTransition permits legitimate delivery workflow', () => {
  assert.equal(isValidStatusTransition('ORDER_PLACED', 'ACCEPTED', 'DELIVERY').allowed, true);
  assert.equal(isValidStatusTransition('ACCEPTED', 'PREPARING', 'DELIVERY').allowed, true);
  assert.equal(isValidStatusTransition('PREPARING', 'READY_FOR_DISPATCH', 'DELIVERY').allowed, true);
  assert.equal(isValidStatusTransition('READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERY').allowed, true);
  assert.equal(isValidStatusTransition('OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY').allowed, true);
});

test('isValidStatusTransition rejects takeaway statuses for delivery orders', () => {
  const check = isValidStatusTransition('PREPARING', 'READY_FOR_PICKUP', 'DELIVERY');
  assert.equal(check.allowed, false);
});

test('isValidStatusTransition prevents changing terminal states', () => {
  assert.equal(isValidStatusTransition('DELIVERED', 'PREPARING', 'DELIVERY').allowed, false);
  assert.equal(isValidStatusTransition('CANCELLED', 'ACCEPTED', 'DELIVERY').allowed, false);
});

test('isCustomerCancellationEligible is true only in ORDER_PLACED', () => {
  assert.equal(isCustomerCancellationEligible('ORDER_PLACED'), true);
  assert.equal(isCustomerCancellationEligible('ACCEPTED'), false);
  assert.equal(isCustomerCancellationEligible('PREPARING'), false);
  assert.equal(isCustomerCancellationEligible('DELIVERED'), false);
});
