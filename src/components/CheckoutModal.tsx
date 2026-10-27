import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, MapPin, Truck, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';
import { useCart } from '../context/useCart';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { Order, PaymentMethod } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (order: Order) => void;
}

export function CheckoutModal({ isOpen, onClose, onOrderPlaced }: CheckoutModalProps) {
  const { items, subtotal, deliveryFee, tax, total, fulfilmentMode, clearCart, branch } = useCart();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Please provide your name.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit mobile number for order notifications.');
      return;
    }

    if (fulfilmentMode === 'DELIVERY' && !street.trim()) {
      setError('Delivery address (street/flat/house) is required for delivery.');
      return;
    }

    setLoading(true);

    try {
      // Generate client idempotency key to prevent double charging or duplicate orders
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const payload = {
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        fulfilmentMode,
        deliveryAddressSnapshot:
          fulfilmentMode === 'DELIVERY'
            ? {
                label: 'Delivery Address',
                street: street.trim(),
                landmark: landmark.trim() || undefined,
                city: 'Mandadam',
                postalCode: '522503',
                instructions: instructions.trim() || undefined,
              }
            : undefined,
        takeawayPickupTime:
          fulfilmentMode === 'TAKEAWAY' ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variantName: i.selectedVariant?.name,
          addons: i.selectedAddons.map((a) => ({ name: a.name, quantity: a.quantity })),
        })),
        paymentMethod,
        customerNotes: customerNotes.trim() || undefined,
        idempotencyKey,
      };

      const res = await api.createOrder(payload);
      clearCart();
      onOrderPlaced(res.order);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-[#FFF8EF] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#39251F]/15 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-[#39251F] text-[#FFF8EF] flex items-center justify-between border-b border-[#F5C76A]/20">
          <div>
            <h2 className="text-xl font-black text-[#FFF8EF]">Complete Your Order</h2>
            <p className="text-xs text-[#FFF8EF]/80">
              Mandadam Branch • {fulfilmentMode === 'DELIVERY' ? 'Doorstep Delivery' : 'Storefront Takeaway'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFF8EF] transition-colors cursor-pointer"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Customer Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#39251F] uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Contact Details</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Priya Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-[#39251F]/20 bg-white text-sm focus:border-[#B85A45] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Mobile Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 rounded-xl border border-[#39251F]/20 bg-white text-sm focus:border-[#B85A45] focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          {/* Delivery or Takeaway Location */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#39251F] uppercase tracking-wider flex items-center gap-1.5">
              <span>2. {fulfilmentMode === 'DELIVERY' ? 'Delivery Address' : 'Pickup Location'}</span>
            </h3>

            {fulfilmentMode === 'DELIVERY' ? (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-[#39251F]/15">
                <div>
                  <label className="block text-xs font-bold text-[#39251F]/80 mb-1">
                    House / Flat / Street / Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. Flat 302, Royal Palms, Main Road"
                    className="w-full px-3 py-2 rounded-xl border border-[#39251F]/20 text-sm focus:border-[#B85A45] focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Krupa Bakery / Temple"
                      className="w-full px-3 py-2 rounded-xl border border-[#39251F]/20 text-sm focus:border-[#B85A45] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Town / Area</label>
                    <input
                      type="text"
                      disabled
                      value="Mandadam, Andhra Pradesh (522503)"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 text-xs font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#39251F]/80 mb-1">
                    Special Delivery Instructions
                  </label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Leave with security or call on arrival"
                    className="w-full px-3 py-2 rounded-xl border border-[#39251F]/20 text-sm focus:border-[#B85A45] focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-[#F5EDE1] p-4 rounded-xl border border-[#39251F]/20 space-y-2">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-[#B85A45] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-[#39251F]">
                      Waffle Pops and Company — Mandadam Counter
                    </div>
                    <div className="text-xs text-[#39251F]/80">
                      Main Road, opposite Krupa Bangalore Bakery Shop, Mandadam, Andhra Pradesh
                    </div>
                    <div className="text-[11px] text-[#B85A45] font-semibold mt-1">
                      Ready for pickup in ~20 minutes after order placement
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#39251F] uppercase tracking-wider">
              3. Payment Selection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cash on Delivery */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === 'COD'
                    ? 'border-[#B85A45] bg-[#F5EDE1] shadow-xs'
                    : 'border-[#39251F]/15 bg-white hover:border-[#39251F]/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="text-[#B85A45] focus:ring-[#B85A45]"
                  />
                  <span className="font-bold text-sm text-[#39251F]">Cash on Delivery (COD)</span>
                </div>
                <p className="text-xs text-[#39251F]/70">
                  Pay exact cash of <strong className="font-mono text-[#39251F]">₹{total.toFixed(2)}</strong> upon {fulfilmentMode === 'DELIVERY' ? 'delivery at your door' : 'counter pickup'}.
                </p>
                <span className="mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-sm self-start">
                  Recommended &amp; Active
                </span>
              </label>

              {/* UPI Demo */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === 'UPI'
                    ? 'border-[#B85A45] bg-[#F5EDE1] shadow-xs'
                    : 'border-[#39251F]/15 bg-white hover:border-[#39251F]/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="UPI"
                    checked={paymentMethod === 'UPI'}
                    onChange={() => setPaymentMethod('UPI')}
                    className="text-[#B85A45] focus:ring-[#B85A45]"
                  />
                  <span className="font-bold text-sm text-[#39251F]">UPI (Demo Sandbox)</span>
                </div>
                <p className="text-xs text-[#39251F]/70">
                  Payment provider boundary configured in demo mode. Merchant credentials pending owner onboarding.
                </p>
                <span className="mt-2 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-sm self-start">
                  Demo Mode (Testing)
                </span>
              </label>
            </div>
          </div>

          {/* Itemized Invoice Preview */}
          <div className="bg-white p-4 rounded-xl border border-[#39251F]/15 space-y-2">
            <h4 className="text-xs font-black text-[#39251F] uppercase tracking-wider mb-2">
              Itemized Order Summary
            </h4>
            <div className="divide-y divide-gray-100 text-xs">
              {items.map((i) => (
                <div key={i.id} className="py-1.5 flex justify-between">
                  <div className="pr-2">
                    <span className="font-bold text-[#39251F]">{i.product.name}</span>{' '}
                    <span className="font-mono text-gray-500">x{i.quantity}</span>
                    {i.selectedVariant && (
                      <span className="block text-[10px] text-gray-500">Portion: {i.selectedVariant.name}</span>
                    )}
                    {i.selectedAddons.length > 0 && (
                      <span className="block text-[10px] text-gray-500">
                        Extras: {i.selectedAddons.map((a) => a.name).join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-[#39251F]">₹{i.itemTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-200 space-y-1 text-xs">
              <div className="flex justify-between text-[#39251F]/70">
                <span>Subtotal</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#39251F]/70">
                <span>Delivery Charge</span>
                <span className="font-mono">{deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : 'FREE'}</span>
              </div>
              <div className="flex justify-between text-[#39251F]/70">
                <span>Restaurant GST (5%)</span>
                <span className="font-mono">₹{tax.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[#39251F]/10 flex justify-between text-sm font-black text-[#39251F]">
                <span>Total Amount Payable</span>
                <span className="font-mono text-base text-[#B85A45]">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Submit Order Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 px-5 rounded-xl font-black text-sm flex items-center justify-between shadow-lg transition-all cursor-pointer ${
              loading
                ? 'bg-gray-400 text-white cursor-wait'
                : 'bg-[#39251F] hover:bg-[#B85A45] text-[#FFF8EF] active:scale-98'
            }`}
          >
            <span>{loading ? 'Submitting Order...' : 'Confirm & Place Order'}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[#F5C76A] text-base">₹{total.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
