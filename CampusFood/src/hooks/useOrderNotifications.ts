import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

import type { Order } from '@/types';

export type OrderNotification = {
  id: string;
  orderId: string;
  // Notificaciones guardadas antes de este cambio no tienen tipo: se tratan como "ready"
  kind?: 'ready' | 'cancelled';
  message: string;
  read: boolean;
  createdAt: string;
};

const STORAGE_PREFIX = 'campusfood_notifications_';
const DISMISSED_PREFIX = 'campusfood_dismissed_orders_';

const STORAGE_UPDATE_EVENT = 'campusfood-storage-update';
const EMPTY_ARRAY_JSON = '[]';

type StorageUpdateDetail = {
  key: string;
};

function parseStoredArray<T>(raw: string): T[] {
  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function readStorage(key: string | null): string {
  if (!key || typeof window === 'undefined') {
    return EMPTY_ARRAY_JSON;
  }

  try {
    return window.localStorage.getItem(key) ?? EMPTY_ARRAY_JSON;
  } catch {
    return EMPTY_ARRAY_JSON;
  }
}

function writeStorageArray<T>(
  key: string | null,
  value: T[]
): void {
  if (!key || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify(value)
  );

  window.dispatchEvent(
    new CustomEvent<StorageUpdateDetail>(
      STORAGE_UPDATE_EVENT,
      {
        detail: { key },
      }
    )
  );
}

function subscribeToStorageKey(
  key: string | null,
  callback: () => void
): () => void {
  if (!key || typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === key) {
      callback();
    }
  };

  const handleLocalUpdate = (event: Event) => {
    const customEvent =
      event as CustomEvent<StorageUpdateDetail>;

    if (customEvent.detail?.key === key) {
      callback();
    }
  };

  window.addEventListener(
    'storage',
    handleStorage
  );

  window.addEventListener(
    STORAGE_UPDATE_EVENT,
    handleLocalUpdate
  );

  return () => {
    window.removeEventListener(
      'storage',
      handleStorage
    );

    window.removeEventListener(
      STORAGE_UPDATE_EVENT,
      handleLocalUpdate
    );
  };
}

function getServerSnapshot(): string {
  return EMPTY_ARRAY_JSON;
}

function useStoredArray<T>(
  key: string | null
): T[] {
  const subscribe = useCallback(
    (callback: () => void) =>
      subscribeToStorageKey(key, callback),
    [key]
  );

  const getSnapshot = useCallback(
    () => readStorage(key),
    [key]
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return useMemo(
    () => parseStoredArray<T>(snapshot),
    [snapshot]
  );
}

function kindOf(notification: OrderNotification) {
  return notification.kind ?? 'ready';
}

export function useOrderNotifications(
  orders: Order[],
  username: string | null
) {
  const notificationsKey = username
    ? STORAGE_PREFIX + username
    : null;

  const dismissedKey = username
    ? DISMISSED_PREFIX + username
    : null;

  const notifications =
    useStoredArray<OrderNotification>(
      notificationsKey
    );

  useEffect(() => {
    if (
      !username ||
      !notificationsKey ||
      !dismissedKey
    ) {
      return;
    }

    const currentNotifications =
      parseStoredArray<OrderNotification>(
        readStorage(notificationsKey)
      );

    const currentDismissed =
      parseStoredArray<string>(
        readStorage(dismissedKey)
      );

    // Clave "pedido:tipo". Los descartados antiguos eran solo el número de pedido
    // y se interpretan como avisos de "listo".
    const alreadyHandled = new Set<string>([
      ...currentNotifications.map(
        (notification) =>
          `${notification.orderId}:${kindOf(notification)}`
      ),
      ...currentDismissed.map((entry) =>
        entry.includes(':') ? entry : `${entry}:ready`
      ),
    ]);

    const newNotifications:
      OrderNotification[] = [];

    for (const order of orders) {
      if (order.username !== username) {
        continue;
      }

      if (order.status === 'listo') {
        if (alreadyHandled.has(`${order.id}:ready`)) {
          continue;
        }

        newNotifications.push({
          id: `notif-${Date.now()}-${order.id}-ready`,
          orderId: order.id,
          kind: 'ready',
          message: `Tu pedido ${order.id} está listo para retirar.`,
          read: false,
          createdAt: new Date().toISOString(),
        });

        continue;
      }

      // Solo se avisa si cancela el casino; si el cliente cancela, ya lo sabe
      if (
        order.status === 'cancelado' &&
        order.cancelledBy === 'personal'
      ) {
        if (alreadyHandled.has(`${order.id}:cancelled`)) {
          continue;
        }

        const reason = order.cancelReason
          ? ` Motivo: ${order.cancelReason}.`
          : '';

        newNotifications.push({
          id: `notif-${Date.now()}-${order.id}-cancelled`,
          orderId: order.id,
          kind: 'cancelled',
          message: `Tu pedido ${order.id} fue cancelado por el casino.${reason}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (newNotifications.length === 0) {
      return;
    }

    writeStorageArray(
      notificationsKey,
      [
        ...newNotifications,
        ...currentNotifications,
      ]
    );
  }, [
    orders,
    username,
    notificationsKey,
    dismissedKey,
  ]);

  const markAsRead = (id: string) => {
    if (!notificationsKey) {
      return;
    }

    const current =
      parseStoredArray<OrderNotification>(
        readStorage(notificationsKey)
      );

    const updated = current.map(
      (notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
          : notification
    );

    writeStorageArray(
      notificationsKey,
      updated
    );
  };

  const markAllAsRead = () => {
    if (!notificationsKey) {
      return;
    }

    const current =
      parseStoredArray<OrderNotification>(
        readStorage(notificationsKey)
      );

    const updated = current.map(
      (notification) => ({
        ...notification,
        read: true,
      })
    );

    writeStorageArray(
      notificationsKey,
      updated
    );
  };

  const dismissNotification = (
    id: string
  ) => {
    if (
      !notificationsKey ||
      !dismissedKey
    ) {
      return;
    }

    const currentNotifications =
      parseStoredArray<OrderNotification>(
        readStorage(notificationsKey)
      );

    const target =
      currentNotifications.find(
        (notification) =>
          notification.id === id
      );

    if (!target) {
      return;
    }

    const dismissedEntry = `${target.orderId}:${kindOf(target)}`;

    const currentDismissed =
      parseStoredArray<string>(
        readStorage(dismissedKey)
      );

    if (!currentDismissed.includes(dismissedEntry)) {
      writeStorageArray(
        dismissedKey,
        [
          ...currentDismissed,
          dismissedEntry,
        ]
      );
    }

    writeStorageArray(
      notificationsKey,
      currentNotifications.filter(
        (notification) =>
          notification.id !== id
      )
    );
  };

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  };
}