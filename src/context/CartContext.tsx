import React, { useEffect, useState } from 'react';
import { Branch, CartItem, CartItemAddon, FulfilmentMode, Product, ProductVariant } from '../types';
import { CartContext } from './cart-context';
import { api } from '../services/api';
const CART_STORAGE_KEY = 'waffle_pops_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fulfilmentMode, setFulfilmentModeState] = useState<FulfilmentMode>('DELIVERY');
  const [branch, setBranch] = useState<Branch | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const refreshBranch = async () => {
    try {
      const res = await api.getBranch();
      setBranch(res.branch);
    } catch (err) {
      console.error('Failed to fetch branch settings:', err);
    }
  };

  useEffect(() => {
    refreshBranch();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('Could not persist cart:', err);
    }
  }, [items]);

  const setFulfilmentMode = (mode: FulfilmentMode) => {
    setFulfilmentModeState(mode);
  };

  const addItem = (
    product: Product,
    quantity: number,
    selectedVariant?: ProductVariant,
    selectedAddons: CartItemAddon[] = []
  ) => {
    const variantId = selectedVariant?.id || 'default';
    const addonsKey = selectedAddons
      .map((a) => `${a.name}:${a.quantity}`)
      .sort()
      .join('|');
    const cartItemId = `${product.id}-${variantId}-${addonsKey}`;

    const unitPrice =
      Number(product.basePrice) +
      (selectedVariant ? Number(selectedVariant.priceDelta) : 0) +
      selectedAddons.reduce((sum, a) => sum + a.price * a.quantity, 0);

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === cartItemId);
      if (existingIdx > -1) {
        const next = [...prev];
        const nextQty = next[existingIdx].quantity + quantity;
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: nextQty,
          itemTotal: Math.round(unitPrice * nextQty * 100) / 100,
        };
        return next;
      }

      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          product,
          quantity,
          selectedVariant,
          selectedAddons,
          unitPrice,
          itemTotal: Math.round(unitPrice * quantity * 100) / 100,
        },
      ];
    });

    setIsCartOpen(true);
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === cartItemId ? { ...i, quantity: newQty, itemTotal: Math.round(i.unitPrice * newQty * 100) / 100 } : i))
    );
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  // Pricing calculations
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = Math.round(items.reduce((acc, i) => acc + i.itemTotal, 0) * 100) / 100;
  const deliveryFee = fulfilmentMode === 'DELIVERY' && branch ? Number(branch.deliveryFee) : 0;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

  const minOrderAmount = branch ? Number(branch.minOrderAmount) : 99;
  const minOrderProgress = Math.min(100, Math.round((subtotal / minOrderAmount) * 100));

  const revalidateCart = async (): Promise<{ ok: boolean; message?: string }> => {
    if (items.length === 0) return { ok: true };
    try {
      const payload = {
        fulfilmentMode,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variantName: i.selectedVariant?.name,
          addons: i.selectedAddons.map((a) => ({ name: a.name, quantity: a.quantity })),
        })),
      };
      const res = await api.validateCart(payload);
      if (res.branch) setBranch(res.branch);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.message || 'Cart verification error' };
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        fulfilmentMode,
        setFulfilmentMode,
        branch,
        refreshBranch,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        itemCount,
        subtotal,
        deliveryFee,
        tax,
        total,
        minOrderProgress,
        revalidateCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
