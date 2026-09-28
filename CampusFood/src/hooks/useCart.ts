import { useState } from 'react';
import type { Product } from '@/data';

export type CartItem = Product & { quantity: number };

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    // Un producto agotado no se puede agregar
    if (product.soldOut) return;

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing
        ? current.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...current, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, amount: number) => {
    setCart((current) =>
      current.flatMap((item) =>
        item.id === id
          ? item.quantity + amount > 0
            ? [{ ...item, quantity: item.quantity + amount }]
            : []
          : [item]
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return { cart, addToCart, updateQuantity, clearCart, cartCount, subtotal };
}