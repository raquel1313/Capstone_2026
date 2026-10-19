
import { useEffect, useState } from 'react';

import type { Product } from '@/data';

export type CartItem = Product & {
  quantity: number;
};

const CART_STORAGE_KEY = 'campusfood-cart';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Recupera el carrito guardado al cargar la aplicación.
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart) as CartItem[];

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      }
    } catch (error) {
      console.error('No se pudo recuperar el carrito:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Guarda el carrito cada vez que cambian los productos o las cantidades.
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('No se pudo guardar el carrito:', error);
    }
  }, [cart, loaded]);

  const addToCart = (product: Product) => {
    if (product.soldOut) {
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (!existingItem) {
        return [
          ...currentCart,
          {
            ...product,
            quantity: 1,
          },
        ];
      }

      return currentCart.map((item) =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      );
    });
  };

  const updateQuantity = (id: number, amount: number) => {
    setCart((currentCart) =>
      currentCart.flatMap((item) => {
        if (item.id !== id) {
          return [item];
        }

        const nextQuantity = item.quantity + amount;

        if (nextQuantity <= 0) {
          return [];
        }

        return [
          {
            ...item,
            quantity: nextQuantity,
          },
        ];
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return {
    cart,
    addToCart,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal,
  };
}
