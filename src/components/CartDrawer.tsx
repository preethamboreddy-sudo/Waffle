import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, AlertCircle, Sparkles } from 'lucide-react';
import { useCart } from '../context/useCart';

interface CartDrawerProps {
  onCheckout: () => void;
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    deliveryFee,
    tax,
    total,
    fulfilmentMode,
    setFulfilmentMode,
    branch,
    minOrderProgress,
  } = useCart();

  if (!isCartOpen) return null;

  const minOrderAmount = branch ? Number(branch.minOrderAmount) : 99;
  const isEligible = subtotal >= minOrderAmount;
  const amountNeeded = Math.max(0, minOrderAmount - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="relative w-full max-w-md bg-[#FFF8EF] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-[#39251F]/15">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#39251F] text-[#FFF8EF] flex items-center justify-between border-b border-[#F5C76A]/20">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#F5C76A]" />
            <h2 className="font-black text-lg text-[#FFF8EF]">Your Dessert Order</h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#F5C76A] text-[#271915]">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-[#FFF8EF]/70 hover:text-red-300 font-medium px-2 py-1 rounded cursor-pointer"
                title="Clear all items in cart"
              >
                Clear Cart
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFF8EF] transition-colors cursor-pointer"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fulfilment Mode switcher inside Cart */}
        <div className="bg-[#F5EDE1] p-3 border-b border-[#39251F]/10 flex items-center justify-between">
          <span className="text-xs font-bold text-[#39251F]">Ordering Mode:</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setFulfilmentMode('DELIVERY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                fulfilmentMode === 'DELIVERY'
                  ? 'bg-[#39251F] text-[#FFF8EF] shadow-xs'
                  : 'bg-white/80 text-[#39251F] hover:bg-white'
              }`}
            >
              🛵 Delivery
            </button>
            <button
              type="button"
              onClick={() => setFulfilmentMode('TAKEAWAY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                fulfilmentMode === 'TAKEAWAY'
                  ? 'bg-[#39251F] text-[#FFF8EF] shadow-xs'
                  : 'bg-white/80 text-[#39251F] hover:bg-white'
              }`}
            >
              🛍️ Takeaway
            </button>
          </div>
        </div>

        {/* Minimum Order Value Bar */}
        <div className="bg-white px-4 py-2.5 border-b border-[#39251F]/10">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-[#39251F]">
              {isEligible ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  ✓ Minimum order ₹{minOrderAmount} reached!
                </span>
              ) : (
                <span className="text-[#B85A45]">
                  Add ₹{amountNeeded.toFixed(2)} more for min. order ₹{minOrderAmount}
                </span>
              )}
            </span>
            <span className="font-mono text-[#39251F]/70">{minOrderProgress}%</span>
          </div>
          <div className="w-full bg-[#F5EDE1] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isEligible ? 'bg-emerald-600' : 'bg-[#B85A45]'
              }`}
              style={{ width: `${minOrderProgress}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#39251F]/60">
              <ShoppingBag className="w-16 h-16 stroke-1 text-[#39251F]/30 mb-3" />
              <h3 className="font-black text-lg text-[#39251F] mb-1">Your cart is empty</h3>
              <p className="text-xs max-w-xs mb-5">
                Explore our Belgian waffles, stuffed waffles, and chocolate-dripping pops to begin!
              </p>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="bg-[#39251F] text-[#FFF8EF] font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer hover:bg-[#B85A45]"
              >
                Explore Menu
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-3 border border-[#39251F]/10 shadow-xs flex gap-3"
              >
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="w-18 h-18 rounded-lg object-cover bg-gray-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-bold text-sm text-[#39251F] truncate">{item.product.name}</h4>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                      title="Remove item"
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Selected Portion & Addons */}
                  {item.selectedVariant && (
                    <div className="text-[11px] font-medium text-[#B85A45]">
                      Serving: {item.selectedVariant.name}
                    </div>
                  )}
                  {item.selectedAddons.length > 0 && (
                    <div className="text-[10px] text-[#39251F]/70">
                      Extras: {item.selectedAddons.map((a) => `${a.name} (x${a.quantity})`).join(', ')}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-[#F5EDE1] p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-5 h-5 rounded bg-white text-[#39251F] flex items-center justify-center font-bold text-xs hover:bg-[#39251F] hover:text-white cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-5 h-5 rounded bg-white text-[#39251F] flex items-center justify-center font-bold text-xs hover:bg-[#39251F] hover:text-white cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-mono font-extrabold text-sm text-[#39251F]">
                      ₹{item.itemTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Checkout Button */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 bg-white border-t border-[#39251F]/15 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#39251F]/70">
                <span>Dessert Subtotal</span>
                <span className="font-mono font-bold text-[#39251F]">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#39251F]/70">
                <span>
                  Delivery Charge ({fulfilmentMode === 'DELIVERY' ? 'Mandadam Town' : 'Takeaway'})
                </span>
                <span className="font-mono font-bold text-[#39251F]">
                  {deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : 'FREE'}
                </span>
              </div>
              <div className="flex justify-between text-[#39251F]/70">
                <span>Restaurant GST (5%)</span>
                <span className="font-mono font-bold text-[#39251F]">₹{tax.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[#39251F]/10 flex justify-between text-sm font-black text-[#39251F]">
                <span>Total Amount</span>
                <span className="font-mono text-base text-[#B85A45]">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              disabled={!isEligible}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-between shadow-md transition-all cursor-pointer ${
                isEligible
                  ? 'bg-[#39251F] hover:bg-[#B85A45] text-[#FFF8EF] active:scale-98'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              <span>{isEligible ? 'Proceed to Checkout' : `Min. Order ₹${minOrderAmount}`}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#F5C76A]">₹{total.toFixed(2)}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
