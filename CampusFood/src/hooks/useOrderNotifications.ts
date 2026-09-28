import { useEffect, useMemo, useState } from 'react';
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

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useOrderNotifications(
  orders: Order[],
  username: string | null
) {
  // Sube cada vez que se escribe en el almacenamiento, para volver a leerlo
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const notifications = useMemo(
    () =>
      username
        ? readJSON<OrderNotification[]>(STORAGE_PREFIX + username, [])
        : [],
    [username, version]
  );

  // Crea un aviso por cada pedido listo que no se haya avisado ni descartado
  useEffect(() => {
    if (!username) return;

    const current = readJSON<OrderNotification[]>(
      STORAGE_PREFIX + username,
      []
    );

    const dismissed = readJSON<string[]>(DISMISSED_PREFIX + username, []);

    const alreadyHandled = new Set([
      ...current.map((n) => n.orderId),
      ...dismissed,
    ]);

    const created: OrderNotification[] = [];

    orders.forEach((order) => {
      if (order.username !== username) return;
      if (order.status !== 'listo') return;
      if (alreadyHandled.has(order.id)) return;

      created.push({
        id: `notif-${Date.now()}-${order.id}`,
        orderId: order.id,
        message: `Tu pedido ${order.id} está listo para retirar.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    if (created.length === 0) return;

    writeJSON(STORAGE_PREFIX + username, [...created, ...current]);
    refresh();
  }, [orders, username]);

  const markAsRead = (id: string) => {
    if (!username) return;

    const key = STORAGE_PREFIX + username;
    const current = readJSON<OrderNotification[]>(key, []);

    writeJSON(
      key,
      current.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    refresh();
  };

  const markAllAsRead = () => {
    if (!username) return;

    const key = STORAGE_PREFIX + username;
    const current = readJSON<OrderNotification[]>(key, []);

    writeJSON(
      key,
      current.map((n) => ({ ...n, read: true }))
    );

    refresh();
  };

  const dismissNotification = (id: string) => {
    if (!username) return;

    const key = STORAGE_PREFIX + username;
    const dismissedKey = DISMISSED_PREFIX + username;

    const current = readJSON<OrderNotification[]>(key, []);
    const target = current.find((n) => n.id === id);

    if (!target) return;

    // Primero se registra el pedido como descartado y después se quita el aviso,
    // así el efecto de arriba nunca vuelve a crearlo
    const dismissed = readJSON<string[]>(dismissedKey, []);

    if (!dismissed.includes(target.orderId)) {
      writeJSON(dismissedKey, [...dismissed, target.orderId]);
    }

    writeJSON(
      key,
      current.filter((n) => n.id !== id)
    );

    refresh();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  };
}