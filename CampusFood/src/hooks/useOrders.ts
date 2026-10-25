import { useEffect, useState } from 'react';
import type { CancelledBy, Order, OrderStatus } from '@/types';
import type { CartItem } from '@/hooks/useCart';

const STORAGE_KEY = 'campusfood_orders';

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function generateOrderNumber(existingCount: number) {
  return `C-${String(existingCount + 1).padStart(3, '0')}`;
}

function fallbackReason(by: CancelledBy) {
  return by === 'cliente' ? 'Solicitud del cliente' : 'Cancelado por el casino';
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(() => loadOrders());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const addOrder = (cart: CartItem[], subtotal: number, username: string) => {
    const orderNumber = generateOrderNumber(orders.length);
    const newOrder: Order = {
      id: orderNumber,
      username,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal,
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    };
    setOrders((current) => [...current, newOrder]);
    return orderNumber;
  };

  // Solo permite pasar entre pendiente y listo. Cancelar y retirar tienen sus propias funciones.
  const updateStatus = (id: string, status: OrderStatus) => {
    if (status !== 'pendiente' && status !== 'listo') return;

    setOrders((current) =>
      current.map((order) =>
        order.id === id &&
        (order.status === 'pendiente' || order.status === 'listo')
          ? { ...order, status }
          : order
      )
    );
  };

  // Solo se puede cancelar un pedido que sigue pendiente
  const cancelOrder = (id: string, by: CancelledBy, reason: string) => {
    setOrders((current) =>
      current.map((order): Order =>
        order.id === id && order.status === 'pendiente'
          ? {
              ...order,
              status: 'cancelado',
              cancelledAt: new Date().toISOString(),
              cancelledBy: by,
              cancelReason: reason.trim() || fallbackReason(by),
            }
          : order
      )
    );
  };

  // Entrega del pedido. Es definitivo: ya no se puede revertir ni cancelar.
  const retireOrder = (id: string, by: string) => {
    setOrders((current) =>
      current.map((order): Order =>
        order.id === id && order.status === 'listo'
          ? {
              ...order,
              status: 'retirado',
              retiredAt: new Date().toISOString(),
              retiredBy: by,
            }
          : order
      )
    );
  };

  // Quita una cantidad de un producto de un pedido pendiente y recalcula el total.
  // Si no queda ningún producto, el pedido se cancela.
  const removeOrderItem = (
    orderId: string,
    itemId: number,
    quantity: number,
    by: CancelledBy,
    reason: string
  ) => {
    setOrders((current) =>
      current.map((order): Order => {
        if (order.id !== orderId || order.status !== 'pendiente') return order;

        const target = order.items.find((item) => item.id === itemId);
        if (!target) return order;

        const now = new Date().toISOString();
        const removed = Math.min(Math.max(1, quantity), target.quantity);
        const finalReason = reason.trim() || fallbackReason(by);

        const adjustments = [
          ...(order.adjustments ?? []),
          {
            at: now,
            by,
            itemId,
            name: target.name,
            quantity: removed,
            reason: finalReason,
          },
        ];

        const items = order.items
          .map((item) =>
            item.id === itemId
              ? { ...item, quantity: item.quantity - removed }
              : item
          )
          .filter((item) => item.quantity > 0);

        // Se quitó todo: queda como cancelación completa y conserva el detalle original
        if (items.length === 0) {
          return {
            ...order,
            adjustments,
            status: 'cancelado',
            cancelledAt: now,
            cancelledBy: by,
            cancelReason: finalReason,
          };
        }

        return {
          ...order,
          items,
          adjustments,
          subtotal: items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ),
        };
      })
    );
  };

  return {
    orders,
    addOrder,
    updateStatus,
    cancelOrder,
    retireOrder,
    removeOrderItem,
  };
}