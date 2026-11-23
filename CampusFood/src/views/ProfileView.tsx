import { SecurityNotice } from '@/components/SecurityNotice';
import { OrderReceiptModal } from '@/components/OrderReceiptModal';
import { useState, type ReactNode } from 'react';
import {
  Ban,
  Clock,
  LogOut,
  Minus,
  Package,
  Receipt,
  ShieldAlert,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { CancelledBy, Order, OrderItem, OrderStatus } from '@/types';
import type { User } from '@/hooks/useAuth';
import { formatPrice } from '@/data';
import {
  BLOCK_DAYS,
  STRIKE_LIMIT,
  STRIKE_WINDOW_DAYS,
  faultLabel,
  formatDateTime,
  type PenaltyStatus,
} from '@/utils/orderRules';

const BADGES: Record<OrderStatus, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-surface text-ink/65' },
  listo: { label: 'Listo para retirar', className: 'bg-accent/25 text-ink' },
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
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
        {icon}
      </div>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-ink/65">{label}</p>
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
            className={isBlocked ? 'text-red-700' : 'text-ink/65'}
          />

          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/65">
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
                    : 'bg-brand'
                  : 'bg-ink/15'
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
        <p className="mt-2 text-xs leading-5 text-ink/65">
          Una falta se registra únicamente si no retiras un pedido listo antes de que finalice el día. 
          Con {STRIKE_LIMIT} faltas acumuladas en {STRIKE_WINDOW_DAYS} días no podrás realizar pedidos por {BLOCK_DAYS} días. 
          Las cancelaciones no generan faltas.
        </p>
      )}

      {faults.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-ink/10 pt-4">
          {faults.map((fault) => (
            <li
              key={`${fault.orderId}-${fault.reason}`}
              className="flex justify-between gap-3 text-xs text-ink/65"
            >
              <span>
                {fault.orderId} · {faultLabel(fault.reason)}
              </span>
              <span className="shrink-0 text-ink/65">
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
  onCancel,
  onRemoveItem,
  onViewReceipt,
}: {
  order: Order;
  onViewReceipt: (order: Order) => void;
  onCancel: (id: string) => void;
  onRemoveItem: (orderId: string, itemId: number, quantity: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  const cancelled = order.status === 'cancelado';
  const pending = order.status === 'pendiente';
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const badge = BADGES[order.status];

  const handleRemove = (item: OrderItem, quantity: number) => {
    if (order.items.length === 1 && quantity >= item.quantity) {
      setConfirming(true);
      return;
    }

    onRemoveItem(order.id, item.id, quantity);
  };

  return (
    <div className="border-b border-ink/10 py-4 last:border-b-0">
      <div className="flex items-center gap-4">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface text-sm font-bold ${
            cancelled ? 'text-ink/65' : 'text-ink/65'
          }`}
        >
          {order.id.replace('C-', '')}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={`truncate text-sm font-semibold ${
                cancelled ? 'text-ink/65' : ''
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

          <p className="mt-0.5 truncate text-xs text-ink/65">
            {units} producto{units === 1 ? '' : 's'} ·{' '}
            {new Date(order.createdAt).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>

        <p
          className={`shrink-0 text-sm font-semibold ${
            cancelled ? 'text-ink/65 line-through' : ''
          }`}
        >
          {formatPrice(order.subtotal)}
        </p>
      </div>

      <div className="mt-2 pl-[60px]">
        <button
          type="button"
          onClick={() => onViewReceipt(order)}
          className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-xs font-medium text-ink/75 transition hover:bg-ink/10"
        >
          <Receipt size={13} />
          Ver detalle
        </button>
      </div>

      {order.status === 'listo' && (
        <p className="mt-2 pl-[60px] text-xs text-brand">
          Retíralo hoy en el mesón. Si termina el día y no fue retirado, se registrará una falta.
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
        <p className="mt-2 pl-[60px] text-xs text-ink/65">
          {order.cancelledBy === 'personal'
            ? `El casino canceló este pedido${
                order.cancelReason ? `: ${order.cancelReason}` : '.'
              }`
            : 'Pedido cancelado.'}
        </p>
      )}

      {!cancelled && (order.adjustments?.length ?? 0) > 0 && (
        <ul className="mt-2 space-y-0.5 pl-[60px]">
          {order.adjustments?.map((adjustment) => (
            <li key={adjustment.at} className="text-xs text-ink/65">
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
            <div className="mb-3 rounded-2xl bg-surface p-3">
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
                      className="grid h-7 w-7 place-items-center rounded-full bg-white text-ink/75 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Minus size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(item, item.quantity)}
                      aria-label={`Quitar ${item.name} del pedido`}
                      className="grid h-7 w-7 place-items-center rounded-full bg-white text-ink/75 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-[11px] leading-4 text-ink/65">
                Puedes modificar tus productos libremente. Si quitas todos, el pedido se cancelará.
              </p>
            </div>
          )}

          {confirming ? (
            <div>
              <p className="text-xs leading-5 text-ink/75">
                ¿Estás seguro de cancelar este pedido?
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
                  className="rounded-full bg-surface px-4 py-2 text-xs font-medium text-ink/65 transition hover:bg-ink/10"
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
                className="rounded-full bg-surface px-3.5 py-2 text-xs font-medium text-ink/75 transition hover:bg-ink/10"
              >
                {editing ? 'Listo' : 'Editar productos'}
              </button>

              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-xs font-medium text-ink/75 transition hover:bg-red-50 hover:text-red-700"
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
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const receiptOrder = orders.find((candidate) => candidate.id === receiptId);

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
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink/65">
        Cuenta personal
      </p>

      <h2 className="mt-2 text-3xl font-semibold tracking-tight">
        Mi perfil
      </h2>

      {/* Tarjeta de identidad */}
      <div className="mt-6 rounded-[28px] bg-white p-7">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-soft text-lg font-semibold text-brand">
            {getInitials(user.name)}
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>

            <p className="mt-1 truncate text-sm text-ink/65">
              {user.username}
            </p>

            <span className="mt-2 inline-block rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink/65">
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
          <Package size={16} className="text-ink/65" />

          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/65">
            Historial de pedidos
          </h3>
        </div>

        <p className="mt-2 text-xs text-ink/65">
          Mientras un pedido esté pendiente puedes editarlo o cancelarlo libremente.
        </p>

        {myOrders.length === 0 ? (
          <p className="mt-6 text-center text-sm text-ink/65">
            Aún no has hecho ningún pedido.
          </p>
        ) : (
          <div className="mt-3">
            {myOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onViewReceipt={(selected) => setReceiptId(selected.id)}
                onCancel={(id) =>
                  cancelOrder(id, 'cliente', 'Solicitud del cliente')
                }
                onRemoveItem={removeOrderItem}
              />
            ))}
          </div>
        )}
      </div>

      <SecurityNotice className="mt-5" />

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
            className="rounded-full bg-surface px-5 py-3.5 text-sm font-medium text-ink/65 hover:bg-ink/10"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingLogout(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm font-medium text-white hover:bg-brand"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      )}

      {receiptOrder && (
        <OrderReceiptModal order={receiptOrder} onClose={() => setReceiptId(null)} />
      )}
    </div>
  );
}
