import { ArrowRight, CheckCircle2, Minus, Plus, Trash2, X } from 'lucide-react';

import { useState } from 'react';

import type { CartItem } from '@/hooks/useCart';

import { formatPrice } from '@/data';

import logo from '@/assets/images/logo2.png';

export function CartDrawer({
  cart,
  subtotal,
  close,
  updateQuantity,
  clearCart,
  goToOrders,
  addOrder,
}: {
  cart: CartItem[];
  subtotal: number;
  close: () => void;
  updateQuantity: (id: number, amount: number) => void;
  clearCart: () => void;
  goToOrders: () => void;
  addOrder: (cart: CartItem[], subtotal: number) => string;
}) {
  const [ordered, setOrdered] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const handleOrder = () => {
    const number = addOrder(cart, subtotal);
    setOrderNumber(number);
    setOrdered(true);
    clearCart();
  };

  const handleClose = () => {
    setOrdered(false);
    setOrderNumber(null);
    close();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
              Tu compra
            </p>

            <h2 className="mt-1 text-2xl font-semibold">
              Carrito
            </h2>
          </div>

          <button
            onClick={handleClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f5f3] text-black/55"
          >
            <X size={18} />
          </button>
        </div>

        {ordered ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#f8edef] text-[#4e0611]">
              <CheckCircle2 size={30} />
            </div>

            <h3 className="mt-5 text-lg font-semibold">
              ¡Pedido confirmado!
            </h3>

            <div className="mt-4 rounded-2xl bg-[#f5f5f3] px-6 py-4">
              <p className="text-xs text-black/45">
                Tu número de retiro
              </p>

              <p className="mt-1 text-3xl font-bold tracking-widest text-[#4e0611]">
                {orderNumber}
              </p>
            </div>

            <p className="mt-4 max-w-xs text-sm leading-6 text-black/45">
              Retíralo en el mesón de la cafetería mostrando este número.
              Te avisaremos cuando esté listo.
            </p>

            <button
              onClick={handleClose}
              className="mt-8 rounded-full bg-[#4e0611] px-6 py-3 text-sm font-medium text-white hover:bg-[#36040c]"
            >
              Listo
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <img
              src={logo}
              alt=""
              className="h-16 w-auto animate-bounce"
            />

            <h3 className="mt-5 font-semibold">
              Tu carrito está vacío
            </h3>

            <p className="mt-2 max-w-xs text-sm leading-6 text-black/45">
              Agrega productos de la cafetería para preparar tu retiro.
            </p>

            <button
              onClick={() => {
                close();
                goToOrders();
              }}
              className="mt-6 rounded-full bg-[#4e0611] px-5 py-3 text-sm font-medium text-white hover:bg-[#36040c]"
            >
              Explorar cafetería
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto py-8">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-black/5 pb-4"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f5f5f3]">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-black/45">
                      {formatPrice(item.price)}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="grid h-6 w-6 place-items-center rounded-full bg-[#f5f5f3]"
                      >
                        <Minus size={12} />
                      </button>

                      <span className="w-4 text-center text-xs font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="grid h-6 w-6 place-items-center rounded-full bg-[#4e0611] text-white"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      updateQuantity(item.id, -item.quantity)
                    }
                    className="text-black/25 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-black/5 pt-5">
              <div className="flex justify-between text-sm text-black/50">
                <span>Subtotal</span>

                <span className="font-semibold text-[#4e0611]">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <button
                onClick={handleOrder}
                className="mt-5 w-full rounded-full bg-[#4e0611] py-4 text-sm font-semibold text-white transition hover:bg-[#36040c]"
              >
                Confirmar pedido
                <ArrowRight className="ml-2 inline" size={16} />
              </button>

              <p className="mt-3 text-center text-[11px] text-black/35">
                Pago y retiro se habilitarán próximamente
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}