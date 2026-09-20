import { useEffect, useState } from 'react';
import type { Order } from '@/types';

export type OrderNotification = {
  id: string;
  orderId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const STORAGE_PREFIX = 'campusfood_notifications_';
const DISMISSED_PREFIX = 'campusfood_dismissed_orders_';

function loadNotifications(username: string): OrderNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + username);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadDismissedOrderIds(username: string): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_PREFIX + username);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useOrderNotifications(orders: Order[], username: string | null) {
  const [notifications, setNotifications] = useState<OrderNotification[]>(() =>
    username ? loadNotifications(username) : []
  );
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>(() =>
    username ? loadDismissedOrderIds(username) : []
  );

  useEffect(() => {
    setNotifications(username ? loadNotifications(username) : []);
    setDismissedOrderIds(username ? loadDismissedOrderIds(username) : []);
  }, [username]);

  useEffect(() => {
    if (!username) return;

    setNotifications((current) => {
      const existingOrderIds = new Set(current.map((n) => n.orderId));
      const newOnes: OrderNotification[] = [];

      orders.forEach((order) => {
        if (order.username !== username) return;
        if (order.status !== 'listo') return;
        if (existingOrderIds.has(order.id)) return;
        if (dismissedOrderIds.includes(order.id)) return; // ya la descartaste antes

        newOnes.push({
          id: `notif-${Date.now()}-${order.id}`,
          orderId: order.id,
          message: `Tu pedido ${order.id} está listo para retirar.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      });

      if (newOnes.length === 0) return current;
      return [...newOnes, ...current];
    });
  }, [orders, username, dismissedOrderIds]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(STORAGE_PREFIX + username, JSON.stringify(notifications));
  }, [notifications, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(DISMISSED_PREFIX + username, JSON.stringify(dismissedOrderIds));
  }, [dismissedOrderIds, username]);

  const markAsRead = (id: string) => {
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications((current) => {
      const target = current.find((n) => n.id === id);
      if (target) {
        setDismissedOrderIds((prevDismissed) =>
          prevDismissed.includes(target.orderId) ? prevDismissed : [...prevDismissed, target.orderId]
        );
      }
      return current.filter((n) => n.id !== id);
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification };
}