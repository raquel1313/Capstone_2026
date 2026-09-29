import { useState } from 'react';
import { Clock3 } from 'lucide-react';
import type { LunchDay } from '@/data';
import Image from 'next/image';
import { getDayLabel, getDayNumber, getFullDateLabel } from '@/data';
import { REACTIONS } from '@/hooks/useReactions';
import { HandCircle } from '@/components/HandCircle';

const GRID_BG = {
  backgroundImage:
    'linear-gradient(rgba(78,6,17,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(78,6,17,0.2) 1px, transparent 1px)',
  backgroundSize: '84px 84px',
};

export function MenuView({
  lunchDays,
  getReactionCounts,
  getUserReaction,
  react,
}: {
  lunchDays: LunchDay[];
  getReactionCounts: (dishId: string) => Record<string, number>;
  getUserReaction: (dishId: string) => string | null;
  react: (dishId: string, emoji: string) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  const day = lunchDays[Math.min(selectedDay, Math.max(lunchDays.length - 1, 0))];

  const firstAvailableDish =
  day?.dishes.find((dish) => !dish.soldOut) ??
  day?.dishes[0] ??
  null;

  if (lunchDays.length === 0 || !day) {
    return (
      <div className="mx-auto max-w-5xl pb-5">
        <p className="text-sm text-black/45">Aún no hay menús cargados para esta semana.</p>
      </div>
    );
  }

  const dish =
  day.dishes.find((d) => d.id === selectedDishId) ??
  firstAvailableDish;

  const dishCounts = dish ? getReactionCounts(dish.id) : {};
  const currentReaction = dish ? getUserReaction(dish.id) : null;
  const totalReactions = Object.values(dishCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl pb-5">
      {/* Encabezado + días: estilo calendario */}
      <section className="mb-5 overflow-hidden rounded-[28px] bg-[#ececec] p-5 text-[#4e0611] sm:p-8" style={GRID_BG}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#4e0611]/60">Casino CampusFood</p>
            <h2 className="mt-1 text-4xl tracking-tight sm:text-5xl" style={{ fontFamily: "'Fraunces', serif" }}>
              Menú semanal
            </h2>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#4e0611]/25 bg-white/70 px-4 py-2 text-xs font-medium sm:flex">
            <Clock3 size={14} /> Disponible 11:30 — 15:00
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-1">
          {lunchDays.map((d, index) => {
            const active = index === selectedDay;
            const allSoldOut = d.dishes.length > 0 && d.dishes.every((dish) => dish.soldOut);
            return (
              <button
                key={d.id}
                onClick={() => {setSelectedDay(index); setSelectedDishId(null);}}
                aria-pressed={active}
                className={`flex flex-col items-center rounded-xl px-2 py-4 transition ${
                  active ? '' : 'opacity-60 hover:bg-[#4e0611]/5 hover:opacity-100'
                }`}
              >
                <span className="text-xs font-medium">{getDayLabel(d.date)}</span>
                <span className="relative mt-1 grid place-items-center px-4 py-2">
                  {active && <HandCircle className="inset-0 h-full w-full text-[#4e0611]" />}
                  <span className="text-4xl font-light leading-none sm:text-5xl">{getDayNumber(d.date)}</span>
                </span>
                {allSoldOut && (
                  <span className="mt-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-red-600">Agotado</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Selector de platos, solo si el día tiene más de uno */}
      {day.dishes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {day.dishes.map((d) => {
            const isSelected = d.id === dish?.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDishId(d.id)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isSelected ? 'border-[#4e0611] bg-[#f8edef] text-[#4e0611]' : 'border-black/10 bg-white text-black/55 hover:bg-black/5'
                } ${d.soldOut ? 'opacity-50' : ''}`}
              >
                {d.name}
                {d.soldOut && (
                  <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-600">Agotado</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!dish ? (
        <section className="rounded-[28px] bg-white p-7 text-center text-sm text-black/45">
          Este día todavía no tiene platos cargados.
        </section>
      ) : (
        <section className="overflow-hidden rounded-[28px] bg-white">
          <div className={`h-40 ${dish.color} relative overflow-hidden p-7`}>
            {dish.image && (
              <Image
                src={dish.image}
                alt={dish.name}
                className={`absolute inset-0 h-full w-full object-cover ${dish.soldOut ? 'grayscale' : ''}`}
              />
            )}
            <span className="relative rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold">Plato del día</span>
            {dish.soldOut && (
              <span className="absolute right-5 top-5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">Agotado</span>
            )}
          </div>

          <div className="p-7">
            <p className="text-sm text-black/45">{getFullDateLabel(day.date)} · $4.990</p>
            <h3 className="mt-2 text-2xl font-semibold">{dish.name}</h3>
            <p className="mt-3 text-sm text-black/55">{dish.detail}</p>

            {dish.soldOut && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
                Este plato está agotado por hoy. Prueba con otra opción.
              </p>
            )}

            <div className="mt-7 grid gap-3 border-t border-black/5 pt-5 sm:grid-cols-3">
              <div><p className="text-xs text-black/40">Incluye</p><p className="mt-1 text-sm font-medium">Ensalada + postre</p></div>
              <div><p className="text-xs text-black/40">Alternativa</p><p className="mt-1 text-sm font-medium">Opción vegetariana</p></div>
              <div><p className="text-xs text-black/40">Alérgenos</p><p className="mt-1 text-sm font-medium">Consultar en casino</p></div>
            </div>

            <div className="mt-7 border-t border-black/5 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-black/40">¿Qué te pareció este plato?</p>
                {totalReactions > 0 && <span className="text-xs text-black/40">{totalReactions} reacciones</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {REACTIONS.map(({ emoji, label }) => {
                  const isActive = currentReaction === emoji;
                  const count = dishCounts[emoji];
                  return (
                    <button
                      key={emoji}
                      onClick={() => react(dish.id, emoji)}
                      title={label}
                      className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                        isActive ? 'bg-[#4e0611] text-white' : 'bg-black/5 text-black/60 hover:bg-black/10'
                      }`}
                    >
                      <span className="text-base leading-none">{emoji}</span>
                      <span>{count > 0 ? count : label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}