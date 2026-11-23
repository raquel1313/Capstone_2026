import { useMemo } from 'react';
import { Vote } from 'lucide-react';

import type { LunchDay } from '@/data';
import type { VotePoll } from '@/hooks/useVotes';
import {
  aggregateReactionsByDishName,
  dayScoreAndBestDish,
} from '@/hooks/useReactions';

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
      const entry = map.get(key) ?? {
        label: option.label,
        appearances: 0,
        wins: 0,
        totalVotes: 0,
      };

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

/**
 * Reacciones a los platos del menú y encuestas (parte del dashboard original).
 * Las reacciones se filtran por los días de menú que caen en el rango elegido; las
 * encuestas muestran la vigente y el historial, que no dependen de un rango.
 */
export function MenuAndPollsSection({
  menu,
  getReactionCounts,
  poll,
  isPollOpen,
  pollHistory,
  rangeFrom,
  rangeTo,
  rangeLabel,
}: {
  menu: LunchDay[];
  getReactionCounts: (dishId: string) => Record<string, number>;
  poll: VotePoll | null;
  isPollOpen: boolean;
  pollHistory: VotePoll[];
  rangeFrom: string;
  rangeTo: string;
  rangeLabel: string;
}) {
  const monthDays = useMemo(
    () =>
      menu
        .filter((day) => day.date >= rangeFrom && day.date <= rangeTo)
        .map((day) => ({
          day,
          ...dayScoreAndBestDish(day, getReactionCounts),
        }))
        .sort((a, b) => a.day.date.localeCompare(b.day.date)),
    [menu, rangeFrom, rangeTo, getReactionCounts]
  );

  // Días del período con reacciones, ordenados de mejor a peor puntaje
  const rankedMonthDays = useMemo(
    () => [...monthDays].filter((d) => d.total > 0).sort((a, b) => b.score - a.score),
    [monthDays]
  );

  const maxDayScore = Math.max(1, ...rankedMonthDays.map((d) => Math.abs(d.score)));

  // Ranking histórico de platos
  const topDishes = useMemo(
    () => aggregateReactionsByDishName(menu, getReactionCounts).slice(0, 8),
    [menu, getReactionCounts]
  );

  const maxDishScore = Math.max(1, ...topDishes.map((d) => Math.abs(d.score)));

  const pollTotalVotes = poll ? poll.options.reduce((sum, option) => sum + option.votes, 0) : 0;

  const pollWinner = poll
    ? poll.options.reduce((max, option) => (option.votes > max.votes ? option : max), poll.options[0])
    : null;

  const optionStats = useMemo(() => computeOptionStats(pollHistory), [pollHistory]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        {/* Días del mes, ordenados de mejor a peor */}
        <div className="rounded-[28px] bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/65">
            Días del período, de mejor a peor recibidos
          </h3>

          {rankedMonthDays.length === 0 ? (
            <p className="mt-10 text-center text-sm text-ink/65">
              No hay reacciones registradas en {rangeLabel.toLowerCase()}.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {rankedMonthDays.map((stat, index) => {
                const widthPct =
                  (Math.abs(stat.score) / maxDayScore) * 100;
                const isPositive = stat.score >= 0;

                const dateLabel = new Date(
                  stat.day.date + 'T00:00:00'
                ).toLocaleDateString('es-CL', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <div
                    key={stat.day.id}
                    className="flex items-center gap-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-xs font-bold text-brand">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {stat.bestDish?.name ?? 'Sin plato destacado'}
                        </p>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            isPositive
                              ? 'text-brand'
                              : 'text-ink/65'
                          }`}
                        >
                          {stat.score > 0
                            ? `+${stat.score}`
                            : stat.score}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                          <div
                            className={
                              isPositive
                                ? 'h-full rounded-full bg-brand'
                                : 'h-full rounded-full bg-ink/35'
                            }
                            style={{
                              width: `${Math.max(6, widthPct)}%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] capitalize text-ink/65">
                          {dateLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 border-t border-ink/10 pt-3 text-[11px] text-ink/65">
            Puntaje: Excelente vale +2, Bueno +1, Regular -1, Wakala -2.
          </p>
        </div>

        {/* Ranking histórico de platos */}
        <div className="rounded-[28px] bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/65">
            Platos mejor valorados (histórico)
          </h3>

          {topDishes.length === 0 ? (
            <p className="mt-10 text-center text-sm text-ink/65">
              Aún no hay reacciones para armar un ranking.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {topDishes.map((dish, index) => {
                const widthPct =
                  (Math.abs(dish.score) / maxDishScore) * 100;

                return (
                  <div key={dish.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">
                        {index + 1}. {dish.name}
                      </span>
                      <span className="shrink-0 text-xs text-ink/65">
                        {dish.score > 0 ? `+${dish.score}` : dish.score}
                        {' · '}
                        {dish.total} reacciones
                      </span>
                    </div>

                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className={
                          dish.score >= 0
                            ? 'h-full rounded-full bg-brand'
                            : 'h-full rounded-full bg-ink/40'
                        }
                        style={{
                          width: `${Math.max(4, widthPct)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Encuesta actual */}
        <div className="rounded-[28px] bg-white p-6">
          <div className="flex items-center gap-2">
            <Vote size={16} className="text-ink/65" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/65">
              Encuesta actual
            </h3>
          </div>

          {!poll ? (
            <p className="mt-6 text-center text-sm text-ink/65">
              No hay una encuesta activa.
            </p>
          ) : (
            <div className="mt-4">
              <p className="text-base font-semibold">
                {poll.question}
              </p>
              <p className="mt-1 text-xs text-ink/65">
                {pollTotalVotes} voto{pollTotalVotes === 1 ? '' : 's'} ·{' '}
                {isPollOpen ? 'Abierta' : 'Cerrada'}
              </p>

              <div className="mt-4 space-y-3">
                {poll.options.map((option) => {
                  const percentage =
                    pollTotalVotes > 0
                      ? Math.round(
                          (option.votes / pollTotalVotes) * 100
                        )
                      : 0;

                  const isWinner =
                    pollWinner?.id === option.id &&
                    option.votes > 0;

                  return (
                    <div key={option.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={
                            isWinner
                              ? 'font-semibold text-brand'
                              : 'text-ink/75'
                          }
                        >
                          {option.label}
                        </span>
                        <span className="text-ink/65">
                          {option.votes} · {percentage}%
                        </span>
                      </div>

                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className={`h-full rounded-full ${
                            isWinner
                              ? 'bg-brand'
                              : 'bg-ink/20'
                          }`}
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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/65">
            Opciones que más se repiten
          </h3>

          {optionStats.length === 0 ? (
            <p className="mt-6 text-center text-sm text-ink/65">
              Todavía no hay encuestas cerradas para analizar.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {optionStats.slice(0, 6).map((stat, index) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-3"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-xs font-bold text-brand">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {stat.label}
                    </p>
                    <p className="text-xs text-ink/65">
                      {stat.appearances} encuesta
                      {stat.appearances === 1 ? '' : 's'} ·{' '}
                      {stat.wins} veces ganadora
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-brand">
                    {stat.totalVotes} votos
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 border-t border-ink/10 pt-3 text-[11px] text-ink/65">
            Se cuenta cada vez que una encuesta se cierra o se reemplaza por una nueva.
          </p>
        </div>
      </div>
    </div>
  );
}
