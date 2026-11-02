import { useState } from 'react';

import type { Product } from '@/data';

export type CartItem =
  Product & {
    quantity: number;
  };

export function useCart() {
  const [cart, setCart] =
    useState<CartItem[]>([]);

  const addToCart = (
    product: Product,
  ) => {
    if (
      !product.active ||
      product.stock <= 0
    ) {
      return;
    }

    setCart((currentCart) => {
      const existingItem =
        currentCart.find(
          (item) =>
            item.id === product.id,
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

      if (
        existingItem.quantity >=
        product.stock
      ) {
        return currentCart;
      }

      return currentCart.map(
        (item) =>
          item.id === product.id
            ? {
                ...item,
                stock:
                  product.stock,
                quantity:
                  item.quantity + 1,
              }
            : item,
      );
    });
  };

  const updateQuantity = (
    id: number,
    amount: number,
  ) => {
    setCart((currentCart) =>
      currentCart.flatMap(
        (item) => {
          if (item.id !== id) {
            return [item];
          }

          const nextQuantity =
            item.quantity + amount;

          if (
            nextQuantity <= 0
          ) {
            return [];
          }

          if (
            nextQuantity >
            item.stock
          ) {
            return [item];
          }

          return [
            {
              ...item,
              quantity:
                nextQuantity,
            },
          ];
        },
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount =
    cart.reduce(
      (total, item) =>
        total +
        item.quantity,
      0,
    );

  const subtotal =
    cart.reduce(
      (total, item) =>
        total +
        item.price *
          item.quantity,
      0,
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