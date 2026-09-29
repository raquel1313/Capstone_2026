import { useEffect, useState } from 'react';
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
type ReactionsByDish = Record<string, ReactionCounts>; // clave: dish.id

const COUNTS_KEY = 'campusfood_reactions_v2'; // v2: ahora se indexa por plato, no por día
const USER_KEY = 'campusfood_user_reactions_v2';

function emptyCounts(): ReactionCounts {
  return REACTIONS.reduce((acc, r) => ({ ...acc, [r.emoji]: 0 }), {});
}

function loadCounts(): ReactionsByDish {
  try {
    const raw = localStorage.getItem(COUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadUserReactions(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useReactions() {
  const [countsByDish, setCountsByDish] = useState<ReactionsByDish>(() => loadCounts());
  const [userReactions, setUserReactions] = useState<Record<string, string | null>>(() => loadUserReactions());

  useEffect(() => {
    localStorage.setItem(COUNTS_KEY, JSON.stringify(countsByDish));
  }, [countsByDish]);

  useEffect(() => {
    localStorage.setItem(USER_KEY, JSON.stringify(userReactions));
  }, [userReactions]);

  const getCounts = (dishId: string): ReactionCounts => countsByDish[dishId] ?? emptyCounts();
  const getUserReaction = (dishId: string): string | null => userReactions[dishId] ?? null;

  const react = (dishId: string, emoji: string) => {
    const current = getUserReaction(dishId);
    setCountsByDish((prev) => {
      const counts = { ...(prev[dishId] ?? emptyCounts()) };
      if (current === emoji) {
        counts[emoji] = Math.max(0, counts[emoji] - 1);
      } else {
        if (current) counts[current] = Math.max(0, counts[current] - 1);
        counts[emoji] = counts[emoji] + 1;
      }
      return { ...prev, [dishId]: counts };
    });
    setUserReactions((prev) => ({ ...prev, [dishId]: current === emoji ? null : emoji }));
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