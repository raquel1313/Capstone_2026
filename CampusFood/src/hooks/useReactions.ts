import { useCallback, useEffect, useState } from 'react';
import type { LunchDay } from '@/data';

export const REACTIONS = [
  { emoji: '👏', label: 'Excelente' },
  { emoji: '👍', label: 'Bueno' },
  { emoji: '🤏', label: 'Regular' },
  { emoji: '👎', label: 'Malo' },
];

// Peso de sentimiento por reacción, mismo orden que REACTIONS
export const SENTIMENT_WEIGHTS = [2, 1, -1, -2];

type ReactionCounts = Record<string, number>;

const POLL_INTERVAL_MS = 20000;

type ReactionsResponse = {
  counts?: Record<string, ReactionCounts>;
  mine?: Record<string, string>;
};

type ReactionsState = {
  owner: string | null;
  counts: Record<string, ReactionCounts>;
  mine: Record<string, string>;
};

function emptyCounts(): ReactionCounts {
  return REACTIONS.reduce((acc, r) => ({ ...acc, [r.emoji]: 0 }), {});
}

/**
 * Reacciones guardadas en la base de datos: una por usuario y plato.
 * `dishId` es el id del plato del menú (la oferta del día).
 */
export function useReactions(userId: string | null) {
  const [state, setState] = useState<ReactionsState>({ owner: null, counts: {}, mine: {} });

  const current: Pick<ReactionsState, 'counts' | 'mine'> =
    state.owner === userId ? state : { counts: {}, mine: {} };

  const apply = useCallback(
    (data: ReactionsResponse) => {
      if (!userId) {
        return;
      }

      setState({ owner: userId, counts: data.counts ?? {}, mine: data.mine ?? {} });
    },
    [userId]
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const response = await fetch('/api/reactions', { cache: 'no-store' });

      if (response.ok) {
        apply((await response.json()) as ReactionsResponse);
      }
    } catch (error) {
      console.error('No se pudieron cargar las reacciones:', error);
    }
  }, [userId, apply]);

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

  const getCounts = (dishId: string): ReactionCounts => ({
    ...emptyCounts(),
    ...(current.counts[dishId] ?? {}),
  });

  const getUserReaction = (dishId: string): string | null => current.mine[dishId] ?? null;

  // Tocar la misma reacción la quita; tocar otra reemplaza la anterior.
  const react = (dishId: string, emoji: string) => {
    if (!userId) {
      return;
    }

    const previous = current.mine[dishId] ?? null;
    const next = previous === emoji ? null : emoji;

    setState((existing) => {
      const base = existing.owner === userId ? existing : { owner: userId, counts: {}, mine: {} };
      const counts = { ...emptyCounts(), ...(base.counts[dishId] ?? {}) };

      if (previous) counts[previous] = Math.max(0, (counts[previous] ?? 0) - 1);
      if (next) counts[next] = (counts[next] ?? 0) + 1;

      const mine = { ...base.mine };

      if (next) {
        mine[dishId] = next;
      } else {
        delete mine[dishId];
      }

      return { owner: userId, counts: { ...base.counts, [dishId]: counts }, mine };
    });

    fetch('/api/reactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishId, emoji: next }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('No se pudo guardar la reacción.');
        }

        apply((await response.json()) as ReactionsResponse);
      })
      .catch((error) => {
        console.error(error);
        void refresh();
      });
  };

  return { getCounts, getUserReaction, react };
}

function dishScore(counts: ReactionCounts) {
  return REACTIONS.reduce(
    (sum, r, i) => sum + (counts[r.emoji] ?? 0) * SENTIMENT_WEIGHTS[i],
    0
  );
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export type DishAggregate = {
  name: string;
  score: number;
  total: number;
};

// Junta las reacciones de todos los platos con el mismo nombre (sin importar la semana),
// para un ranking histórico real. Se usa fuera de React, así que recibe getCounts como parámetro.
export function aggregateReactionsByDishName(
  menu: LunchDay[],
  getCounts: (dishId: string) => ReactionCounts
): DishAggregate[] {
  const map = new Map<string, DishAggregate>();

  menu.forEach((day) => {
    day.dishes.forEach((dish) => {
      const counts = getCounts(dish.id);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (total === 0) return;

      const key = normalizeName(dish.name);
      const entry = map.get(key) ?? { name: dish.name, score: 0, total: 0 };
      entry.score += dishScore(counts);
      entry.total += total;
      map.set(key, entry);
    });
  });

  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

export type DayScoreResult = {
  total: number;
  score: number;
  bestDish: { name: string; score: number } | null;
};

export function dayScoreAndBestDish(
  day: LunchDay,
  getCounts: (dishId: string) => ReactionCounts
): DayScoreResult {
  let total = 0;
  let score = 0;
  let bestDish: DayScoreResult['bestDish'] = null;

  day.dishes.forEach((dish) => {
    const counts = getCounts(dish.id);
    const dishTotal = Object.values(counts).reduce((a, b) => a + b, 0);
    const s = dishScore(counts);

    total += dishTotal;
    score += s;

    if (dishTotal > 0 && (!bestDish || s > bestDish.score)) {
      bestDish = { name: dish.name, score: s };
    }
  });

  return { total, score, bestDish };
}