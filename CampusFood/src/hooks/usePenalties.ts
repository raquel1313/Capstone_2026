import { useEffect, useMemo, useState } from 'react';
import type { Order } from '@/types';
import { computePenaltyStatus, type PenaltyStatus } from '@/utils/orderRules';

const AMNESTY_KEY = 'campusfood_penalty_amnesty';

export type BlockedUser = {
  username: string;
  until: number;
  strikes: number;
};

function loadAmnesty(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AMNESTY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function usePenalties(orders: Order[]) {
  const [amnesty, setAmnesty] = useState<Record<string, string>>(() => loadAmnesty());

  useEffect(() => {
    localStorage.setItem(AMNESTY_KEY, JSON.stringify(amnesty));
  }, [amnesty]);

  const getStatus = (username: string): PenaltyStatus =>
    computePenaltyStatus(orders, username, amnesty[username]);

  const blockedUsers = useMemo<BlockedUser[]>(() => {
    const usernames = Array.from(
      new Set(
        orders
          .map((order) => order.username)
          .filter((username): username is string => Boolean(username))
      )
    );

    const blocked: BlockedUser[] = [];

    for (const username of usernames) {
      const status = computePenaltyStatus(orders, username, amnesty[username]);

      if (status.isBlocked && status.blockedUntil !== null) {
        blocked.push({
          username,
          until: status.blockedUntil,
          strikes: status.strikes,
        });
      }
    }

    return blocked;
  }, [orders, amnesty]);

  // Levanta el bloqueo y borra las faltas acumuladas hasta ahora
  const liftBlock = (username: string) => {
    setAmnesty((current) => ({
      ...current,
      [username]: new Date().toISOString(),
    }));
  };

  return { getStatus, blockedUsers, liftBlock };
}