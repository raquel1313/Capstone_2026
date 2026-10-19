import { useState, type ReactNode } from 'react';
import { Ban, Clock, LogOut, Package, ShoppingBag } from 'lucide-react';
import type { CancelledBy, Order } from '@/types';
import type { User } from '@/hooks/useAuth';
import { formatPrice } from '@/data';

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

function OrderRow({
  order,
  onCancel,
}: {
  order: Order;
  onCancel: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const total = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const cancelled = order.status === 'cancelado';

  const badge = cancelled
    ? { label: 'Cancelado', className: 'bg-red-50 text-red-700' }
    : order.status === 'listo'
      ? { label: 'Listo', className: 'bg-[#f8edef] text-[#4e0611]' }
      : { label: 'Pendiente', className: 'bg-[#f5f5f3] text-black/50' };

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
            {total} producto{total === 1 ? '' : 's'} ·{' '}
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

      {cancelled && (
        <p className="mt-2 pl-[60px] text-xs text-red-700">
          {order.cancelledBy === 'personal'
            ? `El casino canceló este pedido${
                order.cancelReason ? `: ${order.cancelReason}` : '.'
              }`
            : 'Cancelaste este pedido.'}
        </p>
      )}

      {order.status === 'pendiente' && (
        <div className="mt-3 pl-[60px]">
          {confirming ? (
            <div>
              <p className="text-xs text-black/60">
                ¿Seguro que quieres cancelar este pedido?
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
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#f5f5f3] px-3.5 py-2 text-xs font-medium text-black/60 transition hover:bg-red-50 hover:text-red-700"
            >
              <Ban size={13} />
              Cancelar pedido
            </button>
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
}: {
  user: User;
  orders: Order[];
  logout: () => void;
  cancelOrder: (id: string, by: CancelledBy, reason: string) => void;
}) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

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

  const pendingCount = myOrders.filter(
    (order) => order.status === 'pendiente'
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
          value={String(pendingCount)}
        />

        <StatCard
          icon={<Ban size={17} />}
          label="Cancelados"
          value={String(cancelledCount)}
        />
      </div>

      {/* Historial de pedidos */}
      <div className="mt-5 rounded-[28px] bg-white p-7">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-black/40" />

          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Historial de pedidos
          </h3>
        </div>

        <p className="mt-2 text-xs text-black/40">
          Puedes cancelar un pedido mientras esté pendiente.
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
                onCancel={(id) =>
                  cancelOrder(id, 'cliente', 'Solicitud del cliente')
                }
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