import { useEffect, useState } from 'react';

import type { Dish, LunchDay } from '@/data';

import { lunchDays as defaultLunchDays } from '@/data';

const STORAGE_KEY = 'campusfood_menu';

function normalizeMenu(days: LunchDay[]): LunchDay[] {
  return days.map((day) => ({
    ...day,
    dishes: Array.isArray(day.dishes) ? day.dishes : [],
  }));
}

function loadMenu(): LunchDay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return normalizeMenu(defaultLunchDays);
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return normalizeMenu(defaultLunchDays);
    }

    return normalizeMenu(parsed);
  } catch {
    return normalizeMenu(defaultLunchDays);
  }
}

function sortByDate(days: LunchDay[]) {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

export function useMenu() {
  const [menu, setMenu] = useState<LunchDay[]>(() =>
    sortByDate(loadMenu())
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menu));
  }, [menu]);

  // --- Días ---

  const addDay = (date: string) => {
    const newDay: LunchDay = {
      id: `day-${Date.now()}`,
      date,
      dishes: [],
    };

    setMenu((current) => sortByDate([...current, newDay]));
  };

  const updateDayDate = (dayId: string, date: string) => {
    setMenu((current) =>
      sortByDate(
        current.map((day) =>
          day.id === dayId ? { ...day, date } : day
        )
      )
    );
  };

  const removeDay = (dayId: string) => {
    setMenu((current) =>
      current.filter((day) => day.id !== dayId)
    );
  };

  // --- Platos dentro de un día ---

  const addDish = (dayId: string, dish: Omit<Dish, 'id'>) => {
    setMenu((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              dishes: [
                ...(day.dishes ?? []),
                {
                  ...dish,
                  id: `dish-${Date.now()}`,
                },
              ],
            }
          : day
      )
    );
  };

  const updateDish = (
    dayId: string,
    dishId: string,
    updates: Partial<Dish>
  ) => {
    setMenu((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              dishes: (day.dishes ?? []).map((dish) =>
                dish.id === dishId
                  ? { ...dish, ...updates }
                  : dish
              ),
            }
          : day
      )
    );
  };

  const removeDish = (dayId: string, dishId: string) => {
    setMenu((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              dishes: (day.dishes ?? []).filter(
                (dish) => dish.id !== dishId
              ),
            }
          : day
      )
    );
  };

  const toggleSoldOut = (dayId: string, dishId: string) => {
    setMenu((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              dishes: (day.dishes ?? []).map((dish) =>
                dish.id === dishId
                  ? {
                      ...dish,
                      soldOut: !dish.soldOut,
                    }
                  : dish
              ),
            }
          : day
      )
    );
  };

  const resetMenu = () =>
    setMenu(sortByDate(normalizeMenu(defaultLunchDays)));

  return {
    menu,
    addDay,
    updateDayDate,
    removeDay,
    addDish,
    updateDish,
    removeDish,
    toggleSoldOut,
    resetMenu,
  };
}