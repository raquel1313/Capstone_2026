import { useEffect, useState } from 'react';

import { formatCLP } from '@/utils/receipt';
import { PAYMENT_METHOD_LABEL } from '@/utils/receipt';
import type { Order } from '@/types';

export const PAYMENT_METHOD_OPTIONS = [
  'EFECTIVO',
  'DEBITO',
  'CREDITO',
  'TARJETA_ALIMENTACION',
] as const;

export type PaymentMethodOption = (typeof PAYMENT_METHOD_OPTIONS)[number];

/**
 * Confirmación de cobro presencial y retiro. El total viene del pedido y no se
 * puede editar; el servidor vuelve a leerlo de la base de datos al registrar el pago.
 */
export function RetirePaymentModal({
  order,
  onConfirm,
  onClose,
}: {
  order: Order;
  onConfirm: (method: PaymentMethodOption) => Promise<boolean>;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethodOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const handleConfirm = async () => {
    if (!method || submitting) {
      return;
    }

    setSubmitting(true);

    const ok = await onConfirm(method);

    setSubmitting(false);

    if (ok) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="retire-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="retire-title" className="text-base font-bold text-ink">
          Confirmar pago y retiro
        </h2>

        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink/50">Pedido</dt>
            <dd className="font-semibold">{order.id}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-ink/50">Total</dt>
            <dd className="text-xl font-bold text-brand">{formatCLP(order.subtotal)}</dd>
          </div>
        </dl>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Método de pago
          </legend>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-brand ${
                  method === option
                    ? 'border-brand bg-brand/5 font-semibold text-brand'
                    : 'border-ink/15 text-ink/80 hover:bg-ink/5'
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={option}
                  checked={method === option}
                  onChange={() => setMethod(option)}
                  className="accent-[#2E5336]"
                />
                {PAYMENT_METHOD_LABEL[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-3 text-[11px] leading-4 text-ink/50">
          Se descontará del stock y esta acción no se puede revertir.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-ink/15 px-4 py-3 text-sm font-medium text-ink/70 transition hover:bg-ink/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!method || submitting}
            className="flex-1 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Registrando…' : 'Confirmar pago y retiro'}
          </button>
        </div>
      </div>
    </div>
  );
}
