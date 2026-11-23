import { useCallback, useEffect, useState } from 'react';

import type {
  DashboardSummary,
  OrdersDashboard,
  ProductsDashboard,
  RangePreset,
} from '@/lib/dashboard/types';

export type RangeSelection = { preset: RangePreset; from: string; to: string };

export type DashboardData = {
  summary: DashboardSummary;
  orders: OrdersDashboard;
  products: ProductsDashboard;
};

type DashboardState = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
};

function queryFor(selection: RangeSelection): string {
  const params = new URLSearchParams({ preset: selection.preset });

  if (selection.preset === 'custom') {
    params.set('from', selection.from);
    params.set('to', selection.to);
  }

  return params.toString();
}

async function fetchJson<T>(path: string, query: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${path}?${query}`, { cache: 'no-store', signal });

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'No fue posible cargar el dashboard.';

    throw new Error(message);
  }

  return body as T;
}

/**
 * Pide al servidor las métricas ya agregadas del rango elegido (3 consultas en paralelo).
 * El navegador nunca recibe la lista de pedidos.
 */
export function useDashboard(selection: RangeSelection) {
  const [state, setState] = useState<DashboardState>({ data: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  const { preset, from, to } = selection;

  useEffect(() => {
    const controller = new AbortController();
    const query = queryFor({ preset, from, to });

    // El indicador de carga se activa de forma diferida (no dentro del cuerpo del efecto).
    const start = setTimeout(() => {
      setState((current) => ({ ...current, loading: true, error: null }));
    }, 0);

    Promise.all([
      fetchJson<DashboardSummary>('/api/admin/dashboard/summary', query, controller.signal),
      fetchJson<OrdersDashboard>('/api/admin/dashboard/orders', query, controller.signal),
      fetchJson<ProductsDashboard>('/api/admin/dashboard/products', query, controller.signal),
    ])
      .then(([summary, orders, products]) => {
        setState({ data: { summary, orders, products }, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'No fue posible cargar el dashboard.',
        }));
      });

    return () => {
      clearTimeout(start);
      controller.abort();
    };
  }, [preset, from, to, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, reload };
}
