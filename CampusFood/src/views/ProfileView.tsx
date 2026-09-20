import { useState } from 'react';
import { Clock, LogOut, Package, ShoppingBag, Wallet } from 'lucide-react';
import type { Order } from '@/types';
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8edef] text-[#4e0611]">{icon}</div>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-black/45">{label}</p>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const total = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex items-center gap-4 border-b border-black/5 py-4 last:border-b-0">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f5f5f3] text-sm font-bold text-black/45">
        {order.id.replace('C-', '')}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{order.id}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              order.status === 'listo' ? 'bg-[#f8edef] text-[#4e0611]' : 'bg-[#f5f5f3] text-black/50'
            }`}
          >
            {order.status === 'listo' ? 'Listo' : 'Pendiente'}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-black/45">
          {total} producto{total === 1 ? '' : 's'} ·{' '}
          {new Date(order.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
        </p>
      </div>

      <p className="shrink-0 text-sm font-semibold">{formatPrice(order.subtotal)}</p>
    </div>
  );
}

export function ProfileView({
  user,
  orders,
  logout,
}: {
  user: User;
  orders: Order[];
  logout: () => void;
}) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const myOrders = orders
    .filter((order) => order.username === user.username)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalSpent = myOrders.reduce((sum, order) => sum + order.subtotal, 0);
  const pendingCount = myOrders.filter((order) => order.status === 'pendiente').length;

  return (
    <div className="mx-auto max-w-2xl pb-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">Cuenta personal</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">Mi perfil</h2>

      {/* Tarjeta de identidad */}
      <div className="mt-6 rounded-[28px] bg-white p-7">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#f8edef] text-lg font-semibold text-[#4e0611]">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="mt-1 truncate text-sm text-black/45">{user.username}</p>
            <span className="mt-2 inline-block rounded-full bg-[#f5f5f3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-black/50">
              {user.role === 'admin' ? 'Personal casino' : 'Estudiante'}
            </span>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard icon={<ShoppingBag size={17} />} label="Pedidos totales" value={String(myOrders.length)} />
        <StatCard icon={<Wallet size={17} />} label="Gasto acumulado" value={formatPrice(totalSpent)} />
        <StatCard icon={<Clock size={17} />} label="En curso" value={String(pendingCount)} />
      </div>

      {/* Historial de pedidos */}
      <div className="mt-5 rounded-[28px] bg-white p-7">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-black/40" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">Historial de pedidos</h3>
        </div>

        {myOrders.length === 0 ? (
          <p className="mt-6 text-center text-sm text-black/40">Aún no has hecho ningún pedido.</p>
        ) : (
          <div className="mt-3">
            {myOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      {/* Cerrar sesión */}
      {confirmingLogout ? (
        <div className="mt-5 flex gap-2">
          <button
            onClick={logout}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 py-3.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            <LogOut size={15} /> Confirmar cierre de sesión
          </button>
          <button
            onClick={() => setConfirmingLogout(false)}
            className="rounded-full bg-[#f5f5f3] px-5 py-3.5 text-sm font-medium text-black/50 hover:bg-black/10"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingLogout(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#252525] py-3.5 text-sm font-medium text-white hover:bg-[#4e0611]"
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      )}
    </div>
  );
}