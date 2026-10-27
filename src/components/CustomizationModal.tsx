import React, { useState } from 'react';
import { X, Plus, Minus, Check, Sparkles } from 'lucide-react';
import { Product, ProductVariant, CartItemAddon } from '../types';

interface CustomizationModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    quantity: number,
    selectedVariant?: ProductVariant,
    selectedAddons?: CartItemAddon[]
  ) => void;
}

export function CustomizationModal({ product, onClose, onAddToCart }: CustomizationModalProps) {
  if (!product) return null;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants.length > 0 ? product.variants[0] : undefined
  );
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);

  const handleAddonToggle = (addonName: string, maxQty: number, delta: number) => {
    setAddonQuantities((prev) => {
      const current = prev[addonName] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      return { ...prev, [addonName]: next };
    });
  };

  const selectedAddons: CartItemAddon[] = product.addons
    .filter((a) => (addonQuantities[a.name] || 0) > 0)
    .map((a) => ({
      name: a.name,
      price: Number(a.price),
      quantity: addonQuantities[a.name],
    }));

  const variantDelta = selectedVariant ? Number(selectedVariant.priceDelta) : 0;
  const addonsTotalPerUnit = selectedAddons.reduce((acc, a) => acc + a.price * a.quantity, 0);
  const unitPrice = Number(product.basePrice) + variantDelta + addonsTotalPerUnit;
  const grandTotal = Math.round(unitPrice * quantity * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddToCart(product, quantity, selectedVariant, selectedAddons);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-[#FFF8EF] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#39251F]/15 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with image */}
        <div className="relative h-44 sm:h-52 bg-[#39251F]">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
            aria-label="Close customization modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 text-white">
            <h2 className="text-xl font-black text-white">{product.name}</h2>
            <p className="text-xs text-white/80 line-clamp-1">{product.description}</p>
          </div>
        </div>

        {/* Customization Options */}
        <form onSubmit={handleSubmit} className="p-5 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Variants / Size */}
          {product.variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#39251F] uppercase tracking-wider">
                  Choose Portion / Serving
                </span>
                <span className="text-[10px] text-[#B85A45] font-bold">Required (Select 1)</span>
              </div>
              <div className="space-y-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const delta = Number(variant.priceDelta);
                  return (
                    <label
                      key={variant.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#B85A45] bg-[#F5EDE1] text-[#39251F] shadow-xs'
                          : 'border-[#39251F]/15 bg-white text-[#39251F]/80 hover:border-[#39251F]/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="variant"
                          value={variant.id}
                          checked={isSelected}
                          onChange={() => setSelectedVariant(variant)}
                          className="text-[#B85A45] focus:ring-[#B85A45]"
                        />
                        <span>{variant.name}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#39251F]">
                        {delta > 0 ? `+₹${delta.toFixed(2)}` : 'Included'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {product.addons.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#39251F] uppercase tracking-wider">
                  Add Gourmet Extras &amp; Dips
                </span>
                <span className="text-[10px] text-[#39251F]/60 font-medium">Optional</span>
              </div>
              <div className="space-y-2.5">
                {product.addons.map((addon) => {
                  const qty = addonQuantities[addon.name] || 0;
                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                        qty > 0
                          ? 'border-[#39251F] bg-[#F5EDE1]/60'
                          : 'border-[#39251F]/15 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-[#39251F]">{addon.name}</div>
                        <div className="font-mono text-xs text-[#B85A45] font-bold">
                          +₹{Number(addon.price).toFixed(2)} each (max {addon.maxQuantity})
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {qty > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAddonToggle(addon.name, addon.maxQuantity, -1)}
                            className="w-7 h-7 rounded-lg bg-white border border-[#39251F]/20 flex items-center justify-center text-[#39251F] hover:bg-gray-100 cursor-pointer"
                            aria-label={`Decrease ${addon.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {qty > 0 && <span className="font-mono font-bold text-sm w-4 text-center">{qty}</span>}
                        <button
                          type="button"
                          onClick={() => handleAddonToggle(addon.name, addon.maxQuantity, 1)}
                          disabled={qty >= addon.maxQuantity}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer ${
                            qty >= addon.maxQuantity
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-[#39251F] text-white hover:bg-[#B85A45]'
                          }`}
                          aria-label={`Add ${addon.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Controls & Add Button */}
          <div className="pt-4 border-t border-[#39251F]/15 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-[#F5EDE1] p-1.5 rounded-xl border border-[#39251F]/15">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-white text-[#39251F] flex items-center justify-center font-bold shadow-xs hover:bg-[#39251F] hover:text-white transition-colors cursor-pointer"
                aria-label="Decrease item quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono font-black text-base w-6 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-white text-[#39251F] flex items-center justify-center font-bold shadow-xs hover:bg-[#39251F] hover:text-white transition-colors cursor-pointer"
                aria-label="Increase item quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              className="flex-1 bg-[#39251F] hover:bg-[#B85A45] text-[#FFF8EF] font-black py-3 px-5 rounded-xl shadow-md flex items-center justify-between text-sm transition-all transform active:scale-98 cursor-pointer"
            >
              <span>Add to Order</span>
              <span className="font-mono text-base text-[#F5C76A]">₹{grandTotal.toFixed(2)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
