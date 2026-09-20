import { useState } from 'react';

import {
  Calendar,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

import type { Dish, LunchDay } from '@/data';

import { getDayLabel, getFullDateLabel } from '@/data';

import { REACTIONS } from '@/hooks/useReactions';

const COLOR_OPTIONS = [
  { label: 'Ámbar', value: 'bg-amber-100' },
  { label: 'Verde', value: 'bg-emerald-100' },
  { label: 'Celeste', value: 'bg-sky-100' },
  { label: 'Rosado', value: 'bg-rose-100' },
  { label: 'Lila', value: 'bg-violet-100' },
  { label: 'Lima', value: 'bg-lime-100' },
];

const EMPTY_DISH_FORM = {
  name: '',
  detail: '',
  color: 'bg-amber-100',
  image: '',
  soldOut: false,
};

type DishFormValues = typeof EMPTY_DISH_FORM;

function ReactionMetrics({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <p className="mt-3 text-xs text-black/35">
        Sin reacciones todavía.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-black/5 pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-black/35">
        Reacciones del día ({total})
      </p>

      <div className="mt-2 space-y-1.5">
        {REACTIONS.map(({ emoji, label }) => {
          const count = counts[emoji] ?? 0;
          const percentage =
            total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div
              key={emoji}
              className="flex items-center gap-2 text-xs"
            >
              <span className="shrink-0 text-sm leading-none">
                {emoji}
              </span>

              <span className="w-16 shrink-0 truncate text-black/45">
                {label}
              </span>

              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#f8edef]">
                <div
                  className="h-full rounded-full bg-[#4e0611]"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <span className="w-6 shrink-0 text-right font-medium text-black/50">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DishForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: DishFormValues;
  onSave: (values: DishFormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!form.name.trim()) {
      setError('El nombre del plato es obligatorio.');
      return;
    }

    onSave(form);
  };

  return (
    <div className="min-w-0 rounded-2xl border-2 border-dashed border-[#4e0611]/40 bg-[#f8edef]/60 p-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-black/40">
            Nombre del plato
          </label>

          <input
            value={form.name}
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
            placeholder="Ej. Pollo al horno"
            className="mt-1 w-full min-w-0 rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <div>
          <label className="text-xs text-black/40">
            Acompañamientos / detalle
          </label>

          <textarea
            value={form.detail}
            onChange={(event) =>
              setForm({
                ...form,
                detail: event.target.value,
              })
            }
            rows={2}
            placeholder="Ej. Arroz primavera · Ensalada fresca"
            className="mt-1 w-full min-w-0 resize-none rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <div>
          <label className="text-xs text-black/40">
            Color de fondo
          </label>

          <div className="mt-1.5 flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setForm({
                    ...form,
                    color: option.value,
                  })
                }
                className={`h-7 w-7 rounded-full ${option.value} transition ${
                  form.color === option.value
                    ? 'ring-2 ring-[#4e0611] ring-offset-2'
                    : ''
                }`}
                title={option.label}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-black/40">
            URL de imagen (opcional)
          </label>

          <input
            value={form.image}
            onChange={(event) =>
              setForm({
                ...form,
                image: event.target.value,
              })
            }
            placeholder="https://..."
            className="mt-1 w-full min-w-0 rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-black/50">
          <input
            type="checkbox"
            checked={form.soldOut}
            onChange={(event) =>
              setForm({
                ...form,
                soldOut: event.target.checked,
              })
            }
            className="h-4 w-4 shrink-0 rounded accent-red-500"
          />

          Marcar como agotado
        </label>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#4e0611] py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
        >
          <Check size={13} />
          Guardar plato
        </button>

        <button
          onClick={onCancel}
          className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-medium text-black/50 transition hover:bg-[#f8edef] hover:text-[#4e0611]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function DishRow({
  dish,
  onSave,
  onRemove,
  onToggleSoldOut,
}: {
  dish: Dish;
  onSave: (values: DishFormValues) => void;
  onRemove: () => void;
  onToggleSoldOut: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (editing) {
    return (
      <DishForm
        initial={{
          name: dish.name,
          detail: dish.detail,
          color: dish.color,
          image: dish.image ?? '',
          soldOut: dish.soldOut ?? false,
        }}
        onSave={(values) => {
          onSave(values);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-2xl border border-black/5 p-3 sm:gap-3 ${
        dish.soldOut ? 'bg-red-50/40' : 'bg-white'
      }`}
    >
      <span
        className={`h-10 w-10 shrink-0 overflow-hidden rounded-xl ${dish.color}`}
      >
        {dish.image && (
          <img
            src={dish.image}
            alt={dish.name}
            className="h-full w-full object-cover"
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold">
            {dish.name}
          </p>

          {dish.soldOut && (
            <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-red-600">
              Agotado
            </span>
          )}
        </div>

        <p className="truncate text-xs text-black/45">
          {dish.detail}
        </p>
      </div>

      <div className="flex shrink-0 gap-1 sm:gap-1.5">
        <button
          onClick={onToggleSoldOut}
          title={
            dish.soldOut
              ? 'Marcar como disponible'
              : 'Marcar como agotado'
          }
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
            dish.soldOut
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[#f8edef] text-black/50 hover:bg-black/10'
          }`}
        >
          {dish.soldOut ? (
            <EyeOff size={13} />
          ) : (
            <Eye size={13} />
          )}
        </button>

        <button
          onClick={() => setEditing(true)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
        >
          <Pencil size={13} />
        </button>

        {confirmingDelete ? (
          <button
            onClick={onRemove}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
          >
            <Check size={13} />
          </button>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
        )}

        {confirmingDelete && (
          <button
            onClick={() => setConfirmingDelete(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function NewDayForm({
  existingDates,
  onSave,
  onCancel,
}: {
  existingDates: string[];
  onSave: (date: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!date) {
      setError('Selecciona una fecha.');
      return;
    }

    if (existingDates.includes(date)) {
      setError('Ya existe un día con esta fecha.');
      return;
    }

    onSave(date);
  };

  return (
    <div className="min-w-0 rounded-[24px] border-2 border-dashed border-[#4e0611]/40 bg-white p-5">
      <label className="text-xs text-black/40">
        Fecha del nuevo día
      </label>

      <div className="relative mt-1">
        <Calendar
          className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
          size={15}
        />

        <input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setError(null);
          }}
          className="w-full min-w-0 rounded-xl border border-black/5 bg-[#f8edef] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#4e0611]"
        />
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}

      <p className="mt-2 text-xs text-black/40">
        Podrás agregar los platos de este día justo después de crearlo.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#4e0611] py-2.5 text-xs font-semibold text-white transition hover:bg-[#36040c]"
        >
          <Check size={14} />
          Crear día
        </button>

        <button
          onClick={onCancel}
          className="shrink-0 rounded-full bg-[#f8edef] px-4 py-2.5 text-xs font-medium text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function DayCard({
  day,
  existingDates,
  reactionCounts,
  onUpdateDate,
  onRemoveDay,
  onAddDish,
  onUpdateDish,
  onRemoveDish,
  onToggleSoldOut,
}: {
  day: LunchDay;
  existingDates: string[];
  reactionCounts: Record<string, number>;
  onUpdateDate: (date: string) => void;
  onRemoveDay: () => void;
  onAddDish: (values: DishFormValues) => void;
  onUpdateDish: (dishId: string, values: DishFormValues) => void;
  onRemoveDish: (dishId: string) => void;
  onToggleSoldOut: (dishId: string) => void;
}) {
  const [confirmingDeleteDay, setConfirmingDeleteDay] = useState(false);
  const [addingDish, setAddingDish] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState(day.date);
  const [dateError, setDateError] = useState<string | null>(null);

  const handleSaveDate = () => {
    if (!dateDraft) {
      setDateError('Selecciona una fecha.');
      return;
    }

    if (
      dateDraft !== day.date &&
      existingDates.includes(dateDraft)
    ) {
      setDateError('Ya existe un día con esta fecha.');
      return;
    }

    onUpdateDate(dateDraft);
    setEditingDate(false);
    setDateError(null);
  };

  return (
    <div className="min-w-0 rounded-[24px] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        {editingDate ? (
          <div className="min-w-0 flex-1">
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
                size={14}
              />

              <input
                type="date"
                value={dateDraft}
                onChange={(event) => {
                  setDateDraft(event.target.value);
                  setDateError(null);
                }}
                className="w-full min-w-0 rounded-xl border border-black/5 bg-[#f8edef] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#4e0611]"
              />
            </div>

            {dateError && (
              <p className="mt-1 text-xs text-red-500">
                {dateError}
              </p>
            )}

            <div className="mt-2 flex gap-2">
              <button
                onClick={handleSaveDate}
                className="rounded-full bg-[#4e0611] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#36040c]"
              >
                Guardar
              </button>

              <button
                onClick={() => {
                  setEditingDate(false);
                  setDateDraft(day.date);
                  setDateError(null);
                }}
                className="rounded-full bg-[#f8edef] px-3 py-1.5 text-xs font-medium text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingDate(true)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-xs font-medium uppercase tracking-wider text-black/40 transition hover:text-[#4e0611]">
              {getFullDateLabel(day.date)}
            </p>

            <p className="truncate text-sm font-semibold">
              {getDayLabel(day.date)} · {day.dishes.length}{' '}
              plato{day.dishes.length === 1 ? '' : 's'}
            </p>
          </button>
        )}

        {!editingDate && (
          <div className="flex shrink-0 gap-1.5">
            {confirmingDeleteDay ? (
              <button
                onClick={onRemoveDay}
                className="grid h-9 w-9 place-items-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
              >
                <Check size={14} />
              </button>
            ) : (
              <button
                onClick={() => setConfirmingDeleteDay(true)}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}

            {confirmingDeleteDay && (
              <button
                onClick={() => setConfirmingDeleteDay(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {day.dishes.map((dish) => (
          <DishRow
            key={dish.id}
            dish={dish}
            onSave={(values) => onUpdateDish(dish.id, values)}
            onRemove={() => onRemoveDish(dish.id)}
            onToggleSoldOut={() => onToggleSoldOut(dish.id)}
          />
        ))}

        {addingDish ? (
          <DishForm
            initial={EMPTY_DISH_FORM}
            onSave={(values) => {
              onAddDish(values);
              setAddingDish(false);
            }}
            onCancel={() => setAddingDish(false)}
          />
        ) : (
          <button
            onClick={() => setAddingDish(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-black/10 py-3 text-xs font-medium text-black/45 transition hover:border-[#4e0611]/40 hover:text-[#4e0611]"
          >
            <Plus size={14} />
            Agregar plato a este día
          </button>
        )}
      </div>

      <ReactionMetrics counts={reactionCounts} />
    </div>
  );
}

export function AdminMenuView({
  menu,
  addDay,
  updateDayDate,
  removeDay,
  addDish,
  updateDish,
  removeDish,
  toggleSoldOut,
  resetMenu,
  getReactionCounts,
}: {
  menu: LunchDay[];
  addDay: (date: string) => void;
  updateDayDate: (dayId: string, date: string) => void;
  removeDay: (dayId: string) => void;
  addDish: (dayId: string, dish: Omit<Dish, 'id'>) => void;
  updateDish: (
    dayId: string,
    dishId: string,
    updates: Partial<Dish>
  ) => void;
  removeDish: (dayId: string, dishId: string) => void;
  toggleSoldOut: (dayId: string, dishId: string) => void;
  resetMenu: () => void;
  getReactionCounts: (dayId: string) => Record<string, number>;
}) {
  const [addingDay, setAddingDay] = useState(false);

  const existingDates = menu.map((day) => day.date);

  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-black/45">
          Agrega días y sus platos. Marca un plato como agotado cuando se termine.
        </p>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={resetMenu}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-medium text-black/45 transition hover:bg-[#f8edef] hover:text-[#4e0611]"
          >
            <RotateCcw size={13} />
            Restaurar
          </button>

          <button
            onClick={() => setAddingDay(true)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
          >
            <Plus size={13} />
            Nuevo día
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {addingDay && (
          <NewDayForm
            existingDates={existingDates}
            onSave={(date) => {
              addDay(date);
              setAddingDay(false);
            }}
            onCancel={() => setAddingDay(false)}
          />
        )}

        {menu.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            existingDates={existingDates}
            reactionCounts={getReactionCounts(day.id)}
            onUpdateDate={(date) =>
              updateDayDate(day.id, date)
            }
            onRemoveDay={() => removeDay(day.id)}
            onAddDish={(values) =>
              addDish(day.id, values)
            }
            onUpdateDish={(dishId, values) =>
              updateDish(day.id, dishId, values)
            }
            onRemoveDish={(dishId) =>
              removeDish(day.id, dishId)
            }
            onToggleSoldOut={(dishId) =>
              toggleSoldOut(day.id, dishId)
            }
          />
        ))}
      </div>

      {menu.length === 0 && !addingDay && (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white p-8 text-center sm:p-14">
          <Calendar
            className="text-black/20"
            size={32}
          />

          <p className="mt-4 text-sm text-black/45">
            No hay menús cargados. Agrega el primero con el botón
            "Nuevo día".
          </p>
        </div>
      )}
    </div>
  );
}