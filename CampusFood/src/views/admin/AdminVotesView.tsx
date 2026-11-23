import { useState } from 'react';

import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';

import type { VotePoll } from '@/hooks/useVotes';
import { useResettingPage } from '@/hooks/useResettingPage';

const HISTORY_PAGE_SIZE = 10;

function CreatePollForm({
  onCreate,
  onCancel,
}: {
  onCreate: (question: string, options: string[], start: string, end: string) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState('¿Qué te gustaría ver en el menú del viernes?');

  const [options, setOptions] = useState([
    'Hamburguesas',
    'Arroz oriental',
    'Cazuela',
    'Empanadas',
  ]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateOption = (index: number, value: string) => {
    setOptions((current) =>
      current.map((option, i) => (i === index ? value : option))
    );
  };

  const addOption = () => setOptions((current) => [...current, '']);

  const removeOption = (index: number) =>
    setOptions((current) => current.filter((_, i) => i !== index));

  const handleSubmit = () => {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);

    if (!question.trim()) {
      return setError('Escribe la pregunta de la encuesta.');
    }

    if (cleanOptions.length < 2) {
      return setError('Agrega al menos 2 alternativas.');
    }

    if (!startDate || !endDate) {
      return setError('Define el período de votación.');
    }

    if (endDate < startDate) {
      return setError('La fecha de término no puede ser anterior a la de inicio.');
    }

    onCreate(question.trim(), cleanOptions, startDate, endDate);
  };

  return (
    <div className="rounded-[24px] bg-white p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-ink/65">
        Nueva encuesta
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs text-ink/65">Pregunta</label>

          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="mt-1 w-full rounded-xl border border-ink/10 bg-brand-soft px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="text-xs text-ink/65">Alternativas</label>

          <div className="mt-1.5 space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Alternativa ${index + 1}`}
                  className="w-full rounded-xl border border-ink/10 bg-brand-soft px-3 py-2 text-sm outline-none focus:border-brand"
                />

                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-ink/65 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addOption}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
          >
            <Plus size={13} /> Agregar alternativa
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink/65">Fecha de inicio</label>

            <div className="relative mt-1">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/65"
                size={14}
              />

              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-brand-soft py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-ink/65">Fecha de término</label>

            <div className="relative mt-1">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/65"
                size={14}
              />

              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-brand-soft py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          <Check size={14} /> Crear encuesta
        </button>

        <button
          onClick={onCancel}
          className="rounded-full bg-brand-soft px-4 py-2.5 text-xs font-medium text-ink/65 hover:bg-ink/10"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function PollResults({
  poll,
  isOpen,
  onClose,
  onReopen,
  onDelete,
}: {
  poll: VotePoll;
  isOpen: boolean;
  onClose: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const totalVotes = poll.options.reduce(
    (sum, option) => sum + option.votes,
    0
  );

  const winner = poll.options.reduce(
    (max, option) => (option.votes > max.votes ? option : max),
    poll.options[0]
  );

  return (
    <div className="rounded-[24px] bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                isOpen
                  ? 'bg-brand-soft text-brand'
                  : 'bg-ink/5 text-ink/65'
              }`}
            >
              {isOpen ? 'Abierta' : 'Cerrada'}
            </span>

            <span className="text-xs text-ink/65">
              {new Date(poll.startDate + 'T00:00:00').toLocaleDateString(
                'es-CL',
                {
                  day: 'numeric',
                  month: 'short',
                }
              )}{' '}
              —{' '}
              {new Date(poll.endDate + 'T00:00:00').toLocaleDateString(
                'es-CL',
                {
                  day: 'numeric',
                  month: 'short',
                }
              )}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-semibold">{poll.question}</h3>

          <p className="mt-1 text-xs text-ink/65">
            {totalVotes} voto{totalVotes !== 1 ? 's' : ''} en total
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          {poll.active ? (
            <button
              onClick={onClose}
              title="Cerrar votación"
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-ink/10 hover:text-brand"
            >
              <Lock size={14} />
            </button>
          ) : (
            <button
              onClick={onReopen}
              title="Reabrir votación"
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-ink/10 hover:text-brand"
            >
              <Unlock size={14} />
            </button>
          )}

          {confirmingDelete ? (
            <button
              onClick={onDelete}
              className="grid h-9 w-9 place-items-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
            >
              <Check size={14} />
            </button>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}

          {confirmingDelete && (
            <button
              onClick={() => setConfirmingDelete(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-ink/10"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {poll.options.map((option) => {
          const percentage =
            totalVotes > 0
              ? Math.round((option.votes / totalVotes) * 100)
              : 0;

          const isWinner = totalVotes > 0 && option.id === winner.id;

          return (
            <div key={option.id}>
              <div className="flex items-center justify-between text-sm">
                <span
                  className={`font-medium ${
                    isWinner ? 'text-brand' : 'text-ink/75'
                  }`}
                >
                  {option.label}
                </span>

                <span className="text-ink/65">
                  {option.votes} · {percentage}%
                </span>
              </div>

              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-brand-soft">
                <div
                  className={`h-full rounded-full transition-all ${
                    isWinner ? 'bg-brand' : 'bg-ink/15'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatShort(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Historial de encuestas anteriores, con filtro por rango de fechas y paginación.
function PollHistory({ polls }: { polls: VotePoll[] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const invalidRange = Boolean(from && to && to < from);

  // Una encuesta aparece si su período se cruza con el rango elegido.
  const filtered = polls.filter((poll) => {
    if (invalidRange) return true;
    if (from && poll.endDate < from) return false;
    if (to && poll.startDate > to) return false;
    return true;
  });

  // Volver a la página 1 al cambiar el rango de fechas
  const [page, setPage] = useResettingPage(
    String(from) + '|' + String(to)
  );

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * HISTORY_PAGE_SIZE;
  const paginatedPolls = filtered.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand">
        <History size={16} /> Historial de encuestas
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-[24px] bg-white p-4">
        <div>
          <label className="text-xs text-ink/65">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 block rounded-xl border border-ink/10 bg-brand-soft px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="text-xs text-ink/65">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1 block rounded-xl border border-ink/10 bg-brand-soft px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        {(from || to) && (
          <button
            onClick={() => {
              setFrom('');
              setTo('');
            }}
            className="rounded-full bg-brand-soft px-4 py-2 text-xs font-medium text-ink/65 hover:bg-ink/10"
          >
            Limpiar filtro
          </button>
        )}

        <p className="ml-auto text-xs text-ink/65">
          {filtered.length} de {polls.length} encuesta{polls.length !== 1 ? 's' : ''}
        </p>
      </div>

      {invalidRange && (
        <p className="mt-2 text-xs text-red-500">
          La fecha &quot;Hasta&quot; no puede ser anterior a &quot;Desde&quot;.
        </p>
      )}

      {/* Barra superior de paginación */}
      {filtered.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-ink/65">
          <span>
            Mostrando{' '}
            <strong className="font-semibold text-ink/85">
              {startIndex + 1}–{Math.min(startIndex + HISTORY_PAGE_SIZE, filtered.length)}
            </strong>{' '}
            de{' '}
            <strong className="font-semibold text-ink/85">
              {filtered.length}
            </strong>{' '}
            {filtered.length === 1 ? 'encuesta' : 'encuestas'}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="mr-1">
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink/75 shadow-2xs transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink/75 shadow-2xs transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 space-y-3">
        {paginatedPolls.map((poll) => {
          const total = poll.options.reduce((sum, option) => sum + option.votes, 0);
          const top = poll.options.reduce(
            (max, option) => (option.votes > max.votes ? option : max),
            poll.options[0]
          );

          return (
            <div key={poll.id} className="rounded-[24px] bg-white p-4">
              <p className="text-xs text-ink/65">
                {formatShort(poll.startDate)} — {formatShort(poll.endDate)}
              </p>
              <p className="mt-1 font-semibold">{poll.question}</p>
              <p className="mt-1 text-xs text-ink/65">
                {total} voto{total !== 1 ? 's' : ''}
                {total > 0 && top ? ` · Ganó: ${top.label} (${top.votes})` : ''}
              </p>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-[24px] bg-white p-8 text-center text-sm text-ink/65">
            {polls.length === 0
              ? 'Aún no hay encuestas anteriores.'
              : 'No hay encuestas en ese rango de fechas.'}
          </div>
        )}
      </div>

      {/* Barra inferior de paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white px-5 py-3 text-xs text-ink/65">
          <span>
            Mostrando{' '}
            <strong className="font-semibold text-ink/85">
              {startIndex + 1}–{Math.min(startIndex + HISTORY_PAGE_SIZE, filtered.length)}
            </strong>{' '}
            de{' '}
            <strong className="font-semibold text-ink/85">
              {filtered.length}
            </strong>{' '}
            encuestas
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-full bg-surface px-3.5 py-1.5 font-medium text-ink/75 transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>

            <span className="px-1 font-medium text-ink/75">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-full bg-surface px-3.5 py-1.5 font-medium text-ink/75 transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminVotesView({
  poll,
  pollHistory = [],
  isOpen,
  createPoll,
  closePoll,
  reopenPoll,
  deletePoll,
}: {
  poll: VotePoll | null;
  pollHistory?: VotePoll[];
  isOpen: boolean;
  createPoll: (
    question: string,
    options: string[],
    start: string,
    end: string
  ) => void;
  closePoll: () => void;
  reopenPoll: () => void;
  deletePoll: () => void;
}) {
  const [creatingNew, setCreatingNew] = useState(false);

  if (!poll || creatingNew) {
    return (
      <div>
        <CreatePollForm
          onCreate={(question, options, start, end) => {
            createPoll(question, options, start, end);
            setCreatingNew(false);
          }}
          onCancel={() => setCreatingNew(false)}
        />

        <PollHistory polls={pollHistory} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-ink/65">
          Solo puede existir una encuesta activa a la vez. Crear una nueva
          reemplaza la actual.
        </p>

        <button
          onClick={() => setCreatingNew(true)}
          className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
        >
          <RotateCcw size={13} /> Nueva encuesta
        </button>
      </div>

      <PollResults
        poll={poll}
        isOpen={isOpen}
        onClose={closePoll}
        onReopen={reopenPoll}
        onDelete={deletePoll}
      />

      <PollHistory polls={pollHistory} />
    </div>
  );
}