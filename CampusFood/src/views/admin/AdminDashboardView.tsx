import { useMemo, useState } from 'react';

import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Medal,
  ShoppingBag,
  Smile,
  TrendingDown,
  TrendingUp,
  Vote,
} from 'lucide-react';

import type { LunchDay } from '@/data';
import type { Order } from '@/types';

import type { VotePoll } from '@/hooks/useVotes';

import {
  aggregateReactionsByDishName,
  dayScoreAndBestDish,
} from '@/hooks/useReactions';

function toLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

type OptionStat = {
  label: string;
  appearances: number;
  wins: number;
  totalVotes: number;
};

function computeOptionStats(history: VotePoll[]): OptionStat[] {
  const map = new Map<string, OptionStat>();

  history.forEach((poll) => {
    const maxVotes = Math.max(0, ...poll.options.map((o) => o.votes));

    poll.options.forEach((option) => {
      const key = option.label.trim().toLowerCase();
      const entry = map.get(key) ?? { label: option.label, appearances: 0, wins: 0, totalVotes: 0 };

      entry.appearances += 1;
      entry.totalVotes += option.votes;

      if (option.votes > 0 && option.votes === maxVotes) {
        entry.wins += 1;
      }

      map.set(key, entry);
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => b.wins - a.wins || b.appearances - a.appearances
  );
}

type ProductStat = { id: number; name: string; quantity: number };

function computeTopProducts(orders: Order[], startISO: string, endISO: string): ProductStat[] {
  const map = new Map<number, ProductStat>();

  orders.forEach((order) => {
    const orderDate = toLocalISO(new Date(order.createdAt));
    if (orderDate < startISO || orderDate > endISO) return;

    order.items.forEach((item) => {
      const entry = map.get(item.id) ?? { id: item.id, name: item.name, quantity: 0 };
      entry.quantity += item.quantity;
      map.set(item.id, entry);
    });
  });

  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
}

function PeriodDelta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    if (current === 0) {
      return <span className="text-xs text-white/50">Sin datos el mes anterior</span>;
    }
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-white/80">
        <TrendingUp size={12} /> Nuevo este mes
      </span>
    );
  }

  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);

  if (diff === 0) {
    return <span className="text-xs text-white/60">Igual que el mes anterior</span>;
  }

  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${
        diff > 0 ? 'text-[#8fe3a8]' : 'text-[#f3a5a5]'
      }`}
    >
      {diff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {diff > 0 ? '+' : ''}
      {pct}% vs. mes anterior
    </span>
  );
}

export function AdminDashboardView({
  menu,
  getReactionCounts,
  poll,
  isPollOpen,
  pollHistory,
  orders,
  adminName,
}: {
  menu: LunchDay[];
  getReactionCounts: (dishId: string) => Record<string, number>;
  poll: VotePoll | null;
  isPollOpen: boolean;
  pollHistory: VotePoll[];
  orders: Order[];
  adminName: string;
}) {
  // Arranca en el mes del primer día del menú que tenga datos, o en el mes de hoy si no hay ninguno
  // Arranca en el mes con actividad real más reciente, priorizando pedidos
  // (que usan la fecha real del sistema) por sobre el menú de ejemplo
  // (que suele tener fechas fijas que no calzan con "hoy").
  const [anchor, setAnchor] = useState(() => {
    if (orders.length > 0) {
      const mostRecentOrder = [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      return new Date(mostRecentOrder.createdAt);
    }

    const withReactions = menu.find((day) => {
      const { total } = dayScoreAndBestDish(day, getReactionCounts);
      return total > 0;
    });

    if (withReactions) return new Date(withReactions.date + 'T00:00:00');
    if (menu.length > 0) return new Date(menu[0].date + 'T00:00:00');

    return new Date();
  });

  const monthLabel = capitalize(
    anchor.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  );

  const rangeStart = startOfMonth(anchor);
  const rangeStartISO = toLocalISO(rangeStart);
  const rangeEndISO = toLocalISO(endOfMonth(anchor));

  const prevAnchor = addMonths(anchor, -1);
  const prevRangeStartISO = toLocalISO(startOfMonth(prevAnchor));
  const prevRangeEndISO = toLocalISO(endOfMonth(prevAnchor));

  const monthDays = useMemo(
    () =>
      menu
        .filter((day) => day.date >= rangeStartISO && day.date <= rangeEndISO)
        .map((day) => ({ day, ...dayScoreAndBestDish(day, getReactionCounts) }))
        .sort((a, b) => a.day.date.localeCompare(b.day.date)),
    [menu, rangeStartISO, rangeEndISO, getReactionCounts]
  );

  const prevMonthDays = useMemo(
    () =>
      menu
        .filter((day) => day.date >= prevRangeStartISO && day.date <= prevRangeEndISO)
        .map((day) => dayScoreAndBestDish(day, getReactionCounts)),
    [menu, prevRangeStartISO, prevRangeEndISO, getReactionCounts]
  );

  const monthTotal = monthDays.reduce((sum, d) => sum + d.total, 0);
  const prevMonthTotal = prevMonthDays.reduce((sum, d) => sum + d.total, 0);

  const bestOfMonth = [...monthDays].filter((d) => d.total > 0).sort((a, b) => b.score - a.score)[0] ?? null;

  // Días del mes con datos, ordenados de mejor a peor puntaje
  const rankedMonthDays = useMemo(
    () => [...monthDays].filter((d) => d.total > 0).sort((a, b) => b.score - a.score),
    [monthDays]
  );

  const maxDayScore = Math.max(1, ...rankedMonthDays.map((d) => Math.abs(d.score)));

  // Ranking histórico de platos, sin depender del mes seleccionado
  const topDishes = useMemo(
    () => aggregateReactionsByDishName(menu, getReactionCounts).slice(0, 8),
    [menu, getReactionCounts]
  );

  const maxDishScore = Math.max(1, ...topDishes.map((d) => Math.abs(d.score)));

  const topProducts = useMemo(
    () => computeTopProducts(orders, rangeStartISO, rangeEndISO).slice(0, 6),
    [orders, rangeStartISO, rangeEndISO]
  );

  const maxProductQty = Math.max(1, ...topProducts.map((p) => p.quantity));

  const monthOrdersCount = useMemo(
    () =>
      orders.filter((order) => {
        const d = toLocalISO(new Date(order.createdAt));
        return d >= rangeStartISO && d <= rangeEndISO;
      }).length,
    [orders, rangeStartISO, rangeEndISO]
  );

  const pollTotalVotes = poll
    ? poll.options.reduce((sum, option) => sum + option.votes, 0)
    : 0;

  const pollWinner = poll
    ? poll.options.reduce((max, option) => (option.votes > max.votes ? option : max), poll.options[0])
    : null;

  const optionStats = useMemo(() => computeOptionStats(pollHistory), [pollHistory]);

  // Resumen ejecutivo: 2-3 frases armadas con los datos más relevantes del período
  const summarySentences = useMemo(() => {
    const parts: string[] = [];

    if (bestOfMonth?.bestDish) {
      parts.push(
        `${bestOfMonth.bestDish.name} fue el plato mejor recibido de ${monthLabel.toLowerCase()}.`
      );
    } else if (monthTotal === 0) {
      parts.push(`Todavía no hay reacciones registradas en ${monthLabel.toLowerCase()}.`);
    }

    if (poll && pollTotalVotes > 0 && pollWinner) {
      parts.push(`La encuesta activa lidera "${pollWinner.label}" con ${pollWinner.votes} voto${pollWinner.votes === 1 ? '' : 's'}.`);
    }

    if (optionStats.length > 0 && optionStats[0].wins > 1) {
      parts.push(
        `"${optionStats[0].label}" ha ganado ${optionStats[0].wins} encuestas anteriores, la opción más recurrente hasta ahora.`
      );
    }

    if (topProducts.length > 0) {
      parts.push(
        `En cafetería, "${topProducts[0].name}" fue el producto más pedido con ${topProducts[0].quantity} unidades.`
      );
    }

    return parts;
  }, [bestOfMonth, monthTotal, monthLabel, poll, pollTotalVotes, pollWinner, optionStats, topProducts]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
            Panel administrativo
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Bienvenido de nuevo, {adminName}
          </h2>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#4e0611] text-sm font-semibold text-white">
          {getInitials(adminName)}
        </div>
      </div>

      {/* Resumen ejecutivo */}
      {summarySentences.length > 0 && (
        <div className="rounded-[24px] bg-[#f8edef] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#4e0611]">
            Resumen del período
          </p>
          <p className="mt-2 text-sm leading-6 text-black/70">
            {summarySentences.join(' ')}
          </p>
        </div>
      )}

      {/* Selector de mes */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-black/60">
          <CalendarDays size={16} className="text-black/40" />
          Período mostrado
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor((c) => addMonths(c, -1))}
            aria-label="Mes anterior"
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
          >
            <ChevronLeft size={15} />
          </button>

          <span className="min-w-[9rem] text-center text-sm font-medium capitalize">
            {monthLabel}
          </span>

          <button
            onClick={() => setAnchor((c) => addMonths(c, 1))}
            aria-label="Mes siguiente"
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
          >
            <ChevronRight size={15} />
          </button>

          <button
            onClick={() => setAnchor(new Date())}
            className="ml-1 rounded-full bg-[#f8edef] px-3 py-1.5 text-xs font-medium text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col justify-between rounded-2xl bg-[#4e0611] p-5 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
            <Smile size={17} />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-semibold">{monthTotal}</p>
            <p className="mt-0.5 text-xs text-white/60">Reacciones · {monthLabel}</p>
            <div className="mt-1.5">
              <PeriodDelta current={monthTotal} previous={prevMonthTotal} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#f2c14e]/25 p-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#4e0611]">
            <BarChart3 size={17} />
          </div>
          <p className="mt-3 truncate text-2xl font-semibold text-black/80">
            {bestOfMonth?.bestDish?.name ?? 'Sin datos'}
          </p>
          <p className="mt-0.5 text-xs text-black/45">Mejor recibido del mes</p>
        </div>

        <div className="rounded-2xl bg-[#f8edef] p-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#4e0611]">
            <Medal size={17} />
          </div>
          <p className="mt-3 truncate text-2xl font-semibold text-black/80">
            {topDishes[0]?.name ?? 'Sin datos'}
          </p>
          <p className="mt-0.5 text-xs text-black/45">Mejor plato histórico</p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8edef] text-[#4e0611]">
            <ShoppingBag size={17} />
          </div>
          <p className="mt-3 text-2xl font-semibold">{monthOrdersCount}</p>
          <p className="mt-0.5 text-xs text-black/45">Pedidos de cafetería · {monthLabel}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        {/* Días del mes, ordenados de mejor a peor */}
        <div className="rounded-[28px] bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Días del mes, de mejor a peor recibidos
          </h3>

          {rankedMonthDays.length === 0 ? (
            <p className="mt-10 text-center text-sm text-black/40">
              No hay reacciones registradas en {monthLabel.toLowerCase()}.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {rankedMonthDays.map((stat, index) => {
                const widthPct = (Math.abs(stat.score) / maxDayScore) * 100;
                const isPositive = stat.score >= 0;
                const dateLabel = new Date(stat.day.date + 'T00:00:00').toLocaleDateString(
                  'es-CL',
                  { weekday: 'short', day: 'numeric', month: 'short' }
                );

                return (
                  <div key={stat.day.id} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f8edef] text-xs font-bold text-[#4e0611]">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {stat.bestDish?.name ?? 'Sin plato destacado'}
                        </p>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            isPositive ? 'text-[#4e0611]' : 'text-black/50'
                          }`}
                        >
                          {stat.score > 0 ? `+${stat.score}` : stat.score}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f5f5f3]">
                          <div
                            className={isPositive ? 'h-full rounded-full bg-[#4e0611]' : 'h-full rounded-full bg-black/35'}
                            style={{ width: `${Math.max(6, widthPct)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] capitalize text-black/40">{dateLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 border-t border-black/5 pt-3 text-[11px] text-black/35">
            Puntaje: Excelente vale +2, Bueno +1, Regular -1, Wakala -2.
          </p>
        </div>

        {/* Ranking de platos histórico */}
        <div className="rounded-[28px] bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Platos mejor valorados (histórico)
          </h3>

          {topDishes.length === 0 ? (
            <p className="mt-10 text-center text-sm text-black/40">
              Aún no hay reacciones para armar un ranking.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {topDishes.map((dish, index) => {
                const widthPct = (Math.abs(dish.score) / maxDishScore) * 100;
                return (
                  <div key={dish.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">
                        {index + 1}. {dish.name}
                      </span>
                      <span className="shrink-0 text-xs text-black/40">
                        {dish.score > 0 ? `+${dish.score}` : dish.score} · {dish.total} reacciones
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f5f5f3]">
                      <div
                        className={dish.score >= 0 ? 'h-full rounded-full bg-[#4e0611]' : 'h-full rounded-full bg-black/40'}
                        style={{ width: `${Math.max(4, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Productos más pedidos de cafetería */}
      <div className="rounded-[28px] bg-white p-6">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-black/40" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Productos más pedidos · {monthLabel}
          </h3>
        </div>

        {topProducts.length === 0 ? (
          <p className="mt-6 text-center text-sm text-black/40">
            No hay pedidos de cafetería registrados en este período.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f8edef] text-xs font-bold text-[#4e0611]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f5f5f3]">
                    <div
                      className="h-full rounded-full bg-[#4e0611]"
                      style={{ width: `${Math.max(6, (product.quantity / maxProductQty) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#4e0611]">
                  {product.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Encuesta actual */}
        <div className="rounded-[28px] bg-white p-6">
          <div className="flex items-center gap-2">
            <Vote size={16} className="text-black/40" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
              Encuesta actual
            </h3>
          </div>

          {!poll ? (
            <p className="mt-6 text-center text-sm text-black/40">No hay una encuesta activa.</p>
          ) : (
            <div className="mt-4">
              <p className="text-base font-semibold">{poll.question}</p>
              <p className="mt-1 text-xs text-black/40">
                {pollTotalVotes} voto{pollTotalVotes === 1 ? '' : 's'} ·{' '}
                {isPollOpen ? 'Abierta' : 'Cerrada'}
              </p>

              <div className="mt-4 space-y-3">
                {poll.options.map((option) => {
                  const percentage =
                    pollTotalVotes > 0 ? Math.round((option.votes / pollTotalVotes) * 100) : 0;
                  const isWinner = pollWinner?.id === option.id && option.votes > 0;

                  return (
                    <div key={option.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className={isWinner ? 'font-semibold text-[#4e0611]' : 'text-black/70'}>
                          {option.label}
                        </span>
                        <span className="text-black/45">{option.votes} · {percentage}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f5f5f3]">
                        <div
                          className={`h-full rounded-full ${isWinner ? 'bg-[#4e0611]' : 'bg-black/20'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Opciones recurrentes en el historial de encuestas */}
        <div className="rounded-[28px] bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Opciones que más se repiten
          </h3>

          {optionStats.length === 0 ? (
            <p className="mt-6 text-center text-sm text-black/40">
              Todavía no hay encuestas cerradas para analizar.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {optionStats.slice(0, 6).map((stat, index) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f8edef] text-xs font-bold text-[#4e0611]">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{stat.label}</p>
                    <p className="text-xs text-black/40">
                      {stat.appearances} encuesta{stat.appearances === 1 ? '' : 's'} · {stat.wins} veces ganadora
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-[#4e0611]">
                    {stat.totalVotes} votos
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 border-t border-black/5 pt-3 text-[11px] text-black/35">
            Se cuenta cada vez que una encuesta se cierra o se reemplaza por una nueva.
          </p>
        </div>
      </div>
    </div>
  );
}