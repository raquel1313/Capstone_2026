import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Product } from '@/data';

export type CartItem = Product & {
  quantity: number;
};

type CartLine = { id: number; quantity: number };

type CartState = {
  // Dueño del carrito en memoria: evita mostrar el de otro usuario tras cerrar sesión.
  owner: string | null;
  lines: CartLine[];
};

type CartResponse = {
  items?: { productId: number; quantity: number }[];
};

const SAVE_DELAY_MS = 300;

/**
 * Carrito guardado en la base de datos (un carrito activo por usuario).
 * Solo se guardan producto y cantidad; precio y nombre salen del catálogo.
 */
export function useCart(products: Product[], userId: string | null) {
  const [state, setState] = useState<CartState>({ owner: null, lines: [] });
  const loadedFor = useRef<string | null>(null);
  const linesRef = useRef<CartLine[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const lines = useMemo(
    () => (state.owner === userId ? state.lines : []),
    [state, userId]
  );

  // Recupera el carrito guardado al iniciar sesión (y tras recargar la página).
  useEffect(() => {
    if (!userId) {
      loadedFor.current = null;
      linesRef.current = [];

      return;
    }

    let cancelled = false;

    fetch('/api/cart', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('No se pudo recuperar el carrito.');
        }

        return (await response.json()) as CartResponse;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        const restored = (data.items ?? []).map((item) => ({
          id: item.productId,
          quantity: item.quantity,
        }));

        loadedFor.current = userId;
        linesRef.current = restored;
        setState({ owner: userId, lines: restored });
      })
      .catch((error) => {
        console.error('No se pudo recuperar el carrito:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = useCallback((next: CartLine[]) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: next.map((line) => ({
            productId: line.id,
            quantity: line.quantity,
          })),
        }),
      }).catch((error) => {
        console.error('No se pudo guardar el carrito:', error);
      });
    }, SAVE_DELAY_MS);
  }, []);

  // Evita pisar el carrito guardado antes de que termine de cargar.
  const commit = (next: CartLine[]) => {
    if (!userId || loadedFor.current !== userId) {
      return;
    }

    linesRef.current = next;
    setState({ owner: userId, lines: next });
    save(next);
  };

  const cart = useMemo<CartItem[]>(() => {
    const byId = new Map(products.map((product) => [product.id, product]));

    return lines.flatMap((line) => {
      const product = byId.get(line.id);

      return product && product.active
        ? [{ ...product, quantity: line.quantity }]
        : [];
    });
  }, [lines, products]);

  const addToCart = (product: Product) => {
    if (!product.active || product.stock <= 0) {
      return;
    }

    const current = linesRef.current;
    const existing = current.find((line) => line.id === product.id);

    if (!existing) {
      commit([...current, { id: product.id, quantity: 1 }]);

      return;
    }

    if (existing.quantity >= product.stock) {
      return;
    }

    commit(
      current.map((line) =>
        line.id === product.id
          ? { ...line, quantity: line.quantity + 1 }
          : line
      )
    );
  };

  const updateQuantity = (id: number, amount: number) => {
    const product = products.find((candidate) => candidate.id === id);

    commit(
      linesRef.current.flatMap((line) => {
        if (line.id !== id) {
          return [line];
        }

        const nextQuantity = line.quantity + amount;

        if (nextQuantity <= 0) {
          return [];
        }

        if (product && nextQuantity > product.stock) {
          return [line];
        }

        return [{ ...line, quantity: nextQuantity }];
      })
    );
  };

  const clearCart = () => {
    commit([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

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
