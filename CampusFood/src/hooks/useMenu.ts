import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Dish, LunchDay } from '@/data';

const POLL_INTERVAL_MS = 30000;

type MenuResponse = { days?: LunchDay[]; error?: string };

async function requestMenu(init?: RequestInit): Promise<LunchDay[]> {
  const response = await fetch('/api/menu', {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  let data: MenuResponse = {};

  try {
    data = (await response.json()) as MenuResponse;
  } catch {
    data = {};
  }

  if (!response.ok || !data.days) {
    throw new Error(data.error ?? 'No fue posible actualizar el menú.');
  }

  return data.days;
}

const dayDate = (dayId: string) => dayId.replace(/^day-/, '');

function sortByDate(days: LunchDay[]) {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Evalúa si una fecha en texto (YYYY-MM-DD o ISO) corresponde a un día hábil 
 * (Lunes a Viernes) dentro de la semana actual.
 */
function isCurrentWeekDay(dateStr: string): boolean {
  // Aseguramos el parseo seguro dividiendo YYYY-MM-DD
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) return false;
  
  const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  targetDate.setHours(0, 0, 0, 0);

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb

  // Calcular el Lunes de la semana en curso (si hoy es domingo = -6)
  const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Calcular el Viernes de la semana en curso
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  const day = targetDate.getDay();
  const isWeekDay = day >= 1 && day <= 5;
  const isInRange = targetDate >= monday && targetDate <= friday;

  return isWeekDay && isInRange;
}

/**
 * Menú semanal guardado en la base de datos. Un día solo existe en el servidor
 * mientras tenga platos; un día recién agregado y vacío vive en pantalla hasta
 * que se le agrega el primer plato.
 */
export function useMenu(userId: string | null) {
  const [loaded, setLoaded] = useState<{ owner: string | null; days: LunchDay[] }>({
    owner: null,
    days: [],
  });
  const [emptyDates, setEmptyDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const serverDays = useMemo(
    () => (loaded.owner === userId ? loaded.days : []),
    [loaded, userId]
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const days = await requestMenu();

      setLoaded({ owner: userId, days });
    } catch (requestError) {
      console.error('No se pudo cargar el menú:', requestError);
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

  const menu = useMemo(() => {
    const known = new Set(serverDays.map((day) => day.date));
    const extra = emptyDates
      .filter((date) => !known.has(date))
      .map((date): LunchDay => ({ id: `day-${date}`, date, dishes: [] }));

    const allDays = sortByDate([...serverDays, ...extra]);

    // Filtrar para retornar únicamente Lunes a Viernes de la semana actual
    return allDays.filter((day) => isCurrentWeekDay(day.date));
  }, [serverDays, emptyDates]);

  // Aplica un cambio en el servidor y muestra el error si falla.
  const mutate = async (body: Record<string, unknown>) => {
    try {
      const days = await requestMenu({ method: 'POST', body: JSON.stringify(body) });

      if (userId) {
        setLoaded({ owner: userId, days });
      }

      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible actualizar el menú.'
      );
    }
  };

  // --- Días ---

  const addDay = (date: string) => {
    setEmptyDates((current) => (current.includes(date) ? current : [...current, date]));
  };

  const updateDayDate = async (dayId: string, date: string) => {
    const from = dayDate(dayId);
    const hasDishes = serverDays.some((day) => day.id === dayId);

    setEmptyDates((current) => current.map((value) => (value === from ? date : value)));

    if (hasDishes) {
      await mutate({ action: 'moveDay', from, to: date });
    }
  };

  const removeDay = async (dayId: string) => {
    const date = dayDate(dayId);

    setEmptyDates((current) => current.filter((value) => value !== date));

    if (serverDays.some((day) => day.id === dayId)) {
      await mutate({ action: 'removeDay', date });
    }
  };

  // --- Platos dentro de un día ---

  const addDish = async (dayId: string, dish: Omit<Dish, 'id'>) => {
    await mutate({
      action: 'addDish',
      date: dayDate(dayId),
      name: dish.name,
      detail: dish.detail,
      color: dish.color,
      image: typeof dish.image === 'string' ? dish.image : '',
      soldOut: dish.soldOut ?? false,
    });
  };

  const updateDish = async (_dayId: string, dishId: string, updates: Partial<Dish>) => {
    await mutate({
      action: 'updateDish',
      id: dishId,
      name: updates.name,
      detail: updates.detail,
      color: updates.color,
      image: typeof updates.image === 'string' ? updates.image : undefined,
      soldOut: updates.soldOut,
    });
  };

  const removeDish = async (_dayId: string, dishId: string) => {
    await mutate({ action: 'removeDish', id: dishId });
  };

  const toggleSoldOut = async (dayId: string, dishId: string) => {
    const dish = serverDays
      .find((day) => day.id === dayId)
      ?.dishes.find((candidate) => candidate.id === dishId);

    await mutate({ action: 'updateDish', id: dishId, soldOut: !dish?.soldOut });
  };

  // "Restaurar" vuelve a cargar el menú guardado y descarta días vacíos sin guardar.
  const resetMenu = async () => {
    setEmptyDates([]);
    await refresh();
  };

  return {
    menu,
    error,
    clearError: () => setError(null),
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