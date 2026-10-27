import { createContext } from 'react';
import { Branch, CartItem, CartItemAddon, FulfilmentMode, Product, ProductVariant } from '../types';

export interface CartContextType {
  items: CartItem[];
  fulfilmentMode: FulfilmentMode;
  setFulfilmentMode: (mode: FulfilmentMode) => void;
  branch: Branch | null;
  refreshBranch: () => Promise<void>;
  addItem: (
    product: Product,
    quantity: number,
    selectedVariant?: ProductVariant,
    selectedAddons?: CartItemAddon[]
  ) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  minOrderProgress: number;
  revalidateCart: () => Promise<{ ok: boolean; message?: string }>;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);
