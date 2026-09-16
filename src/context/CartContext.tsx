import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const CART_STORAGE_KEY = 'socialio-cart';

function loadStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export interface CartItem {
  id: string; // unique cart item id (e.g., serviceId-timestamp)
  serviceId: string;
  title: string;
  levelLabel: string;
  price: number;
  type: 'service' | 'addon';
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage unavailable (private mode, blocked storage) — cart just
      // won't survive a refresh; not worth surfacing to the user.
    }
  }, [items]);

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    const newItem = { ...item, id: `${item.serviceId}-${Date.now()}` };
    setItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, total, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
