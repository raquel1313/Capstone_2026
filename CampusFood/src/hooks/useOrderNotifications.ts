import { useCallback, useEffect, useState } from 'react';

import type { OrderNotification } from '@/types';

export type { OrderNotification } from '@/types';

const POLL_INTERVAL_MS = 10000;

type NotificationState = {
  owner: string | null;
  items: OrderNotification[];
};

async function patch(body: Record<string, unknown>) {
  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('No se pudo actualizar la notificación.');
  }
}

/**
 * Avisos de pedidos guardados en la base de datos. Los crea el servidor cuando
 * un pedido queda listo, el casino lo cancela o quita un producto.
 */
export function useOrderNotifications(userId: string | null) {
  const [state, setState] = useState<NotificationState>({
    owner: null,
    items: [],
  });

  const notifications = state.owner === userId ? state.items : [];

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        notifications?: OrderNotification[];
      };

      setState({ owner: userId, items: data.notifications ?? [] });
    } catch (error) {
      console.error('No se pudieron cargar las notificaciones:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const first = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [userId, refresh]);

  // Se actualiza la pantalla al instante y se guarda en el servidor; si falla, se recarga.
  const apply = (
    update: (items: OrderNotification[]) => OrderNotification[],
    body: Record<string, unknown>
  ) => {
    if (!userId) {
      return;
    }

    setState((current) => ({
      owner: userId,
      items: update(current.owner === userId ? current.items : []),
    }));

    patch(body).catch((error) => {
      console.error(error);
      void refresh();
    });
  };

  const markAsRead = (id: string) =>
    apply(
      (items) =>
        items.map((item) => (item.id === id ? { ...item, read: true } : item)),
      { action: 'read', id }
    );

  const markAllAsRead = () =>
    apply((items) => items.map((item) => ({ ...item, read: true })), {
      action: 'readAll',
    });

  const dismissNotification = (id: string) =>
    apply((items) => items.filter((item) => item.id !== id), {
      action: 'dismiss',
      id,
    });

  const unreadCount = notifications.filter((item) => !item.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  };
}
