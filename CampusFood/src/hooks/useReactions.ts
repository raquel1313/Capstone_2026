import { useEffect, useState } from 'react';

export const REACTIONS = [
  { emoji: '❤️‍🔥', label: 'Excelente' },
  { emoji: '🤩', label: 'Bueno' },
  { emoji: '😼', label: 'Regular' },
  { emoji: '😿', label: 'Wakala' },
];

type ReactionCounts = Record<string, number>;
type ReactionsByDay = Record<string, ReactionCounts>; // clave: day.id

const COUNTS_KEY = 'campusfood_reactions'; // compartido entre estudiantes y admin
const USER_KEY = 'campusfood_user_reactions'; // qué eligió este navegador, por día

function emptyCounts(): ReactionCounts {
  return REACTIONS.reduce((acc, r) => ({ ...acc, [r.emoji]: 0 }), {});
}

function loadCounts(): ReactionsByDay {
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
  const [countsByDay, setCountsByDay] = useState<ReactionsByDay>(() => loadCounts());
  const [userReactions, setUserReactions] = useState<Record<string, string | null>>(() => loadUserReactions());

  useEffect(() => {
    localStorage.setItem(COUNTS_KEY, JSON.stringify(countsByDay));
  }, [countsByDay]);

  useEffect(() => {
    localStorage.setItem(USER_KEY, JSON.stringify(userReactions));
  }, [userReactions]);

  const getCounts = (dayId: string): ReactionCounts => countsByDay[dayId] ?? emptyCounts();
  const getUserReaction = (dayId: string): string | null => userReactions[dayId] ?? null;

  const react = (dayId: string, emoji: string) => {
    const current = getUserReaction(dayId);
    setCountsByDay((prev) => {
      const counts = { ...(prev[dayId] ?? emptyCounts()) };
      if (current === emoji) {
        counts[emoji] = Math.max(0, counts[emoji] - 1);
      } else {
        if (current) counts[current] = Math.max(0, counts[current] - 1);
        counts[emoji] = counts[emoji] + 1;
      }
      return { ...prev, [dayId]: counts };
    });
    setUserReactions((prev) => ({ ...prev, [dayId]: current === emoji ? null : emoji }));
  };

  return { getCounts, getUserReaction, react };
}