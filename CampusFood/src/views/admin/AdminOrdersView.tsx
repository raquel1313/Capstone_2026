import { useState } from 'react';

import { Clock } from 'lucide-react';

import type { Order, OrderStatus } from '@/types';

import { formatPrice } from '@/data';

import logo from '@/assets/images/logo2.png';

type Filter = 'todos' | OrderStatus;

export function AdminOrdersView({
  orders,
  updateStatus,
}: {
  orders: Order[];
  updateStatus: (id: string, status: OrderStatus) => void;
}) {
  const [filter, setFilter] = useState<Filter>('todos');

  const filtered = orders
    .filter(
      (order) =>
        filter === 'todos' || order.status === filter
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

  const pendingCount = orders.filter(
    (o) => o.status === 'pendiente'
  ).length;

  return (
    <div>
      <div className="mb-5 flex gap-2">
        {(['todos', 'pendiente', 'listo'] as Filter[]).map(
          (option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === option
                  ? 'bg-[#4e0611] text-white'
                  : 'bg-white text-black/50 hover:bg-[#f8edef] hover:text-[#4e0611]'
              }`}
            >
              {option === 'todos'
                ? 'Todos'
                : option === 'pendiente'
                  ? `Pendientes (${pendingCount})`
                  : 'Listos'}
            </button>
          )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white p-14 text-center">
          <img
            src={logo}
            alt=""
            className="h-14 w-auto animate-bounce"
          />

          <p className="mt-4 text-sm text-black/45">
            No hay pedidos{' '}
            {filter !== 'todos'
              ? `en estado "${filter}"`
              : 'todavía'}
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="rounded-[24px] bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-black/40">
                    Número de retiro
                  </p>

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
                  {order.status === 'pendiente'
                    ? 'Pendiente'
                    : 'Listo'}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs text-black/40">
                <Clock size={12} />

                {new Date(
                  order.createdAt
                ).toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-black/65">
                      {item.quantity}x {item.name}
                    </span>

                    <span className="font-medium">
                      {formatPrice(
                        item.price * item.quantity
                      )}
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
                    onClick={() =>
                      updateStatus(order.id, 'listo')
                    }
                    className="rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
                  >
                    Marcar como listo
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      updateStatus(order.id, 'pendiente')
                    }
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