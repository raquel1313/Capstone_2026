
import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import type { LunchDay } from '@/data';
import type { VotePoll } from '@/hooks/useVotes';
import { useDashboard, type RangeSelection } from '@/hooks/useDashboard';
import { buildInsights } from '@/lib/dashboard/insights';

import { CancellationsPanel, PenaltiesPanel } from '@/views/admin/dashboard/CancellationsPanel';
import { DemandPanel } from '@/views/admin/dashboard/DemandPanel';
import { InsightsPanel } from '@/views/admin/dashboard/InsightsPanel';
import { MenuAndPollsSection } from '@/views/admin/dashboard/MenuAndPollsSection';
import { OperationsPanel } from '@/views/admin/dashboard/OperationsPanel';
import { OrdersKpis } from '@/views/admin/dashboard/OrdersKpis';
import { ProductsPanel } from '@/views/admin/dashboard/ProductsPanel';
import { RangeSelector } from '@/views/admin/dashboard/RangeSelector';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return (parts[0]?.[0] ?? '').concat(parts[1]?.[0] ?? '').toUpperCase() || 'A';
}

const formatLongDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Dashboard administrativo. Todas las métricas de pedidos salen de agregaciones del
 * servidor para el rango elegido; aquí solo se presentan.
 */
export function AdminDashboardView({
  menu,
  getReactionCounts,
  poll,
  isPollOpen,
  pollHistory,
  adminName,
}: {
  menu: LunchDay[];
  getReactionCounts: (dishId: string) => Record<string, number>;
  poll: VotePoll | null;
  isPollOpen: boolean;
  pollHistory: VotePoll[];
  adminName: string;
}) {
  const [selection, setSelection] = useState<RangeSelection>({ preset: '7d', from: '', to: '' });

  const { data, loading, error, reload } = useDashboard(selection);

  const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);

  const range = data?.summary.range;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink/65">Panel administrativo</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Bienvenido de nuevo, {adminName}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-ink/65 transition hover:bg-brand-soft hover:text-brand disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>

          <div className="grid h-11 w-11 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
            {getInitials(adminName)}
          </div>
        </div>
      </div>

      <RangeSelector value={selection} onChange={setSelection} />

      {range && (
        <p className="text-xs text-ink/65">
          {range.label}: del {formatLongDate(range.from)} al {formatLongDate(range.to)} ({range.days}{' '}
          {range.days === 1 ? 'día' : 'días'}, hora de Chile). Se compara con {range.previousLabel} (
          {formatLongDate(range.previous.from)} al {formatLongDate(range.previous.to)}).
        </p>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {!data && loading && <p className="py-10 text-center text-sm text-ink/65">Calculando métricas...</p>}

      {data && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <InsightsPanel insights={insights} />
          <OrdersKpis summary={data.summary} />
          <DemandPanel data={data.orders} />
          <ProductsPanel data={data.products} />
          <OperationsPanel data={data.orders} />
          <CancellationsPanel summary={data.summary} />
          <PenaltiesPanel summary={data.summary} />

          <MenuAndPollsSection
            menu={menu}
            getReactionCounts={getReactionCounts}
            poll={poll}
            isPollOpen={isPollOpen}
            pollHistory={pollHistory}
            rangeFrom={data.summary.range.from}
            rangeTo={data.summary.range.to}
            rangeLabel={data.summary.range.label}
          />
        </div>
      )}
    </div>
  );
}
