import { useCallback, useEffect, useState } from 'react';

import type { Order } from '@/types';
import type { PenaltyStatus } from '@/utils/orderRules';

export type BlockedUser = {
  username: string;
  until: number;
  strikes: number;
};

type PenaltyResponse = {
  status?: PenaltyStatus;
  blocked?: BlockedUser[];
  error?: string;
};

type PenaltyState = {
  owner: string | null;
  status: PenaltyStatus;
  blocked: BlockedUser[];
};

const POLL_INTERVAL_MS = 30000;

const NO_PENALTY: PenaltyStatus = {
  strikes: 0,
  faults: [],
  isBlocked: false,
  blockedUntil: null,
};

/**
 * Faltas y bloqueos guardados en la base de datos. Se recalculan cuando cambian
 * los pedidos (por ejemplo, al cancelar fuera del plazo gratuito).
 */
export function usePenalties(userId: string | null, orders: Order[]) {
  const [state, setState] = useState<PenaltyState>({
    owner: null,
    status: NO_PENALTY,
    blocked: [],
  });

  const current = state.owner === userId ? state : { status: NO_PENALTY, blocked: [] };

  const apply = useCallback(
    (data: PenaltyResponse) => {
      if (!userId) {
        return;
      }

      setState({
        owner: userId,
        status: data.status ?? NO_PENALTY,
        blocked: data.blocked ?? [],
      });
    },
    [userId]
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const response = await fetch('/api/penalties', { cache: 'no-store' });

      if (response.ok) {
        apply((await response.json()) as PenaltyResponse);
      }
    } catch (error) {
      console.error('No se pudieron cargar las faltas:', error);
    }
  }, [userId, apply]);

  // Cambia cuando algún pedido cambia de estado.
  const ordersSignature = orders.map((order) => `${order.id}:${order.status}`).join(',');

  useEffect(() => {
    if (!userId) {
      return;
    }

    const timer = setTimeout(() => void refresh(), 0);

    return () => clearTimeout(timer);
  }, [userId, refresh, ordersSignature]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userId, refresh]);

  // Las faltas del usuario que inició sesión (el bloqueo lo valida también el servidor).
  const getStatus = (): PenaltyStatus => current.status;

  // Levanta el bloqueo y anula las faltas acumuladas hasta ahora.
  const liftBlock = async (username: string) => {
    try {
      const response = await fetch('/api/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lift', username }),
      });

      if (!response.ok) {
        throw new Error('No se pudo levantar el bloqueo.');
      }

      apply((await response.json()) as PenaltyResponse);
    } catch (error) {
      console.error(error);
      await refresh();
    }
  };

  return { getStatus, blockedUsers: current.blocked, liftBlock };
}
