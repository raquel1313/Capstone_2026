import { ServiceError } from '@/lib/services/errors';
import type { DateRange, RangePreset, ResolvedRange } from '@/lib/dashboard/types';

export const DASHBOARD_TIME_ZONE = 'America/Santiago';
export const MAX_RANGE_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const toUtc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(iso: string, amount: number): string {
  return toIso(new Date(toUtc(iso).getTime() + amount * DAY_MS));
}

/** Cantidad de días del rango, contando ambos extremos. */
export function daysInRange(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS) + 1;
}

/** Fecha de hoy en Chile (AAAA-MM-DD), independiente de la zona horaria del servidor. */
export function chileToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DASHBOARD_TIME_ZONE }).format(now);
}

function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function endOfMonth(iso: string): string {
  const date = toUtc(startOfMonth(iso));

  return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

function previousMonthStart(iso: string): string {
  const date = toUtc(startOfMonth(iso));

  return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
}

export function parseIsoDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value) || toIso(toUtc(value)) !== value) {
    throw new ServiceError(400, 'INVALID_DATE', `La fecha "${field}" debe tener formato AAAA-MM-DD.`);
  }

  return value;
}

export const PRESETS: readonly RangePreset[] = ['today', '7d', '30d', 'month', 'prev_month', 'custom'];

export function isPreset(value: unknown): value is RangePreset {
  return typeof value === 'string' && (PRESETS as readonly string[]).includes(value);
}

const LABELS: Record<RangePreset, string> = {
  today: 'Hoy',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  month: 'Este mes',
  prev_month: 'Mes anterior',
  custom: 'Rango personalizado',
};

/**
 * Convierte el preset (o fechas personalizadas) en un rango concreto y calcula el período
 * contra el que se compara. Las comparaciones son reales:
 *  - hoy / 7 / 30 días / personalizado: el mismo número de días inmediatamente anteriores;
 *  - este mes / mes anterior: el mismo tramo (primeros N días) del mes previo.
 */
export function resolveRange(
  input: { preset?: unknown; from?: unknown; to?: unknown },
  now: Date = new Date(),
): ResolvedRange {
  const preset = input.preset === undefined ? '7d' : input.preset;

  if (!isPreset(preset)) {
    throw new ServiceError(400, 'INVALID_PRESET', 'El período seleccionado no es válido.');
  }

  const today = chileToday(now);
  let from: string;
  let to: string;

  switch (preset) {
    case 'today':
      from = to = today;
      break;
    case '7d':
      from = addDays(today, -6);
      to = today;
      break;
    case '30d':
      from = addDays(today, -29);
      to = today;
      break;
    case 'month':
      from = startOfMonth(today);
      to = today;
      break;
    case 'prev_month':
      from = previousMonthStart(today);
      to = endOfMonth(from);
      break;
    case 'custom':
      from = parseIsoDate(input.from, 'desde');
      to = parseIsoDate(input.to, 'hasta');
      break;
  }

  if (to < from) {
    throw new ServiceError(400, 'INVALID_RANGE', 'La fecha "hasta" no puede ser anterior a "desde".');
  }

  const days = daysInRange(from, to);

  if (days > MAX_RANGE_DAYS) {
    throw new ServiceError(400, 'RANGE_TOO_LARGE', `El rango no puede superar ${MAX_RANGE_DAYS} días.`);
  }

  let previous: DateRange;
  let previousLabel: string;

  if (preset === 'month' || preset === 'prev_month') {
    const prevStart = previousMonthStart(from);
    const prevEndLimit = endOfMonth(prevStart);
    const candidateEnd = addDays(prevStart, days - 1);

    previous = { from: prevStart, to: candidateEnd < prevEndLimit ? candidateEnd : prevEndLimit };
    previousLabel = preset === 'month' ? 'mismo tramo del mes anterior' : 'el mes previo';
  } else {
    previous = { from: addDays(from, -days), to: addDays(from, -1) };
    previousLabel =
      preset === 'today' ? 'ayer' : days === 1 ? 'el día anterior' : `${days} días anteriores`;
  }

  return {
    preset,
    from,
    to,
    days,
    label: LABELS[preset],
    previous,
    previousDays: daysInRange(previous.from, previous.to),
    previousLabel,
  };
}
