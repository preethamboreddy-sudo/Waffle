import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  ShoppingBag,
  AlertCircle,
  RotateCw,
  XCircle,
  HelpCircle,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { api } from '../services/api';

interface OrderTrackingProps {
  initialOrder: Order;
  onBackToMenu: () => void;
  onOpenSupport: (orderId: string) => void;
}

export function OrderTracking({ initialOrder, onBackToMenu, onOpenSupport }: OrderTrackingProps) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestOrder = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await api.getOrder(order.id);
      setOrder(res.order);
    } catch (err: any) {
      setError(err.message || 'Could not refresh order status');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Auto-poll status every 10 seconds for real-time tracking
    const timer = setInterval(() => {
      fetchLatestOrder();
    }, 10000);
    return () => clearInterval(timer);
  }, [order.id]);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await api.cancelOrder(order.id, cancelReason || 'Cancelled by customer');
      setOrder(res.order);
      setShowCancelDialog(false);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const isDelivery = order.fulfilmentMode === 'DELIVERY';

  // Define steps according to fulfilment mode
  const deliverySteps: Array<{ key: OrderStatus; label: string; desc: string }> = [
    { key: 'ORDER_PLACED', label: 'Order Placed', desc: 'Received at Mandadam kitchen' },
    { key: 'ACCEPTED', label: 'Accepted', desc: 'Order confirmed by kitchen staff' },
    { key: 'PREPARING', label: 'Cooking & Baking', desc: 'Fresh Belgian waffle baking in hot iron' },
    { key: 'READY_FOR_DISPATCH', label: 'Ready for Dispatch', desc: 'Packed and glazed with chocolate' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Dispatched to your address' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Enjoy your warm waffle desserts!' },
  ];

  const takeawaySteps: Array<{ key: OrderStatus; label: string; desc: string }> = [
    { key: 'ORDER_PLACED', label: 'Order Placed', desc: 'Received at Mandadam kitchen' },
    { key: 'ACCEPTED', label: 'Accepted', desc: 'Order confirmed by kitchen staff' },
    { key: 'PREPARING', label: 'Cooking & Baking', desc: 'Fresh Belgian waffle baking in hot iron' },
    { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', desc: 'Waiting at Mandadam store counter' },
    { key: 'PICKED_UP', label: 'Picked Up', desc: 'Handed over at counter' },
  ];

  const activeSteps = isDelivery ? deliverySteps : takeawaySteps;

  const currentStepIndex = activeSteps.findIndex((s) => s.key === order.orderStatus);
  const isTerminal = ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'REJECTED'].includes(order.orderStatus);
  const isCancelled = order.orderStatus === 'CANCELLED';
  const isRejected = order.orderStatus === 'REJECTED';
  const canCancel = order.orderStatus === 'ORDER_PLACED';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-[#FFF8EF] rounded-2xl border border-[#39251F]/15 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[#39251F] text-[#FFF8EF]">
              {order.orderNumber}
            </span>
            <span
              className={`text-xs font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                isCancelled || isRejected
                  ? 'bg-red-100 text-red-800'
                  : order.orderStatus === 'DELIVERED' || order.orderStatus === 'PICKED_UP'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.orderStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#39251F]">
            {isCancelled
              ? 'Order Has Been Cancelled'
              : isRejected
              ? 'Order Could Not Be Accepted'
              : order.orderStatus === 'DELIVERED' || order.orderStatus === 'PICKED_UP'
              ? 'Order Fulfilled & Completed'
              : 'Your Dessert Is In Progress'}
          </h2>
          <p className="text-xs text-[#39251F]/70">
            Placed on {new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} • Mandadam Branch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLatestOrder}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#39251F]/20 text-xs font-bold text-[#39251F] hover:bg-gray-50 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#39251F]/20 text-xs font-bold text-[#39251F] hover:bg-gray-50 cursor-pointer hidden sm:flex"
            title="Print Tax Invoice"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Timeline (if not cancelled or rejected) */}
      {!isCancelled && !isRejected ? (
        <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
          <h3 className="text-xs font-black text-[#39251F] uppercase tracking-wider mb-6 flex items-center justify-between">
            <span>Kitchen &amp; Fulfilment Progress</span>
            <span className="text-[11px] font-semibold text-[#B85A45] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Live Kitchen Updates
            </span>
          </h3>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#39251F]/10">
            {activeSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.key} className="relative flex items-start gap-4">
                  <div
                    className={`absolute -left-6 sm:-left-8 w-6 sm:w-7 h-6 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#B85A45] text-white ring-4 ring-[#B85A45]/20 animate-pulse'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>

                  <div>
                    <h4
                      className={`font-bold text-sm sm:text-base ${
                        isCurrent
                          ? 'text-[#B85A45]'
                          : isPast
                          ? 'text-[#39251F]'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-base text-red-800">
            <XCircle className="w-5 h-5 text-red-600" />
            <span>
              {isCancelled ? 'Order Cancelled' : 'Order Rejected by Kitchen'}
            </span>
          </div>
          <p className="text-xs text-red-700">
            Reason: {order.cancellationReason || order.rejectionReason || 'No specific reason recorded.'}
          </p>
        </div>
      )}

      {/* Details Grid: Items & Invoice / Delivery Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Itemized Invoice */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-[#39251F] uppercase tracking-wider flex items-center justify-between border-b pb-2">
            <span>Official Bill Breakdown</span>
            <span className="font-mono text-[10px] text-gray-400">GST Reg. (Provisional)</span>
          </h3>

          <div className="divide-y divide-gray-100 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex justify-between items-start">
                <div>
                  <div className="font-bold text-[#39251F]">{item.productName}</div>
                  <div className="text-xs text-gray-500 font-mono">
                    ₹{item.unitPrice.toFixed(2)} × {item.quantity}
                  </div>
                  {item.variantSnapshot && (
                    <div className="text-[11px] text-[#B85A45]">
                      Serving: {item.variantSnapshot.name}
                    </div>
                  )}
                  {item.addonsSnapshot && item.addonsSnapshot.length > 0 && (
                    <div className="text-[11px] text-gray-500">
                      Toppings: {item.addonsSnapshot.map((a) => `${a.name} (x${a.quantity})`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="font-mono font-bold text-[#39251F]">
                  ₹{item.subtotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#39251F]/70">
              <span>Subtotal</span>
              <span className="font-mono font-bold">₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#39251F]/70">
              <span>Delivery Charge</span>
              <span className="font-mono font-bold">
                {order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : 'FREE'}
              </span>
            </div>
            <div className="flex justify-between text-[#39251F]/70">
              <span>Restaurant GST (5%)</span>
              <span className="font-mono font-bold">₹{order.tax.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-[#39251F]/15 flex justify-between text-base font-black text-[#39251F]">
              <span>Final Total</span>
              <span className="font-mono text-lg text-[#B85A45]">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Status Pill */}
          <div className="mt-4 p-3 rounded-xl bg-[#F5EDE1] border border-[#39251F]/10 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#39251F]">Payment Choice: </span>
              <span className="text-[#39251F]/80">
                {order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'UPI Sandbox'}
              </span>
            </div>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-md text-[11px] ${
                order.paymentStatus === 'COMPLETED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Right: Contact, Address, & Action Controls */}
        <div className="md:col-span-5 space-y-6">
          {/* Customer & Address Snapshot */}
          <div className="bg-white rounded-2xl border border-[#39251F]/15 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-[#39251F] uppercase tracking-wider">
              {isDelivery ? 'Delivery Destination' : 'Takeaway Pickup Counter'}
            </h4>

            <div className="text-xs space-y-1 text-[#39251F]">
              <div className="font-bold text-sm">{order.customerName}</div>
              <div className="font-mono text-gray-600">📱 {order.customerPhone}</div>

              {isDelivery && order.deliveryAddressSnapshot ? (
                <div className="pt-2 border-t border-gray-100 text-gray-700 leading-relaxed">
                  <div>{order.deliveryAddressSnapshot.street}</div>
                  {order.deliveryAddressSnapshot.landmark && (
                    <div className="text-gray-500">Landmark: {order.deliveryAddressSnapshot.landmark}</div>
                  )}
                  <div>
                    {order.deliveryAddressSnapshot.city}, Andhra Pradesh ({order.deliveryAddressSnapshot.postalCode})
                  </div>
                  {order.deliveryAddressSnapshot.instructions && (
                    <div className="mt-1 p-2 rounded bg-amber-50 text-amber-900 text-[11px] font-medium">
                      Note: {order.deliveryAddressSnapshot.instructions}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2 border-t border-gray-100 text-gray-700 leading-relaxed">
                  <div className="font-bold">Waffle Pops and Company — Mandadam</div>
                  <div>Main Road, opposite Krupa Bangalore Bakery Shop, Mandadam, AP</div>
                  <div className="text-[#B85A45] font-semibold mt-1">Ready at kitchen counter</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Cancel / Support */}
          <div className="space-y-3">
            {canCancel && !showCancelDialog && (
              <button
                type="button"
                onClick={() => setShowCancelDialog(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel Order
              </button>
            )}

            {showCancelDialog && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                <div className="text-xs font-bold text-red-900">Are you sure you want to cancel?</div>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white text-xs focus:outline-hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 cursor-pointer"
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelDialog(false)}
                    className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs font-semibold cursor-pointer"
                  >
                    Keep Order
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenSupport(order.id)}
              className="w-full py-3 px-4 rounded-xl bg-[#F5EDE1] border border-[#39251F]/15 hover:bg-[#ebdcc8] text-[#39251F] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#B85A45]" />
              <span>Need Help with this Order? Contact Care</span>
            </button>

            <button
              type="button"
              onClick={onBackToMenu}
              className="w-full py-3 px-4 rounded-xl bg-[#39251F] hover:bg-[#B85A45] text-[#FFF8EF] text-xs font-bold text-center transition-colors cursor-pointer"
            >
              Order More Desserts • Back to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
