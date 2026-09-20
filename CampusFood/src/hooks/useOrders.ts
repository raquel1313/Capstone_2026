import { useEffect, useState } from 'react';
import type { Order, OrderStatus } from '@/types';
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

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
  };

  return { orders, addOrder, updateStatus };
}