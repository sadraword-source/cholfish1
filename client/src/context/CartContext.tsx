import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from '../lib/api';
import { Cart } from '../lib/types';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: number, sizeId: number, quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('sadra_token')) {
      setCart(null);
      return;
    }
    try {
      const res = await api.get<Cart>('/cart');
      setCart(res.data ?? null);
    } catch {
      setCart(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [token, refresh]);

  const addItem = async (productId: number, sizeId: number, quantity: number) => {
    await api.post('/cart/items', { productId, sizeId, quantity });
    await refresh();
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    await api.patch(`/cart/items/${itemId}`, { quantity });
    await refresh();
  };

  const removeItem = async (itemId: number) => {
    await api.delete(`/cart/items/${itemId}`);
    await refresh();
  };

  const clear = async () => {
    await api.delete('/cart');
    setCart({ items: [], subtotal: 0, count: 0 });
  };

  return (
    <CartContext.Provider value={{ cart, isLoading, refresh, addItem, updateQuantity, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart باید داخل CartProvider استفاده شود');
  return ctx;
}