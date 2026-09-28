import { BarChart3, Smile, TrendingUp, Vote } from 'lucide-react';

import type { LunchDay } from '@/data';

import { getDayLabel } from '@/data';

import type { VotePoll } from '@/hooks/useVotes';

import { REACTIONS } from '@/hooks/useReactions';

// Peso de sentimiento por reacción, mismo orden que REACTIONS:
// Excelente, Bueno, Regular, Wakala
const SENTIMENT_WEIGHTS = [2, 1, -1, -2];

// Colores literales (no dinámicos) para que Tailwind los detecte al compilar
const SENTIMENT_COLORS: Record<string, string> = {
  '❤️‍🔥': 'bg-[#4e0611]',
  '🤩': 'bg-[#c9707c]',
  '😼': 'bg-[#f2c14e]',
  '😿': 'bg-black/25',
};

type DayStat = {
  day: LunchDay;
  counts: Record<string, number>;
  total: number;
  score: number;
};

function buildDayStats(
  menu: LunchDay[],
  getReactionCounts: (dayId: string) => Record<string, number>
): DayStat[] {
  return menu.map((day) => {
    const counts = getReactionCounts(day.id);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const score = REACTIONS.reduce(
      (sum, reaction, index) =>
        sum + (counts[reaction.emoji] ?? 0) * SENTIMENT_WEIGHTS[index],
      0
    );

    return { day, counts, total, score };
  });
}

function aggregateAll(stats: DayStat[]): Record<string, number> {
  const totals: Record<string, number> = {};
  REACTIONS.forEach((r) => (totals[r.emoji] = 0));

  stats.forEach((stat) => {
    REACTIONS.forEach((r) => {
      totals[r.emoji] += stat.counts[r.emoji] ?? 0;
    });
  });

  return totals;
}

function dayPrimaryDish(day: LunchDay) {
  return day.dishes.find((dish) => !dish.soldOut) ?? day.dishes[0];
}

export function AdminDashboardView({
  menu,
  getReactionCounts,
  poll,
  isPollOpen,
}: {
  menu: LunchDay[];
  getReactionCounts: (dayId: string) => Record<string, number>;
  poll: VotePoll | null;
  isPollOpen: boolean;
}) {
  const stats = buildDayStats(menu, getReactionCounts);
  const totalReactions = stats.reduce((sum, stat) => sum + stat.total, 0);
  const aggregated = aggregateAll(stats);

  const topEmoji = REACTIONS.reduce((best, reaction) =>
    (aggregated[reaction.emoji] ?? 0) > (aggregated[best.emoji] ?? 0) ? reaction : best
  , REACTIONS[0]);

  const rankedDays = [...stats]
    .filter((stat) => stat.total > 0)
    .sort((a, b) => b.score - a.score);

  const bestDay = rankedDays[0] ?? null;

  const pollTotalVotes = poll
    ? poll.options.reduce((sum, option) => sum + option.votes, 0)
    : 0;

  const pollWinner = poll
    ? poll.options.reduce((max, option) => (option.votes > max.votes ? option : max), poll.options[0])
    : null;

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8edef] text-[#4e0611]">
            <Smile size={17} />
          </div>
          <p className="mt-3 text-2xl font-semibold">{totalReactions}</p>
          <p className="mt-0.5 text-xs text-black/45">Reacciones totales</p>
        </div>

        <div className="rounded-2xl bg-white p-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8edef] text-lg text-[#4e0611]">
            {totalReactions > 0 ? topEmoji.emoji : '—'}
          </div>
          <p className="mt-3 text-2xl font-semibold">
            {totalReactions > 0 ? topEmoji.label : 'Sin datos'}
          </p>
          <p className="mt-0.5 text-xs text-black/45">Reacción más frecuente</p>
        </div>

        <div className="rounded-2xl bg-white p-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8edef] text-[#4e0611]">
            <TrendingUp size={17} />
          </div>
          <p className="mt-3 truncate text-2xl font-semibold">
            {bestDay ? dayPrimaryDish(bestDay.day)?.name ?? '—' : 'Sin datos'}
          </p>
          <p className="mt-0.5 text-xs text-black/45">
            {bestDay ? `Mejor recibido · ${getDayLabel(bestDay.day.date)}` : 'Día mejor valorado'}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8edef] text-[#4e0611]">
            <Vote size={17} />
          </div>
          <p className="mt-3 text-2xl font-semibold">{pollTotalVotes}</p>
          <p className="mt-0.5 text-xs text-black/45">
            {poll
              ? isPollOpen
                ? 'Votos · encuesta abierta'
                : 'Votos · encuesta cerrada'
              : 'Sin encuesta activa'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        {/* Reacciones por día */}
        <div className="rounded-[28px] bg-white p-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-black/40" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
              Reacciones por día
            </h3>
          </div>

          {stats.every((stat) => stat.total === 0) ? (
            <p className="mt-6 text-center text-sm text-black/40">
              Todavía no hay reacciones registradas esta semana.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {stats.map((stat) => (
                <div key={stat.day.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-black/60">
                      {getDayLabel(stat.day.date)} · {dayPrimaryDish(stat.day)?.name ?? 'Sin platos'}
                    </span>
                    <span className="text-black/40">{stat.total} reacciones</span>
                  </div>

                  <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-[#f5f5f3]">
                    {stat.total === 0 ? (
                      <div className="h-full w-full bg-black/5" />
                    ) : (
                      REACTIONS.map((reaction) => {
                        const count = stat.counts[reaction.emoji] ?? 0;
                        if (count === 0) return null;

                        const width = (count / stat.total) * 100;

                        return (
                          <div
                            key={reaction.emoji}
                            title={`${reaction.label}: ${count}`}
                            className={SENTIMENT_COLORS[reaction.emoji]}
                            style={{ width: `${width}%` }}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              ))}

              {/* Leyenda */}
              <div className="flex flex-wrap gap-3 border-t border-black/5 pt-4">
                {REACTIONS.map((reaction) => (
                  <div key={reaction.emoji} className="flex items-center gap-1.5 text-xs text-black/50">
                    <span className={`h-2.5 w-2.5 rounded-full ${SENTIMENT_COLORS[reaction.emoji]}`} />
                    {reaction.emoji} {reaction.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ranking de la semana */}
        <div className="rounded-[28px] bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Ranking de la semana
          </h3>

          {rankedDays.length === 0 ? (
            <p className="mt-6 text-center text-sm text-black/40">
              Aún no hay suficientes datos para armar un ranking.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {rankedDays.map((stat, index) => (
                <div key={stat.day.id} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f8edef] text-xs font-bold text-[#4e0611]">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {dayPrimaryDish(stat.day)?.name ?? 'Sin platos'}
                    </p>
                    <p className="text-xs text-black/40">{getDayLabel(stat.day.date)}</p>
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-[#4e0611]">
                    {stat.score > 0 ? `+${stat.score}` : stat.score}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 border-t border-black/5 pt-3 text-[11px] text-black/35">
            Puntaje: Excelente vale +2, Bueno +1, Regular -1, Wakala -2.
          </p>
        </div>
      </div>

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
                      <span className="text-black/45">
                        {option.votes} · {percentage}%
                      </span>
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
    </div>
  );
}