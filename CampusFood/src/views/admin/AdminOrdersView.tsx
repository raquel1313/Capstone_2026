import { useMemo, useState } from 'react';

import Image from 'next/image';
import { Calendar, Clock, Search, User, X } from 'lucide-react';

import type { Order, OrderStatus } from '@/types';

import { formatPrice } from '@/data';

import logo from '@/assets/images/logo2.png';

type StatusFilter = 'todos' | OrderStatus;
type DatePreset = 'todo' | 'hoy' | 'ayer' | '7dias' | 'rango';
type TimeBand = 'todas' | 'almuerzo' | 'fuera';
type SortMode = 'recientes' | 'antiguos' | 'mayor' | 'menor';

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7dias', label: 'Últimos 7 días' },
  { id: 'rango', label: 'Rango' },
];

// Mismo horario que se muestra a los estudiantes: 11:30 a 15:00
const LUNCH_START = 11 * 60 + 30;
const LUNCH_END = 15 * 60;

const SELECT_CLASS =
  'mt-1 w-full rounded-xl border border-black/5 bg-[#f5f5f3] px-3 py-2 text-sm outline-none transition focus:border-[#4e0611]';

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

export function AdminOrdersView({
  orders,
  updateStatus,
}: {
  orders: Order[];
  updateStatus: (id: string, status: OrderStatus) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [datePreset, setDatePreset] = useState<DatePreset>('todo');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('todos');
  const [timeBand, setTimeBand] = useState<TimeBand>('todas');
  const [sortMode, setSortMode] = useState<SortMode>('recientes');

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

  const pendingTotal = orders.filter((o) => o.status === 'pendiente').length;

  const filteredTotal = filtered.reduce((sum, o) => sum + o.subtotal, 0);
  const filteredPending = filtered.filter((o) => o.status === 'pendiente').length;

  const hasActiveFilters =
    statusFilter !== 'todos' ||
    datePreset !== 'todo' ||
    search.trim() !== '' ||
    productId !== 'todos' ||
    timeBand !== 'todas';

  const clearFilters = () => {
    setStatusFilter('todos');
    setDatePreset('todo');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setProductId('todos');
    setTimeBand('todas');
    setSortMode('recientes');
  };

  return (
    <div>
      {/* Resumen de lo que se está viendo */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-black/40">Pedidos</p>
          <p className="mt-1 text-xl font-semibold">{filtered.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-black/40">Total vendido</p>
          <p className="mt-1 text-xl font-semibold text-[#4e0611]">
            {formatPrice(filteredTotal)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-black/40">Pendientes</p>
          <p className="mt-1 text-xl font-semibold">{filteredPending}</p>
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
          {(['todos', 'pendiente', 'listo'] as StatusFilter[]).map((option) => (
            <button
              key={option}
              onClick={() => setStatusFilter(option)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                statusFilter === option
                  ? 'bg-[#4e0611] text-white'
                  : 'bg-[#f5f5f3] text-black/50 hover:bg-[#f8edef] hover:text-[#4e0611]'
              }`}
            >
              {option === 'todos'
                ? 'Todos'
                : option === 'pendiente'
                  ? `Pendientes (${pendingTotal})`
                  : 'Listos'}
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
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs font-medium text-[#4e0611] hover:underline"
          >
            <X size={13} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
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
              onClick={clearFilters}
              className="mt-4 rounded-full bg-[#4e0611] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#36040c]"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => (
            <div key={order.id} className="rounded-[24px] bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-black/40">Número de retiro</p>

                  <p className="text-2xl font-bold tracking-widest text-[#4e0611]">
                    {order.id}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    order.status === 'pendiente'
                      ? 'bg-[#f8edef] text-black/50'
                      : 'bg-[#f8edef] text-[#4e0611]'
                  }`}
                >
                  {order.status === 'pendiente' ? 'Pendiente' : 'Listo'}
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

              <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="text-black/65">
                      {item.quantity}x {item.name}
                    </span>

                    <span className="font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
                <span className="text-sm font-semibold">
                  {formatPrice(order.subtotal)}
                </span>

                {order.status === 'pendiente' ? (
                  <button
                    onClick={() => updateStatus(order.id, 'listo')}
                    className="rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
                  >
                    Marcar como listo
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(order.id, 'pendiente')}
                    className="rounded-full bg-[#f8edef] px-4 py-2 text-xs font-medium text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
                  >
                    Revertir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}