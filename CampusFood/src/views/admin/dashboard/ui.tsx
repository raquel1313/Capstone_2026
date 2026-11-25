import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { compare, formatComparison, type Comparison } from '@/lib/dashboard/format';

export const NO_DATA_MESSAGE = 'No existen suficientes datos para calcular este indicador.';

export function Card({
  title,
  subtitle,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-[24px] bg-white p-5 sm:p-6 ${className}`}>
      {title && (
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/65">{title}</h3>
      )}
      {subtitle && <p className="mt-1 text-xs text-ink/65">{subtitle}</p>}
      <div className={title ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}

export function EmptyData({ message = NO_DATA_MESSAGE }: { message?: string }) {
  return <p className="py-6 text-center text-sm text-ink/65">{message}</p>;
}

/** Variación contra el período anterior. Si no hay base de comparación, lo dice. */
export function Delta({
  current,
  previous,
  previousLabel,
  // En métricas donde subir es malo (ej. cancelaciones) se invierte el color.
  goodWhen = 'up',
  tone = 'light',
  // false = el período anterior tiene muy pocos datos: un porcentaje sería engañoso.
  enough = true,
}: {
  current: number;
  previous: number;
  previousLabel: string;
  goodWhen?: 'up' | 'down' | 'neutral';
  tone?: 'light' | 'dark';
  enough?: boolean;
}) {
  const result: Comparison = compare(current, previous);
  const muted = tone === 'dark' ? 'text-white/60' : 'text-ink/65';

  if (!enough) {
    return <span className={`text-xs ${muted}`}>Pocos pedidos en {previousLabel} para comparar</span>;
  }

  if (result.kind !== 'change') {
    return <span className={`text-xs ${muted}`}>{formatComparison(result, previousLabel)}</span>;
  }

  const good = goodWhen === 'neutral' ? null : result.direction === goodWhen;
  const color =
    good === null
      ? muted
      : good
        ? tone === 'dark'
          ? 'text-emerald-300'
          : 'text-emerald-700'
        : tone === 'dark'
          ? 'text-red-300'
          : 'text-red-700';

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      {result.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {formatComparison(result, previousLabel)}
    </span>
  );
}

export type BarDatum = { key: string; label: string; value: number; title?: string; muted?: boolean };

/** Gráfico de barras verticales simple (sin dependencias). Cada barra muestra su valor. */
export function BarChart({
  data,
  ariaLabel,
  height = 140,
  labelEvery = 1,
}: {
  data: BarDatum[];
  ariaLabel: string;
  height?: number;
  // Muestra una etiqueta de cada N barras (para rangos largos).
  labelEvery?: number;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div role="img" aria-label={ariaLabel} className="w-full overflow-x-auto">
      <div className="flex items-end gap-1" style={{ height, minWidth: data.length * 18 }}>
        {data.map((item) => (
          <div
            key={item.key}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
            title={item.title ?? `${item.label}: ${item.value}`}
          >
            {data.length <= 16 && (
              <span className="mb-0.5 text-center text-[10px] font-medium text-ink/65">
                {item.value > 0 ? item.value : ''}
              </span>
            )}
            <div
              className={`w-full rounded-t ${item.muted ? 'bg-ink/20' : 'bg-brand'}`}
              style={{ height: `${item.value > 0 ? Math.max(4, (item.value / max) * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-1 flex gap-1" style={{ minWidth: data.length * 18 }}>
        {data.map((item, index) => (
          <span key={item.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-ink/65">
            {index % labelEvery === 0 ? item.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

export type RowDatum = { key: string; label: string; value: number; detail?: string };

/** Barras horizontales ordenadas, con el valor y un detalle a la derecha. */
export function HorizontalBars({ rows, unit }: { rows: RowDatum[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{row.label}</span>
            <span className="shrink-0 text-xs text-ink/65">
              {row.value}
              {unit ? ` ${unit}` : ''}
              {row.detail ? ` · ${row.detail}` : ''}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${row.value > 0 ? Math.max(3, (row.value / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Metric({
  label,
  value,
  caption,
  footer,
  dark = false,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  footer?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col justify-between rounded-2xl p-5 ${
        dark ? 'bg-brand text-white' : 'bg-white'
      }`}
    >
      <p className={`text-xs ${dark ? 'text-white/65' : 'text-ink/65'}`}>{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight">{value}</p>
      {caption && <p className={`mt-1 text-[11px] ${dark ? 'text-white/55' : 'text-ink/65'}`}>{caption}</p>}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}