import { useMemo, useState } from 'react';

import Image from 'next/image';
import {
  AlertTriangle,
  Ban,
  Calendar,
  Clock,
  PackageCheck,
  Search,
  ShieldAlert,
  Trash2,
  User,
  X,
} from 'lucide-react';

import type { CancelledBy, Order, OrderItem, OrderStatus } from '@/types';

import { formatPrice } from '@/data';

import type { BlockedUser } from '@/hooks/usePenalties';

import { formatDateTime } from '@/utils/orderRules';

import logo from '@/assets/images/logo2.png';

type StatusFilter = 'todos' | OrderStatus;
type DatePreset = 'todo' | 'hoy' | 'ayer' | '7dias' | 'rango';
type TimeBand = 'todas' | 'almuerzo' | 'fuera';
type SortMode = 'recientes' | 'antiguos' | 'mayor' | 'menor';

const STATUS_OPTIONS: StatusFilter[] = [
  'todos',
  'pendiente',
  'listo',
  'retirado',
  'cancelado',
];

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7dias', label: 'Últimos 7 días' },
  { id: 'rango', label: 'Rango' },
];

const CANCEL_REASONS = [
  'Producto agotado',
  'Solicitud del cliente',
  'Error en el pedido',
  'Otro motivo',
];

// Mismo horario que se muestra a los estudiantes: 11:30 a 15:00
const LUNCH_START = 11 * 60 + 30;
const LUNCH_END = 15 * 60;

const SELECT_CLASS =
  'mt-1 w-full rounded-xl border border-black/5 bg-[#f5f5f3] px-3 py-2 text-sm outline-none transition focus:border-[#4e0611]';

const BADGES: Record<OrderStatus, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-[#f8edef] text-black/50' },
  listo: { label: 'Listo', className: 'bg-[#f8edef] text-[#4e0611]' },
  retirado: { label: 'Retirado', className: 'bg-emerald-50 text-emerald-700' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-700' },
};

// Fecha local en formato YYYY-MM-DD (createdAt viene en UTC, aquí se pasa a hora local)
function toLocalISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);

  return copy;
}

function statusLabel(status: StatusFilter, pendingTotal: number) {
  if (status === 'todos') return 'Todos';
  if (status === 'pendiente') return `Pendientes (${pendingTotal})`;
  if (status === 'listo') return 'Listos';
  if (status === 'retirado') return 'Retirados';
  return 'Cancelados';
}

function CancelPanel({
  soldOutNames,
  onConfirm,
  onClose,
}: {
  soldOutNames: string[];
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(
    soldOutNames.length > 0 ? 'Producto agotado' : 'Solicitud del cliente'
  );
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (reason === 'Otro motivo') {
      if (!custom.trim()) {
        setError('Escribe el motivo de la cancelación.');
        return;
      }

      onConfirm(custom.trim());
      return;
    }

    if (reason === 'Producto agotado' && soldOutNames.length > 0) {
      onConfirm(`Producto agotado: ${soldOutNames.join(', ')}`);
      return;
    }

    onConfirm(reason);
  };

  return (
    <div className="mt-4 rounded-2xl bg-red-50 p-4">
      <p className="text-xs font-semibold text-red-700">
        Cancelar este pedido
      </p>

      <label className="mt-2 block text-xs text-black/60">
        Motivo (se le muestra al cliente)
        <select
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError(null);
          }}
          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
        >
          {CANCEL_REASONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {reason === 'Otro motivo' && (
        <input
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            setError(null);
          }}
          placeholder="Escribe el motivo"
          aria-label="Motivo de la cancelación"
          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
        />
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 rounded-full bg-red-600 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          Confirmar cancelación
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black/55 transition hover:bg-black/5"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

function RemoveItemPanel({
  item,
  isShortage,
  wouldCancel,
  onConfirm,
  onClose,
}: {
  item: OrderItem;
  isShortage: boolean;
  wouldCancel: boolean;
  onConfirm: (quantity: number, reason: string) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [reason, setReason] = useState(
    isShortage ? 'Producto agotado' : 'Solicitud del cliente'
  );
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const removesEverything = wouldCancel && quantity >= item.quantity;

  const handleConfirm = () => {
    let finalReason = reason;

    if (reason === 'Otro motivo') {
      finalReason = custom.trim();
    } else if (reason === 'Producto agotado') {
      finalReason = `Producto agotado: ${item.name}`;
    }

    if (!finalReason) {
      setError('Escribe el motivo.');
      return;
    }

    onConfirm(quantity, finalReason);
  };

  return (
    <div className="mt-3 rounded-2xl bg-red-50 p-4">
      <p className="text-xs font-semibold text-red-700">
        Quitar {item.name} del pedido
      </p>

      {item.quantity > 1 && (
        <label className="mt-2 block text-xs text-black/60">
          Cantidad a quitar
          <select
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
          >
            {Array.from({ length: item.quantity }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            )}
          </select>
        </label>
      )}

      <label className="mt-2 block text-xs text-black/60">
        Motivo (se le muestra al cliente)
        <select
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError(null);
          }}
          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
        >
          {CANCEL_REASONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {reason === 'Otro motivo' && (
        <input
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            setError(null);
          }}
          placeholder="Escribe el motivo"
          aria-label="Motivo"
          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
        />
      )}

      {removesEverything && (
        <p className="mt-2 text-xs font-medium text-red-700">
          Es el último producto del pedido: al quitarlo, el pedido se cancela.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 rounded-full bg-red-600 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          Quitar
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black/55 transition hover:bg-black/5"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

export function AdminOrdersView({
  orders,
  updateStatus,
  cancelOrder,
  retireOrder,
  removeOrderItem,
  shortageProductIds,
  blockedUsers,
  liftBlock,
}: {
  orders: Order[];
  updateStatus: (id: string, status: OrderStatus) => void;
  cancelOrder: (id: string, by: CancelledBy, reason: string) => void;
  retireOrder: (id: string) => void;
  removeOrderItem: (
    orderId: string,
    itemId: number,
    quantity: number,
    by: CancelledBy,
    reason: string
  ) => void;
  shortageProductIds: number[];
  blockedUsers: BlockedUser[];
  liftBlock: (username: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [datePreset, setDatePreset] = useState<DatePreset>('todo');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('todos');
  const [timeBand, setTimeBand] = useState<TimeBand>('todas');
  const [sortMode, setSortMode] = useState<SortMode>('recientes');
  const [onlyAffected, setOnlyAffected] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{
    orderId: string;
    itemId: number;
  } | null>(null);
  const [liftingUser, setLiftingUser] = useState<string | null>(null);

  const shortageSet = new Set(shortageProductIds);

  // Pedido pendiente que incluye algún producto con faltante real
  const isAffected = (order: Order) =>
    order.status === 'pendiente' &&
    order.items.some((item) => shortageSet.has(item.id));

  const affectedCount = orders.filter(isAffected).length;
  const showOnlyAffected = onlyAffected && affectedCount > 0;

  // Productos que aparecen en algún pedido, para el selector
  const productOptions = useMemo(() => {
    const map = new Map<number, string>();

    orders.forEach((order) =>
      order.items.forEach((item) => map.set(item.id, item.name))
    );

    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'es')
    );
  }, [orders]);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = toLocalISODate(now);
    const yesterday = toLocalISODate(addDays(now, -1));
    const sevenDaysAgo = toLocalISODate(addDays(now, -6));
    const query = search.trim().toLowerCase();

    const matches = orders.filter((order) => {
      const created = new Date(order.createdAt);
      const orderDate = toLocalISODate(created);
      const minutes = created.getHours() * 60 + created.getMinutes();

      // Estado
      if (statusFilter !== 'todos' && order.status !== statusFilter) {
        return false;
      }

      // Fecha
      if (datePreset === 'hoy' && orderDate !== today) return false;
      if (datePreset === 'ayer' && orderDate !== yesterday) return false;

      if (
        datePreset === '7dias' &&
        (orderDate < sevenDaysAgo || orderDate > today)
      ) {
        return false;
      }

      if (datePreset === 'rango') {
        if (dateFrom && orderDate < dateFrom) return false;
        if (dateTo && orderDate > dateTo) return false;
      }

      // Franja horaria
      const inLunch = minutes >= LUNCH_START && minutes < LUNCH_END;

      if (timeBand === 'almuerzo' && !inLunch) return false;
      if (timeBand === 'fuera' && inLunch) return false;

      // Producto
      if (
        productId !== 'todos' &&
        !order.items.some((item) => String(item.id) === productId)
      ) {
        return false;
      }

      // Búsqueda por número de retiro o por estudiante
      // (los pedidos antiguos pueden no tener username, por eso el respaldo)
      if (
        query &&
        !order.id.toLowerCase().includes(query) &&
        !(order.username ?? '').toLowerCase().includes(query)
      ) {
        return false;
      }

      return true;
    });

    return matches.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      switch (sortMode) {
        case 'antiguos':
          return timeA - timeB;
        case 'mayor':
          return b.subtotal - a.subtotal;
        case 'menor':
          return a.subtotal - b.subtotal;
        default:
          return timeB - timeA;
      }
    });
  }, [
    orders,
    statusFilter,
    datePreset,
    dateFrom,
    dateTo,
    search,
    productId,
    timeBand,
    sortMode,
  ]);

  const visible = showOnlyAffected ? filtered.filter(isAffected) : filtered;

  const pendingTotal = orders.filter((o) => o.status === 'pendiente').length;

  // Los cancelados no cuentan como pedidos; el pago es al retirar, así que
  // solo los retirados suman al total
  const activeVisible = visible.filter((o) => o.status !== 'cancelado');

  const retiredTotal = visible
    .filter((o) => o.status === 'retirado')
    .reduce((sum, o) => sum + o.subtotal, 0);

  const visibleToPickUp = visible.filter(
    (o) => o.status === 'pendiente' || o.status === 'listo'
  ).length;

  const visibleCancelled = visible.filter((o) => o.status === 'cancelado').length;

  const hasActiveFilters =
    statusFilter !== 'todos' ||
    datePreset !== 'todo' ||
    search.trim() !== '' ||
    productId !== 'todos' ||
    timeBand !== 'todas' ||
    showOnlyAffected;

  const clearFilters = () => {
    setStatusFilter('todos');
    setDatePreset('todo');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setProductId('todos');
    setTimeBand('todas');
    setSortMode('recientes');
    setOnlyAffected(false);
  };

  return (
    <div>
      {/* Clientes bloqueados por acumular faltas */}
      {blockedUsers.length > 0 && (
        <div className="mb-5 rounded-[24px] bg-white p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-700" />

            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
              Clientes bloqueados
            </h3>
          </div>

          <p className="mt-1 text-xs text-black/40">
            Acumularon faltas y no pueden hacer pedidos hasta que termine el
            bloqueo. Levantarlo también borra sus faltas.
          </p>

          <ul className="mt-3 space-y-2">
            {blockedUsers.map((blocked) => (
              <li
                key={blocked.username}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f5f5f3] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {blocked.username}
                  </p>

                  <p className="text-xs text-black/45">
                    Bloqueado hasta el {formatDateTime(blocked.until)}
                  </p>
                </div>

                {liftingUser === blocked.username ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        liftBlock(blocked.username);
                        setLiftingUser(null);
                      }}
                      className="rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
                    >
                      Confirmar
                    </button>

                    <button
                      type="button"
                      onClick={() => setLiftingUser(null)}
                      className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black/55 transition hover:bg-black/5"
                    >
                      Volver
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLiftingUser(blocked.username)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#4e0611] transition hover:bg-[#f8edef]"
                  >
                    Levantar bloqueo
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Aviso de pedidos con productos agotados */}
      {affectedCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />

            <span>
              {affectedCount === 1
                ? '1 pedido pendiente incluye un producto agotado.'
                : `${affectedCount} pedidos pendientes incluyen productos agotados.`}{' '}
              Quita el producto o cancela los pedidos que no se puedan preparar.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOnlyAffected((value) => !value)}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            {showOnlyAffected ? 'Ver todos' : 'Ver solo estos'}
          </button>
        </div>
      )}

      {/* Resumen de lo que se está viendo */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-black/40">Pedidos</p>
          <p className="mt-1 text-xl font-semibold">{activeVisible.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-black/40">Total retirado</p>
          <p className="mt-1 text-xl font-semibold text-[#4e0611]">
            {formatPrice(retiredTotal)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-black/40">Por retirar</p>
          <p className="mt-1 text-xl font-semibold">{visibleToPickUp}</p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-black/40">Cancelados</p>
          <p className="mt-1 text-xl font-semibold">{visibleCancelled}</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="mb-5 space-y-4 rounded-[24px] bg-white p-5">
        {/* Búsqueda */}
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30"
            size={16}
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por número de retiro o correo del estudiante"
            className="w-full rounded-xl border border-black/5 bg-[#f5f5f3] py-2.5 pl-11 pr-10 text-sm outline-none transition placeholder:text-black/30 focus:border-[#4e0611]"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Borrar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-[#4e0611]"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Estado */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setStatusFilter(option)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                statusFilter === option
                  ? 'bg-[#4e0611] text-white'
                  : 'bg-[#f5f5f3] text-black/50 hover:bg-[#f8edef] hover:text-[#4e0611]'
              }`}
            >
              {statusLabel(option, pendingTotal)}
            </button>
          ))}
        </div>

        {/* Fecha */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-black/40">
            <Calendar size={13} />
            Fecha
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DATE_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                onClick={() => setDatePreset(preset.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  datePreset === preset.id
                    ? 'bg-[#4e0611] text-white'
                    : 'bg-[#f5f5f3] text-black/55 hover:bg-[#f8edef] hover:text-[#4e0611]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {datePreset === 'rango' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-black/40">
                Desde
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className={SELECT_CLASS}
                />
              </label>

              <label className="text-xs text-black/40">
                Hasta
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className={SELECT_CLASS}
                />
              </label>
            </div>
          )}
        </div>

        {/* Producto, franja horaria y orden */}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-black/40">
            Producto
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="todos">Todos los productos</option>

              {productOptions.map((product) => (
                <option key={product.id} value={String(product.id)}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-black/40">
            Horario
            <select
              value={timeBand}
              onChange={(event) => setTimeBand(event.target.value as TimeBand)}
              className={SELECT_CLASS}
            >
              <option value="todas">Todo el día</option>
              <option value="almuerzo">Horario de almuerzo (11:30 a 15:00)</option>
              <option value="fuera">Fuera del horario de almuerzo</option>
            </select>
          </label>

          <label className="text-xs text-black/40">
            Ordenar por
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className={SELECT_CLASS}
            >
              <option value="recientes">Más recientes primero</option>
              <option value="antiguos">Más antiguos primero</option>
              <option value="mayor">Mayor monto</option>
              <option value="menor">Menor monto</option>
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs font-medium text-[#4e0611] hover:underline"
          >
            <X size={13} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Resultados */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white p-14 text-center">
          <Image
            src={logo}
            alt=""
            className="h-14 w-auto animate-bounce"
          />

          <p className="mt-4 text-sm text-black/45">
            {orders.length === 0
              ? 'Todavía no hay pedidos.'
              : 'Ningún pedido coincide con los filtros seleccionados.'}
          </p>

          {orders.length > 0 && hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-full bg-[#4e0611] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#36040c]"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((order) => {
            const cancelled = order.status === 'cancelado';
            const pending = order.status === 'pendiente';
            const badge = BADGES[order.status];

            const shortageItems = pending
              ? order.items.filter((item) => shortageSet.has(item.id))
              : [];

            return (
              <div key={order.id} className="rounded-[24px] bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-black/40">Número de retiro</p>

                    <p
                      className={`text-2xl font-bold tracking-widest ${
                        cancelled
                          ? 'text-black/30 line-through'
                          : 'text-[#4e0611]'
                      }`}
                    >
                      {order.id}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-black/40">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />

                    {new Date(order.createdAt).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    ·{' '}
                    {new Date(order.createdAt).toLocaleTimeString('es-CL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <span className="flex min-w-0 items-center gap-1.5">
                    <User size={12} className="shrink-0" />
                    <span className="truncate">
                      {order.username ?? 'Sin usuario'}
                    </span>
                  </span>
                </div>

                {shortageItems.length > 0 && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />

                    <span>
                      Incluye un producto agotado:{' '}
                      {shortageItems.map((item) => item.name).join(', ')}.
                    </span>
                  </div>
                )}

                <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span
                          className={`min-w-0 flex-1 truncate ${
                            cancelled ? 'text-black/35' : 'text-black/65'
                          }`}
                        >
                          {item.quantity}x {item.name}
                        </span>

                        <span
                          className={`shrink-0 font-medium ${
                            cancelled ? 'text-black/35' : ''
                          }`}
                        >
                          {formatPrice(item.price * item.quantity)}
                        </span>

                        {pending && (
                          <button
                            type="button"
                            onClick={() =>
                              setRemoving(
                                removing?.orderId === order.id &&
                                  removing.itemId === item.id
                                  ? null
                                  : { orderId: order.id, itemId: item.id }
                              )
                            }
                            aria-label={`Quitar ${item.name} del pedido`}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f5f5f3] text-black/45 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {removing?.orderId === order.id &&
                        removing.itemId === item.id && (
                          <RemoveItemPanel
                            item={item}
                            isShortage={shortageSet.has(item.id)}
                            wouldCancel={order.items.length === 1}
                            onConfirm={(quantity, reason) => {
                              removeOrderItem(
                                order.id,
                                item.id,
                                quantity,
                                'personal',
                                reason
                              );
                              setRemoving(null);
                            }}
                            onClose={() => setRemoving(null)}
                          />
                        )}
                    </li>
                  ))}
                </ul>

                {(order.adjustments?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-0.5">
                    {order.adjustments?.map((adjustment) => (
                      <li key={adjustment.at} className="text-[11px] text-black/40">
                        Se quitó {adjustment.quantity}x {adjustment.name} (
                        {adjustment.by === 'personal' ? 'casino' : 'cliente'}:{' '}
                        {adjustment.reason})
                      </li>
                    ))}
                  </ul>
                )}

                {cancelled ? (
                  <div className="mt-4 border-t border-black/5 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-black/30 line-through">
                        {formatPrice(order.subtotal)}
                      </span>

                      {order.cancelledAt && (
                        <span className="text-xs text-black/40">
                          {new Date(order.cancelledAt).toLocaleDateString(
                            'es-CL',
                            { day: 'numeric', month: 'short' }
                          )}{' '}
                          ·{' '}
                          {new Date(order.cancelledAt).toLocaleTimeString(
                            'es-CL',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-red-700">
                      {order.cancelledBy === 'cliente'
                        ? 'Cancelado por el cliente'
                        : `Cancelado por el casino${
                            order.cancelReason ? ` · ${order.cancelReason}` : ''
                          }`}
                    </p>
                  </div>
                ) : order.status === 'retirado' ? (
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/5 pt-4">
                    <span className="text-sm font-semibold">
                      {formatPrice(order.subtotal)}
                    </span>

                    <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                      <PackageCheck size={13} />
                      Entregado
                      {order.retiredAt
                        ? ` a las ${new Date(order.retiredAt).toLocaleTimeString(
                            'es-CL',
                            { hour: '2-digit', minute: '2-digit' }
                          )}`
                        : ''}
                      {order.retiredBy ? ` · ${order.retiredBy}` : ''}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-4">
                      <span className="text-sm font-semibold">
                        {formatPrice(order.subtotal)}
                      </span>

                      {pending ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCancellingId(
                                cancellingId === order.id ? null : order.id
                              )
                            }
                            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                              shortageItems.length > 0
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-[#f5f5f3] text-black/60 hover:bg-red-50 hover:text-red-700'
                            }`}
                          >
                            <Ban size={13} />
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={() => updateStatus(order.id, 'listo')}
                            className="rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
                          >
                            Marcar como listo
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateStatus(order.id, 'pendiente')}
                            className="rounded-full bg-[#f8edef] px-4 py-2 text-xs font-medium text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
                          >
                            Revertir
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setRetiringId(
                                retiringId === order.id ? null : order.id
                              )
                            }
                            className="flex items-center gap-1.5 rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
                          >
                            <PackageCheck size={13} />
                            Marcar como retirado
                          </button>
                        </div>
                      )}
                    </div>

                    {retiringId === order.id && (
                      <div className="mt-4 rounded-2xl bg-[#f8edef] p-4">
                        <p className="text-xs font-semibold text-[#4e0611]">
                          ¿El cliente ya retiró este pedido?
                        </p>

                        <p className="mt-1 text-xs leading-5 text-black/55">
                          Se descontará del stock:{' '}
                          {order.items
                            .map((item) => `${item.quantity}x ${item.name}`)
                            .join(', ')}
                          . Esta acción no se puede revertir.
                        </p>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              retireOrder(order.id);
                              setRetiringId(null);
                            }}
                            className="flex-1 rounded-full bg-[#4e0611] py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
                          >
                            Sí, fue retirado
                          </button>

                          <button
                            type="button"
                            onClick={() => setRetiringId(null)}
                            className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black/55 transition hover:bg-black/5"
                          >
                            Volver
                          </button>
                        </div>
                      </div>
                    )}

                    {cancellingId === order.id && (
                      <CancelPanel
                        soldOutNames={shortageItems.map((item) => item.name)}
                        onConfirm={(reason) => {
                          cancelOrder(order.id, 'personal', reason);
                          setCancellingId(null);
                        }}
                        onClose={() => setCancellingId(null)}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}