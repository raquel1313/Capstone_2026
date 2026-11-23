/** Formato y comparaciones del dashboard (es-CL). Funciones puras, sin dependencias. */

const NUMBER = new Intl.NumberFormat('es-CL');
const DECIMAL = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

export const formatInt = (value: number) => NUMBER.format(Math.round(value));
export const formatDecimal = (value: number) => DECIMAL.format(value);
export const formatMoney = (value: number) => `$${NUMBER.format(Math.round(value))}`;
export const formatPercent = (ratio: number) => `${DECIMAL.format(ratio * 100)} %`;

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) {
    return 'Sin datos';
  }

  if (minutes < 1) {
    return 'menos de 1 min';
  }

  if (minutes < 90) {
    return `${DECIMAL.format(minutes)} min`;
  }

  return `${DECIMAL.format(minutes / 60)} h`;
}

export type Comparison =
  | { kind: 'no-data' }
  | { kind: 'new' }
  | { kind: 'same' }
  | { kind: 'change'; pct: number; direction: 'up' | 'down' };

/**
 * Variación porcentual real entre dos períodos. Si el período anterior no tiene datos
 * no se inventa un porcentaje.
 */
export function compare(current: number, previous: number): Comparison {
  if (previous === 0) {
    return current === 0 ? { kind: 'no-data' } : { kind: 'new' };
  }

  if (current === previous) {
    return { kind: 'same' };
  }

  const pct = ((current - previous) / previous) * 100;

  return { kind: 'change', pct, direction: pct > 0 ? 'up' : 'down' };
}

export function formatComparison(result: Comparison, previousLabel: string): string {
  switch (result.kind) {
    case 'no-data':
      return `Sin datos ni en ${previousLabel}`;
    case 'new':
      return `Sin pedidos en ${previousLabel} para comparar`;
    case 'same':
      return `Igual que ${previousLabel}`;
    case 'change':
      return `${result.pct > 0 ? '+' : '−'}${DECIMAL.format(Math.abs(result.pct))} % vs. ${previousLabel}`;
  }
}

/** Tasa (0-1) o null si no hay base para calcularla. */
export const ratio = (part: number, whole: number): number | null =>
  whole > 0 ? part / whole : null;
