import { useCallback, useEffect, useRef, useState } from 'react';

import type { CartItem } from '@/hooks/useCart';
import type { CancelledBy, Order, OrderStatus } from '@/types';

const POLL_INTERVAL_MS = 10000;

type ApiResult = { order?: Order; orders?: Order[]; error?: string };

async function request(
  url: string,
  init?: RequestInit
): Promise<ApiResult> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  let data: ApiResult = {};

  try {
    data = (await response.json()) as ApiResult;
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error ?? 'No fue posible completar la operación.');
  }

  return data;
}

/**
 * Pedidos guardados en la base de datos.
 * Los estudiantes reciben solo los suyos; el personal recibe todos.
 */
export function useOrders(enabled: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const data = await request('/api/orders');

      if (mounted.current && data.orders) {
        setOrders(data.orders);
      }
    } catch (requestError) {
      console.error('No se pudieron cargar los pedidos:', requestError);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Carga inicial diferida y refresco periódico (el casino ve pedidos nuevos).
    const first = setTimeout(() => void refreshOrders(), 0);
    const interval = setInterval(() => void refreshOrders(), POLL_INTERVAL_MS);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [enabled, refreshOrders]);

  const replaceOrder = (order: Order) => {
    setOrders((current) => {
      const exists = current.some((candidate) => candidate.id === order.id);

      return exists
        ? current.map((candidate) =>
            candidate.id === order.id ? order : candidate
          )
        : [order, ...current];
    });
  };

  // Ejecuta una acción sobre un pedido y deja el mensaje de error visible si falla.
  const runAction = async (code: string, body: Record<string, unknown>) => {
    try {
      const data = await request(`/api/orders/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      if (data.order) {
        replaceOrder(data.order);
      }

      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible completar la operación.'
      );

      // El estado pudo cambiar en otro equipo: se vuelve a cargar.
      await refreshOrders();
    }
  };

  // Crea el pedido. El servidor valida stock y precios y genera el código de retiro.
  const addOrder = async (cart: CartItem[]): Promise<string> => {
    const data = await request('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }),
    });

    if (!data.order) {
      throw new Error('La respuesta del servidor no incluye el pedido.');
    }

    replaceOrder(data.order);

    return data.order.id;
  };

  // Solo permite pasar entre pendiente y listo. Cancelar y retirar tienen su propia función.
  const updateStatus = async (id: string, status: OrderStatus) => {
    if (status !== 'pendiente' && status !== 'listo') return;

    await runAction(id, { action: 'status', status });
  };

  // `by` lo decide el servidor según quién hace la solicitud.
  const cancelOrder = async (id: string, _by: CancelledBy, reason: string) => {
    await runAction(id, { action: 'cancel', reason });
  };

  // Quién entrega queda registrado por el servidor (usuario de la sesión).
  const retireOrder = async (id: string) => {
    await runAction(id, { action: 'retire' });
  };

  const removeOrderItem = async (
    orderId: string,
    itemId: number,
    quantity: number,
    _by: CancelledBy,
    reason: string
  ) => {
    await runAction(orderId, {
      action: 'removeItem',
      productId: itemId,
      quantity,
      reason,
    });
  };

  const clearError = () => setError(null);

  return {
    orders,
    error,
    clearError,
    refreshOrders,
    addOrder,
    updateStatus,
    cancelOrder,
    retireOrder,
    removeOrderItem,
  };
}
