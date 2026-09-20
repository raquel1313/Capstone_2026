import { useState } from 'react';

import { Calendar, Check, Lock, Plus, RotateCcw, Trash2, Unlock, X } from 'lucide-react';

import type { VotePoll } from '@/hooks/useVotes';

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
      <p className="text-xs font-medium uppercase tracking-wider text-black/40">
        Nueva encuesta
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs text-black/40">Pregunta</label>

          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <div>
          <label className="text-xs text-black/40">Alternativas</label>

          <div className="mt-1.5 space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Alternativa ${index + 1}`}
                  className="w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
                />

                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f8edef] text-black/40 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addOption}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#4e0611] hover:text-[#36040c]"
          >
            <Plus size={13} /> Agregar alternativa
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/40">Fecha de inicio</label>

            <div className="relative mt-1">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
                size={14}
              />

              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-black/5 bg-[#f8edef] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#4e0611]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-black/40">Fecha de término</label>

            <div className="relative mt-1">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
                size={14}
              />

              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-black/5 bg-[#f8edef] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#4e0611]"
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#4e0611] py-2.5 text-xs font-semibold text-white hover:bg-[#36040c]"
        >
          <Check size={14} /> Crear encuesta
        </button>

        <button
          onClick={onCancel}
          className="rounded-full bg-[#f8edef] px-4 py-2.5 text-xs font-medium text-black/50 hover:bg-black/10"
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
                  ? 'bg-[#e8eee7] text-[#4d7157]'
                  : 'bg-black/5 text-black/45'
              }`}
            >
              {isOpen ? 'Abierta' : 'Cerrada'}
            </span>

            <span className="text-xs text-black/40">
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

          <p className="mt-1 text-xs text-black/40">
            {totalVotes} voto{totalVotes !== 1 ? 's' : ''} en total
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          {poll.active ? (
            <button
              onClick={onClose}
              title="Cerrar votación"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
            >
              <Lock size={14} />
            </button>
          ) : (
            <button
              onClick={onReopen}
              title="Reabrir votación"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
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
              className="grid h-9 w-9 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}

          {confirmingDelete && (
            <button
              onClick={() => setConfirmingDelete(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10"
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
                    isWinner ? 'text-[#4e0611]' : 'text-black/70'
                  }`}
                >
                  {option.label}
                </span>

                <span className="text-black/45">
                  {option.votes} · {percentage}%
                </span>
              </div>

              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#f8edef]">
                <div
                  className={`h-full rounded-full transition-all ${
                    isWinner ? 'bg-[#4e0611]' : 'bg-black/15'
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

export function AdminVotesView({
  poll,
  isOpen,
  createPoll,
  closePoll,
  reopenPoll,
  deletePoll,
}: {
  poll: VotePoll | null;
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
      <CreatePollForm
        onCreate={(question, options, start, end) => {
          createPoll(question, options, start, end);
          setCreatingNew(false);
        }}
        onCancel={() => setCreatingNew(false)}
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-black/45">
          Solo puede existir una encuesta activa a la vez. Crear una nueva
          reemplaza la actual.
        </p>

        <button
          onClick={() => setCreatingNew(true)}
          className="flex items-center gap-1.5 rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
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
    </div>
  );
}