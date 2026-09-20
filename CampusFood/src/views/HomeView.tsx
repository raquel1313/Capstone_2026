import { Fragment, useEffect, useState, type CSSProperties } from 'react';

import { Check, ChevronRight, Clock3, Search, Vote } from 'lucide-react';

import type { View } from '@/types';

import type { LunchDay, Product } from '@/data';

import { getDayLabel, getDayNumber } from '@/data';

import type { VotePoll } from '@/hooks/useVotes';

import { REACTIONS } from '@/hooks/useReactions';

import { ProductCard } from '@/components/ProductCard';

import brazo from '@/assets/images/brazo.png';
import bebestible from '@/assets/images/bebestible.jpg';
import postres from '@/assets/images/postres.jpg';
import gohan from '@/assets/images/gohan.jpg';
import snacks from '@/assets/images/snacks.jpg';

const ARC_RADIUS = 96;

// label = lo que se ve · category = nombre de categoría de tus productos
const CATEGORY_CARDS = [
  { label: 'Bebestibles', category: 'Bebidas', image: bebestible },
  { label: 'Postres', category: 'Dulce', image: postres },
  { label: 'Gohan', category: 'Gohan', image: gohan },
  { label: 'Snacks', category: 'Snacks', image: snacks },
];

// Confeti al votar
const CONFETTI_COLORS = ['#ffffff', '#f8edef', '#e8a0ad', '#c94b5f', '#f2c14e'];

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  rotate: number;
  color: string;
  round: boolean;
};

function createConfetti(): ConfettiPiece[] {
  // Respeta a quienes tienen desactivadas las animaciones
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return [];

  return Array.from({ length: 70 }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2.4 + Math.random() * 1.8,
    size: 6 + Math.random() * 7,
    drift: (Math.random() - 0.5) * 240,
    rotate: 360 + Math.random() * 720,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    round: Math.random() > 0.65,
  }));
}

export function HomeView({
  setView,
  openOrders,
  addToCart,
  lunchDays,
  products,
  poll,
  isPollOpen,
  hasVoted,
  castVote,
  getUserReaction,
  react,
}: {
  setView: (view: View) => void;
  openOrders: (category?: string | null) => void;
  addToCart: (product: Product) => void;
  lunchDays: LunchDay[];
  products: Product[];
  poll: VotePoll | null;
  isPollOpen: boolean;
  hasVoted: boolean;
  castVote: (optionId: string) => void;
  getUserReaction: (dayId: string) => string | null;
  react: (dayId: string, emoji: string) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  // En celular: tocar fuera de una tarjeta cierra el abanico
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target?.closest('[data-day-card]')) {
        setOpenDay(null);
      }
    };

    document.addEventListener('pointerdown', close);

    return () => document.removeEventListener('pointerdown', close);
  }, []);

  // El confeti se retira solo unos segundos después
  useEffect(() => {
    if (confetti.length === 0) return;

    const timer = setTimeout(() => setConfetti([]), 4500);

    return () => clearTimeout(timer);
  }, [confetti]);

  const handleVote = () => {
    if (!selectedOption) return;

    castVote(selectedOption);
    setConfetti(createConfetti());
  };

  return (
    <div className="space-y-7 pb-5">
      {/* Buscador */}
      <button
        onClick={() => openOrders()}
        className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white px-5 py-3.5 text-left text-sm text-black/40 transition hover:border-black/10"
      >
        <Search size={17} />
        Buscar snacks, bebidas o platos...
      </button>

      {/* Banner promocional compacto */}
      <section className="relative min-h-[150px] overflow-hidden rounded-[28px] bg-[#4e0611] p-5 text-white sm:min-h-[190px] sm:p-7">
        {/* La imagen ocupa todo el alto del banner y se pega a la esquina superior derecha */}
        <img
          src={brazo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-auto max-w-none select-none object-contain object-right"
        />

        <div className="relative max-w-[62%] sm:max-w-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/70">
            <Clock3 size={11} />
            Casino abierto 11:30 — 15:00
          </span>

          <h2 className="mt-4 text-white">
            <span
              className="block text-3xl leading-[0.95] sm:text-5xl"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Almuerza rico,
            </span>

            <span
              className="mt-1 block text-lg leading-tight tracking-tight sm:text-3xl"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              sin hacer fila.
            </span>
          </h2>
        </div>
      </section>

      {/* Categorías */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-black/70">Categorías</h2>

          <button
            onClick={() => openOrders()}
            className="flex items-center gap-0.5 text-sm text-black/45 transition hover:text-[#4e0611]"
          >
            Ver todo
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1.5 sm:gap-3">
          {CATEGORY_CARDS.map((item, index) => (
            <Fragment key={item.label}>
              {/* Puntito entre tarjetas */}
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-black/15 sm:h-2 sm:w-2"
                />
              )}

              <button
                onClick={() => openOrders(item.category)}
                className="flex aspect-square min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] motion-reduce:transition-none sm:gap-2 sm:p-2 xl:aspect-auto xl:flex-row xl:justify-start xl:gap-3 xl:px-4 xl:py-3"
              >
                <span className="block aspect-square w-3/5 shrink-0 overflow-hidden rounded-full bg-[#f5f5f3] xl:w-12">
                  <img
                    src={item.image}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                  />
                </span>

                <span className="w-full truncate text-center text-[10px] font-medium text-black/70 sm:text-xs xl:w-auto xl:min-w-0 xl:flex-1 xl:text-left xl:text-sm">
                  {item.label}
                </span>
              </button>
            </Fragment>
          ))}
        </div>
      </section>

      {/* Para tu break: carrusel horizontal */}
      <section className="rounded-[28px] bg-white p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
              Cafetería
            </p>

            <h2
              className="mt-1 text-2xl"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Para tu break
            </h2>
          </div>

          <button
            onClick={() => openOrders()}
            className="text-sm font-medium text-[#4e0611]"
          >
            Ver más
          </button>
        </div>

        {/* Los márgenes negativos hacen que las tarjetas lleguen hasta el borde de la sección al deslizar */}
        <div className="-mx-6 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-6 px-6 pb-2 [scrollbar-width:none] sm:-mx-7 sm:scroll-px-7 sm:px-7 [&::-webkit-scrollbar]:hidden">
          {products.slice(0, 8).map((product) => (
            <div
              key={product.id}
              className="w-40 shrink-0 snap-start sm:w-48 lg:w-52"
            >
              <ProductCard
                product={product}
                addToCart={addToCart}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Menú semanal: carrusel horizontal con tarjetas grandes */}
      <section className="rounded-[28px] bg-white p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
              Planifica tu semana
            </p>

            <h2
              className="mt-1 text-2xl"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Menú del casino
            </h2>
          </div>

          <button
            onClick={() => setView('menu')}
            className="text-sm font-medium text-[#4e0611]"
          >
            Ver todo
          </button>
        </div>

        <div className="-mx-6 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-4 pt-1 [scrollbar-width:none] sm:-mx-7 sm:scroll-px-7 sm:px-7 [&::-webkit-scrollbar]:hidden">
          {lunchDays.map((item, index) => {
            const isOpen = openDay === item.id;
            const userReaction = getUserReaction(item.id);
            const availableDishes = item.dishes.filter((d) => !d.soldOut);
            const representative = availableDishes[0] ?? item.dishes[0];
            const allSoldOut = item.dishes.length > 0 && availableDishes.length === 0;

            return (
              <div
                key={item.id}
                data-day-card
                className="relative w-[82%] shrink-0 snap-start sm:w-[56%] lg:w-[42%]"
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') {
                    setOpenDay(item.id);
                  }
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === 'mouse') {
                    setOpenDay((current) =>
                      current === item.id ? null : current
                    );
                  }
                }}
              >
                <button
                  onClick={() => {
                    setSelectedDay(index);
                    setOpenDay(item.id);
                  }}
                  className={`w-full overflow-hidden rounded-3xl border text-left transition ${
                    selectedDay === index
                      ? 'border-[#4e0611] bg-[#f8edef] shadow-[0_8px_24px_rgba(78,6,17,0.12)]'
                      : 'border-transparent bg-[#f5f5f3] hover:bg-[#f8edef]'
                  }`}
                >
                  {representative?.image && (
                    <div className="h-44 w-full overflow-hidden sm:h-52">
                      <img
                        src={representative.image}
                        alt={representative.name}
                        className={`h-full w-full object-cover ${allSoldOut ? 'grayscale' : ''}`}
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-black/50">
                        {getDayLabel(item.date)}
                      </span>

                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#4e0611]/10 text-sm font-semibold text-[#4e0611]">
                        {getDayNumber(item.date)}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-base font-semibold sm:text-lg">
                      {representative?.name ?? 'Sin platos cargados'}
                    </p>

                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-black/45">
                      {representative?.detail}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {item.dishes.length > 1 && (
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold text-black/50">
                          +{item.dishes.length - 1} opción{item.dishes.length - 1 === 1 ? '' : 'es'} más
                        </span>
                      )}
                      {allSoldOut && (
                        <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-red-600">
                          Agotado
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Abanico de reacciones: sale de la esquina inferior izquierda */}
                <div className="absolute bottom-4 left-4 z-20 h-0 w-0">
                  {REACTIONS.map((reaction, i) => {
                    const angle =
                      (Math.PI / 2) * (i / (REACTIONS.length - 1));

                    const x = Math.cos(angle) * ARC_RADIUS;
                    const y = Math.sin(angle) * ARC_RADIUS;
                    const isMine = userReaction === reaction.emoji;

                    return (
                      <button
                        key={reaction.emoji}
                        type="button"
                        title={reaction.label}
                        aria-label={reaction.label}
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => {
                          react(item.id, reaction.emoji);
                          setOpenDay(null);
                        }}
                        className={`absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full bg-white text-lg shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition duration-300 ease-out hover:scale-110 motion-reduce:transition-none ${
                          isMine ? 'ring-2 ring-[#4e0611]' : ''
                        } ${
                          isOpen
                            ? 'pointer-events-auto opacity-100'
                            : 'pointer-events-none opacity-0'
                        }`}
                        style={{
                          transform: isOpen
                            ? `translate(calc(-50% + ${x}px), calc(-50% - ${y}px)) scale(1)`
                            : 'translate(-50%, -50%) scale(0.3)',
                          transitionDelay: isOpen ? `${i * 40}ms` : '0ms',
                        }}
                      >
                        {reaction.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Votación */}
      <>
        <section className="rounded-[28px] bg-[#4e0611] p-6 text-white sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/70">
            <Vote size={12} />
            Votación
          </span>

          <h2
            className="mt-4 text-4xl leading-[0.95] sm:text-5xl"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Tu opinión nos importa
          </h2>

          {!poll ? (
            <p className="mt-5 text-sm leading-6 text-white/60">
              No hay una votación activa en este momento. Vuelve pronto.
            </p>
          ) : (
            <>
              <p
                className="mt-3 max-w-md text-lg leading-snug text-white/80 sm:text-xl"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {poll.question}
              </p>

              {!isPollOpen ? (
                <p className="mt-4 text-sm leading-6 text-white/60">
                  Esta votación está cerrada por el momento.
                </p>
              ) : hasVoted ? (
                <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm font-medium text-white sm:max-w-lg">
                  ¡Gracias por participar! Tu voto ya fue registrado.
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-2 sm:max-w-lg">
                    {poll.options.map((option) => {
                      const isSelected = selectedOption === option.id;

                      return (
                        <button
                          key={option.id}
                          onClick={() => setSelectedOption(option.id)}
                          aria-pressed={isSelected}
                          className={`flex w-full items-center justify-between rounded-full border px-5 py-3 text-left text-sm font-medium transition ${
                            isSelected
                              ? 'border-white bg-white text-[#4e0611]'
                              : 'border-white/15 bg-white/10 text-white/80 hover:bg-white/15'
                          }`}
                        >
                          {option.label}

                          {isSelected && (
                            <Check
                              size={16}
                              className="text-[#4e0611]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleVote}
                    disabled={!selectedOption}
                    className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#4e0611] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-10"
                  >
                    Votar ahora
                  </button>
                </>
              )}
            </>
          )}
        </section>

        {/* Confeti: cae por toda la pantalla al votar */}
        {confetti.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          >
            <style>{`
              @keyframes confetti-fall {
                from { transform: translate3d(0, -10vh, 0) rotate(0deg); }
                to { transform: translate3d(var(--drift), 110vh, 0) rotate(var(--rot)); }
              }
            `}</style>

            {confetti.map((piece) => (
              <span
                key={piece.id}
                className="absolute top-0 block"
                style={
                  {
                    left: `${piece.left}%`,
                    width: piece.size,
                    height: piece.round ? piece.size : piece.size * 0.5,
                    backgroundColor: piece.color,
                    borderRadius: piece.round ? '9999px' : '2px',
                    animation: `confetti-fall ${piece.duration}s ${piece.delay}s ease-in both`,
                    '--drift': `${piece.drift}px`,
                    '--rot': `${piece.rotate}deg`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}
      </>
    </div>
  );
}