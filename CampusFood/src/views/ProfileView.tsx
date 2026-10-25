import { useEffect, useState, type ReactNode } from 'react';
import {
  Ban,
  Clock,
  LogOut,
  Minus,
  Package,
  ShieldAlert,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { CancelledBy, Order, OrderItem, OrderStatus } from '@/types';
import type { User } from '@/hooks/useAuth';
import { formatPrice } from '@/data';
import {
  BLOCK_DAYS,
  FREE_CANCEL_MINUTES,
  STRIKE_LIMIT,
  STRIKE_WINDOW_DAYS,
  faultLabel,
  formatDateTime,
  isLateCancellation,
  type PenaltyStatus,
} from '@/utils/orderRules';

const FREE_MS = FREE_CANCEL_MINUTES * 60 * 1000;

const BADGES: Record<OrderStatus, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-[#f5f5f3] text-black/50' },
  listo: { label: 'Listo para retirar', className: 'bg-[#f8edef] text-[#4e0611]' },
  retirado: { label: 'Retirado', className: 'bg-emerald-50 text-emerald-700' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-700' },
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8edef] text-[#4e0611]">
        {icon}
      </div>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-black/45">{label}</p>
    </div>
  );
}

function PenaltyCard({ penalty }: { penalty: PenaltyStatus }) {
  const { strikes, faults, isBlocked, blockedUntil } = penalty;

  return (
    <div
      className={`mt-5 rounded-[28px] p-7 ${
        isBlocked ? 'bg-red-50' : 'bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert
            size={16}
            className={isBlocked ? 'text-red-700' : 'text-black/40'}
          />

          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Mis faltas
          </h3>
        </div>

        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: STRIKE_LIMIT }, (_, index) => (
            <span
              key={index}
              className={`h-2.5 w-2.5 rounded-full ${
                index < strikes
                  ? isBlocked
                    ? 'bg-red-600'
                    : 'bg-[#4e0611]'
                  : 'bg-black/15'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold">
        {strikes} de {STRIKE_LIMIT}
      </p>

      {isBlocked && blockedUntil !== null ? (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          No puedes hacer pedidos hasta el {formatDateTime(blockedUntil)}. Si
          crees que es un error, habla con el personal del casino.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-black/45">
          Una falta es cancelar un pedido pasados {FREE_CANCEL_MINUTES} minutos
          o no retirar un pedido que ya está listo. Con {STRIKE_LIMIT} faltas en{' '}
          {STRIKE_WINDOW_DAYS} días no puedes pedir por {BLOCK_DAYS} días.
          Quitar productos sueltos y las cancelaciones del casino no cuentan.
        </p>
      )}

      {faults.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4">
          {faults.map((fault) => (
            <li
              key={`${fault.orderId}-${fault.reason}`}
              className="flex justify-between gap-3 text-xs text-black/55"
            >
              <span>
                {fault.orderId} · {faultLabel(fault.reason)}
              </span>
              <span className="shrink-0 text-black/35">
                {new Date(fault.at).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({
  order,
  now,
  strikes,
  onCancel,
  onRemoveItem,
}: {
  order: Order;
  now: number;
  strikes: number;
  onCancel: (id: string) => void;
  onRemoveItem: (orderId: string, itemId: number, quantity: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  const cancelled = order.status === 'cancelado';
  const pending = order.status === 'pendiente';
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const badge = BADGES[order.status];

  const ageMs = now - new Date(order.createdAt).getTime();
  const isFree = ageMs <= FREE_MS;
  const minutesLeft = Math.max(1, Math.ceil((FREE_MS - ageMs) / 60000));

  const handleRemove = (item: OrderItem, quantity: number) => {
    // Quitar lo último equivale a cancelar el pedido: se pide confirmación
    if (order.items.length === 1 && quantity >= item.quantity) {
      setConfirming(true);
      return;
    }

    onRemoveItem(order.id, item.id, quantity);
  };

  return (
    <div className="border-b border-black/5 py-4 last:border-b-0">
      <div className="flex items-center gap-4">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f5f5f3] text-sm font-bold ${
            cancelled ? 'text-black/30' : 'text-black/45'
          }`}
        >
          {order.id.replace('C-', '')}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={`truncate text-sm font-semibold ${
                cancelled ? 'text-black/40' : ''
              }`}
            >
              {order.id}
            </p>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          <p className="mt-0.5 truncate text-xs text-black/45">
            {units} producto{units === 1 ? '' : 's'} ·{' '}
            {new Date(order.createdAt).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>

        <p
          className={`shrink-0 text-sm font-semibold ${
            cancelled ? 'text-black/30 line-through' : ''
          }`}
        >
          {formatPrice(order.subtotal)}
        </p>
      </div>

      {order.status === 'listo' && (
        <p className="mt-2 pl-[60px] text-xs text-[#4e0611]">
          Retíralo hoy en el mesón. Si el día termina y sigue sin retirarse, se
          registra una falta.
        </p>
      )}

      {order.status === 'retirado' && order.retiredAt && (
        <p className="mt-2 pl-[60px] text-xs text-emerald-700">
          Retirado el{' '}
          {new Date(order.retiredAt).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
          })}{' '}
          a las{' '}
          {new Date(order.retiredAt).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          .
        </p>
      )}

      {cancelled && (
        <p className="mt-2 pl-[60px] text-xs text-red-700">
          {order.cancelledBy === 'personal'
            ? `El casino canceló este pedido${
                order.cancelReason ? `: ${order.cancelReason}` : '.'
              }`
            : isLateCancellation(order)
              ? 'Cancelaste este pedido pasado el plazo gratuito: contó como una falta.'
              : 'Cancelaste este pedido a tiempo: no cuenta como falta.'}
        </p>
      )}

      {!cancelled && (order.adjustments?.length ?? 0) > 0 && (
        <ul className="mt-2 space-y-0.5 pl-[60px]">
          {order.adjustments?.map((adjustment) => (
            <li key={adjustment.at} className="text-xs text-black/45">
              Se quitó {adjustment.quantity}x {adjustment.name}
              {adjustment.by === 'personal'
                ? ` (casino: ${adjustment.reason})`
                : ''}
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <div className="mt-3 pl-[60px]">
          {editing && (
            <div className="mb-3 rounded-2xl bg-[#f5f5f3] p-3">
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">
                      {item.quantity}x {item.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemove(item, 1)}
                      aria-label={`Quitar una unidad de ${item.name}`}
                      className="grid h-7 w-7 place-items-center rounded-full bg-white text-black/60 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Minus size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(item, item.quantity)}
                      aria-label={`Quitar ${item.name} del pedido`}
                      className="grid h-7 w-7 place-items-center rounded-full bg-white text-black/60 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-[11px] leading-4 text-black/40">
                Quitar productos sueltos no cuenta como falta. Si quitas todos,
                el pedido se cancela.
              </p>
            </div>
          )}

          {confirming ? (
            <div>
              <p className="text-xs leading-5 text-black/60">
                {isFree
                  ? `¿Cancelar el pedido? Es gratis durante los primeros ${FREE_CANCEL_MINUTES} minutos (te quedan ${minutesLeft} min).`
                  : `¿Cancelar el pedido? Pasados los ${FREE_CANCEL_MINUTES} minutos cuenta como una falta. Llevas ${strikes} de ${STRIKE_LIMIT}.`}
              </p>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onCancel(order.id)}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                >
                  Sí, cancelar
                </button>

                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full bg-[#f5f5f3] px-4 py-2 text-xs font-medium text-black/55 transition hover:bg-black/10"
                >
                  No, mantener
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="rounded-full bg-[#f5f5f3] px-3.5 py-2 text-xs font-medium text-black/60 transition hover:bg-black/10"
              >
                {editing ? 'Listo' : 'Editar productos'}
              </button>

              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 rounded-full bg-[#f5f5f3] px-3.5 py-2 text-xs font-medium text-black/60 transition hover:bg-red-50 hover:text-red-700"
              >
                <Ban size={13} />
                Cancelar pedido
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProfileView({
  user,
  orders,
  logout,
  cancelOrder,
  removeOrderItem,
  penalty,
}: {
  user: User;
  orders: Order[];
  logout: () => void;
  cancelOrder: (id: string, by: CancelledBy, reason: string) => void;
  removeOrderItem: (orderId: string, itemId: number, quantity: number) => void;
  penalty: PenaltyStatus;
}) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Mantiene al día el tiempo que queda de plazo gratuito
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);

    return () => clearInterval(timer);
  }, []);

  const myOrders = orders
    .filter((order) => order.username === user.username)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

  const activeCount = myOrders.filter(
    (order) => order.status !== 'cancelado'
  ).length;

  const inProgressCount = myOrders.filter(
    (order) => order.status === 'pendiente' || order.status === 'listo'
  ).length;

  const cancelledCount = myOrders.filter(
    (order) => order.status === 'cancelado'
  ).length;

  return (
    <div className="mx-auto max-w-2xl pb-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
        Cuenta personal
      </p>

      <h2 className="mt-2 text-3xl font-semibold tracking-tight">
        Mi perfil
      </h2>

      {/* Tarjeta de identidad */}
      <div className="mt-6 rounded-[28px] bg-white p-7">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#f8edef] text-lg font-semibold text-[#4e0611]">
            {getInitials(user.name)}
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>

            <p className="mt-1 truncate text-sm text-black/45">
              {user.username}
            </p>

            <span className="mt-2 inline-block rounded-full bg-[#f5f5f3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-black/50">
              {user.role === 'admin' ? 'Personal casino' : 'Estudiante'}
            </span>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard
          icon={<ShoppingBag size={17} />}
          label="Pedidos"
          value={String(activeCount)}
        />

        <StatCard
          icon={<Clock size={17} />}
          label="En curso"
          value={String(inProgressCount)}
        />

        <StatCard
          icon={<Ban size={17} />}
          label="Cancelados"
          value={String(cancelledCount)}
        />
      </div>

      <PenaltyCard penalty={penalty} />

      {/* Historial de pedidos */}
      <div className="mt-5 rounded-[28px] bg-white p-7">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-black/40" />

          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Historial de pedidos
          </h3>
        </div>

        <p className="mt-2 text-xs text-black/40">
          Mientras un pedido esté pendiente puedes quitar productos o cancelarlo.
        </p>

        {myOrders.length === 0 ? (
          <p className="mt-6 text-center text-sm text-black/40">
            Aún no has hecho ningún pedido.
          </p>
        ) : (
          <div className="mt-3">
            {myOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                now={now}
                strikes={penalty.strikes}
                onCancel={(id) =>
                  cancelOrder(id, 'cliente', 'Solicitud del cliente')
                }
                onRemoveItem={removeOrderItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cerrar sesión */}
      {confirmingLogout ? (
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={logout}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 py-3.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            <LogOut size={15} />
            Confirmar cierre de sesión
          </button>

          <button
            type="button"
            onClick={() => setConfirmingLogout(false)}
            className="rounded-full bg-[#f5f5f3] px-5 py-3.5 text-sm font-medium text-black/50 hover:bg-black/10"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingLogout(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#252525] py-3.5 text-sm font-medium text-white hover:bg-[#4e0611]"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      )}
    </div>
  );
}