import { useMemo, useState } from 'react';
import Image from 'next/image';

import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import type { Dish, LunchDay } from '@/data';
import { getDayLabel, getFullDateLabel } from '@/data';
import { REACTIONS } from '@/hooks/useReactions';
import { useResettingPage } from '@/hooks/useResettingPage';
import {
  ProductImageField,
  discardUploadedImage,
  type ProductImageValue,
} from '@/components/admin/ProductImageField';

// Múltiplo de 3 para que la grilla de 3 columnas quede simétrica
const PAGE_SIZE = 18;

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

function toYearMonth(dateStr: string): string {
  return dateStr.split('T')[0].slice(0, 7);
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isCurrentWeekDay(dateStr: string): boolean {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) return false;

  const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  targetDate.setHours(0, 0, 0, 0);

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb

  const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  const day = targetDate.getDay();
  return day >= 1 && day <= 5 && targetDate >= monday && targetDate <= friday;
}

function ReactionMetrics({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <p className="mt-3 text-xs text-ink/65">
        Sin reacciones todavía.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-ink/10 pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink/65">
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

              <span className="w-16 shrink-0 truncate text-ink/65">
                {label}
              </span>

              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-soft">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <span className="w-6 shrink-0 text-right font-medium text-ink/65">
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
  const [imageValue, setImageValue] = useState<ProductImageValue>({
    imageUrl: initial.image,
    imagePath: null,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!form.name.trim()) {
      setError('El nombre del plato es obligatorio.');
      return;
    }

    onSave({
      ...form,
      image: imageValue.imageUrl,
    });
  };

  const handleCancel = () => {
    if (imageValue.imagePath) {
      void discardUploadedImage(imageValue.imagePath);
    }
    onCancel();
  };

  return (
    <div className="min-w-0 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft/60 p-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-ink/65">
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
            className="mt-1 w-full min-w-0 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="text-xs text-ink/65">
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
            className="mt-1 w-full min-w-0 resize-none rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="text-xs text-ink/65">
            Color de fondo
          </label>

          <div className="mt-1.5 flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    color: option.value,
                  })
                }
                className={`h-7 w-7 rounded-full ${option.value} transition ${
                  form.color === option.value
                    ? 'ring-2 ring-brand ring-offset-2'
                    : ''
                }`}
                title={option.label}
              />
            ))}
          </div>
        </div>

        <ProductImageField
          label="Imagen del plato (opcional)"
          value={imageValue}
          savedPath={null}
          onChange={(next) => {
            setImageValue(next);
            setForm((prev) => ({ ...prev, image: next.imageUrl }));
          }}
        />

        <label className="flex items-center gap-2 text-xs text-ink/65">
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
          type="button"
          onClick={handleSave}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
        >
          <Check size={13} />
          Guardar plato
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-medium text-ink/65 transition hover:bg-brand-soft hover:text-brand"
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
          image:
            typeof dish.image === 'string'
              ? dish.image
              : (dish.image as { src?: string } | undefined)?.src ?? '',
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
      className={`flex min-w-0 items-center gap-2 rounded-2xl border border-ink/10 p-3 sm:gap-3 ${
        dish.soldOut ? 'bg-red-50/40' : 'bg-white'
      }`}
    >
      <span
        className={`h-10 w-10 shrink-0 overflow-hidden rounded-xl ${dish.color}`}
      >
        {dish.image && (
          <Image
            src={dish.image}
            alt={dish.name}
            width={40}
            height={40}
            unoptimized
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

        <p className="truncate text-xs text-ink/65">
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
              : 'bg-brand-soft text-ink/65 hover:bg-ink/10'
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
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-ink/10 hover:text-brand"
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
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
        )}

        {confirmingDelete && (
          <button
            onClick={() => setConfirmingDelete(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-ink/10"
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
    <div className="min-w-0 rounded-[24px] border-2 border-dashed border-brand/40 bg-white p-5">
      <label className="text-xs text-ink/65">
        Fecha del nuevo día
      </label>

      <div className="relative mt-1">
        <Calendar
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/65"
          size={15}
        />

        <input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setError(null);
          }}
          className="w-full min-w-0 rounded-xl border border-ink/10 bg-brand-soft py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
        />
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}

      <p className="mt-2 text-xs text-ink/65">
        Podrás agregar los platos de este día justo después de crearlo.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
        >
          <Check size={14} />
          Crear día
        </button>

        <button
          onClick={onCancel}
          className="shrink-0 rounded-full bg-brand-soft px-4 py-2.5 text-xs font-medium text-ink/65 transition hover:bg-ink/10 hover:text-brand"
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

  const isActiveWeek = isCurrentWeekDay(day.date);

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
    <div
      className={`min-w-0 rounded-[24px] bg-white p-4 transition-all sm:p-5 ${
        isActiveWeek
          ? 'ring-2 ring-brand/30 shadow-sm'
          : 'opacity-85 hover:opacity-100'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {editingDate ? (
          <div className="min-w-0 flex-1">
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/65"
                size={14}
              />

              <input
                type="date"
                value={dateDraft}
                onChange={(event) => {
                  setDateDraft(event.target.value);
                  setDateError(null);
                }}
                className="w-full min-w-0 rounded-xl border border-ink/10 bg-brand-soft py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
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
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
              >
                Guardar
              </button>

              <button
                onClick={() => {
                  setEditingDate(false);
                  setDateDraft(day.date);
                  setDateError(null);
                }}
                className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-ink/65 transition hover:bg-ink/10 hover:text-brand"
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
            <div className="flex items-center gap-2">
              <p className="truncate text-xs font-medium uppercase tracking-wider text-ink/65 transition hover:text-brand">
                {getFullDateLabel(day.date)}
              </p>

              {isActiveWeek && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </span>
              )}
            </div>

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
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}

            {confirmingDeleteDay && (
              <button
                onClick={() => setConfirmingDeleteDay(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-ink/65 transition hover:bg-ink/10"
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
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-ink/15 py-3 text-xs font-medium text-ink/65 transition hover:border-brand/40 hover:text-brand"
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
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('todos');

  const existingDates = menu.map((day) => day.date);

  // Meses disponibles extraídos dinámicamente de los días cargados
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    menu.forEach((day) => {
      const ym = toYearMonth(day.date);
      if (ym) months.add(ym);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [menu]);

  // Filtrar según mes y término de búsqueda (fecha, nombre de plato o detalle)
  const filteredMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return menu.filter((day) => {
      if (monthFilter !== 'todos' && toYearMonth(day.date) !== monthFilter) {
        return false;
      }

      if (!query) return true;

      const matchDate = day.date.toLowerCase().includes(query);
      const matchLabel =
        getFullDateLabel(day.date).toLowerCase().includes(query) ||
        getDayLabel(day.date).toLowerCase().includes(query);
      const matchDish = day.dishes.some(
        (dish) =>
          dish.name.toLowerCase().includes(query) ||
          dish.detail.toLowerCase().includes(query)
      );

      return matchDate || matchLabel || matchDish;
    });
  }, [menu, monthFilter, searchQuery]);

  // Ordenar priorizando los días hábiles de la semana actual
  const sortedMenu = useMemo(() => {
    const currentWeekDays = filteredMenu.filter((day) => isCurrentWeekDay(day.date));
    const otherDays = filteredMenu.filter((day) => !isCurrentWeekDay(day.date));

    currentWeekDays.sort((a, b) => a.date.localeCompare(b.date));
    otherDays.sort((a, b) => b.date.localeCompare(a.date));

    return [...currentWeekDays, ...otherDays];
  }, [filteredMenu]);

  // Volver a página 1 al cambiar filtro o búsqueda
  const [page, setPage] = useResettingPage(
    String(searchQuery) + '|' + String(monthFilter)
  );

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(sortedMenu.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedMenu = sortedMenu.slice(startIndex, startIndex + PAGE_SIZE);

  const hasActiveFilters = searchQuery.trim() !== '' || monthFilter !== 'todos';

  const clearFilters = () => {
    setSearchQuery('');
    setMonthFilter('todos');
    setPage(1);
  };

  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-ink/65">
          Agrega días y sus platos. Los días de la semana actual se muestran primero.
        </p>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={resetMenu}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-medium text-ink/65 transition hover:bg-brand-soft hover:text-brand"
          >
            <RotateCcw size={13} />
            Actualizar
          </button>

          <button
            onClick={() => {
              setAddingDay(true);
              setPage(1);
            }}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus size={13} />
            Nuevo día
          </button>
        </div>
      </div>

      {/* Buscador y filtro por mes */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/65"
          />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por fecha, día o nombre de plato..."
            className="w-full rounded-2xl border border-ink/10 bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-brand"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/65 hover:text-ink/75"
              title="Limpiar búsqueda"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          aria-label="Filtrar menús por mes"
          className={`rounded-2xl border px-4 py-2.5 text-sm font-medium outline-none transition sm:w-52 ${
            monthFilter !== 'todos'
              ? 'border-brand bg-brand text-white'
              : 'border-ink/10 bg-white text-ink/75 hover:border-brand/40'
          }`}
        >
          <option value="todos" className="bg-white text-ink">
            Todos los meses
          </option>
          {monthOptions.map((ym) => (
            <option key={ym} value={ym} className="bg-white text-ink">
              {formatMonthLabel(ym)}
            </option>
          ))}
        </select>
      </div>

      {/* Barra superior de paginación */}
      {sortedMenu.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-ink/65">
          <span>
            Mostrando{' '}
            <strong className="font-semibold text-ink/85">
              {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, sortedMenu.length)}
            </strong>{' '}
            de{' '}
            <strong className="font-semibold text-ink/85">
              {sortedMenu.length}
            </strong>{' '}
            {sortedMenu.length === 1 ? 'día' : 'días'}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {addingDay && currentPage === 1 && (
          <NewDayForm
            existingDates={existingDates}
            onSave={(date) => {
              addDay(date);
              setAddingDay(false);
            }}
            onCancel={() => setAddingDay(false)}
          />
        )}

        {paginatedMenu.map((day) => (
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

      {/* Barra inferior de paginación */}
      {totalPages > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white px-5 py-3 text-xs text-ink/65">
          <span>
            Mostrando{' '}
            <strong className="font-semibold text-ink/85">
              {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, sortedMenu.length)}
            </strong>{' '}
            de{' '}
            <strong className="font-semibold text-ink/85">
              {sortedMenu.length}
            </strong>{' '}
            días
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

      {sortedMenu.length === 0 && !addingDay && (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white p-8 text-center sm:p-14">
          <Calendar
            className="text-ink/65"
            size={32}
          />

          <p className="mt-4 text-sm text-ink/65">
            {hasActiveFilters
              ? 'No se encontraron menús que coincidan con los filtros aplicados.'
              : 'No hay menús cargados. Agrega el primero con el botón «Nuevo día».'}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-full bg-brand px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}