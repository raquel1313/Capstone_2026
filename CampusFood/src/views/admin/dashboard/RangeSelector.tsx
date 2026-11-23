import { useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { chileToday, daysInRange, MAX_RANGE_DAYS } from '@/lib/dashboard/range';
import type { RangeSelection } from '@/hooks/useDashboard';
import type { RangePreset } from '@/lib/dashboard/types';

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'prev_month', label: 'Mes anterior' },
  { id: 'custom', label: 'Rango personalizado' },
];

/** Selector de período: todas las métricas del dashboard se recalculan con este rango. */
export function RangeSelector({
  value,
  onChange,
}: {
  value: RangeSelection;
  onChange: (next: RangeSelection) => void;
}) {
  const today = chileToday();
  const [from, setFrom] = useState(value.from || today);
  const [to, setTo] = useState(value.to || today);
  const [error, setError] = useState<string | null>(null);

  const choose = (preset: RangePreset) => {
    setError(null);

    if (preset === 'custom') {
      onChange({ preset, from, to });

      return;
    }

    onChange({ preset, from: '', to: '' });
  };

  const applyCustom = () => {
    if (!from || !to) {
      setError('Elige la fecha desde y la fecha hasta.');

      return;
    }

    if (to < from) {
      setError('La fecha hasta no puede ser anterior a la fecha desde.');

      return;
    }

    if (daysInRange(from, to) > MAX_RANGE_DAYS) {
      setError(`El rango no puede superar ${MAX_RANGE_DAYS} días.`);

      return;
    }

    setError(null);
    onChange({ preset: 'custom', from, to });
  };

  return (
    <div className="rounded-[24px] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Período del dashboard">
        <CalendarDays size={16} className="text-ink/65" aria-hidden="true" />

        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => choose(preset.id)}
            aria-pressed={value.preset === preset.id}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              value.preset === preset.id
                ? 'bg-brand text-white'
                : 'bg-brand-soft text-ink/65 hover:bg-ink/10'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-ink/65">
            Desde
            <input
              type="date"
              value={from}
              max={today}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 block rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>

          <label className="text-xs text-ink/65">
            Hasta
            <input
              type="date"
              value={to}
              max={today}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 block rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>

          <button
            type="button"
            onClick={applyCustom}
            className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
          >
            Aplicar
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
