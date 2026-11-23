import { buildReceipt, formatCLP, formatReceiptDate } from '@/utils/receipt';
import type { Order } from '@/types';

const STATUS_TONE: Record<string, string> = {
  PENDIENTE: 'bg-surface text-ink/70',
  LISTO: 'bg-accent/25 text-ink',
  RETIRADO: 'bg-emerald-50 text-emerald-800',
  CANCELADO: 'bg-red-50 text-red-700',
  PAGADO: 'bg-emerald-50 text-emerald-800',
  ANULADO: 'bg-red-50 text-red-700',
};

function Tag({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${
        STATUS_TONE[value] ?? 'bg-surface text-ink/70'
      }`}
    >
      {value}
    </span>
  );
}

/**
 * Comprobante de un pedido. Se usa en Perfil → Mis pedidos (estudiante) y en el
 * panel del personal. Solo muestra datos del pedido guardado en la base de datos.
 */
export function OrderReceipt({ order }: { order: Order }) {
  const receipt = buildReceipt(order);

  return (
    <article
      aria-label={`Comprobante del pedido ${receipt.code}`}
      className="receipt-print rounded-3xl border border-ink/10 bg-white p-5 text-ink"
    >
      <header className="text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-brand">CAMPUSFOOD</p>
        <p className="mt-3 text-[11px] uppercase tracking-wide text-ink/50">
          Código de pedido
        </p>
        <p className="mt-0.5 text-3xl font-bold tracking-wider">{receipt.code}</p>
      </header>

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink/50">Fecha</dt>
          <dd className="font-medium">{formatReceiptDate(receipt.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink/50">Solicitante</dt>
          <dd className="truncate text-right font-medium">{receipt.customerName}</dd>
        </div>
      </dl>

      <table className="mt-4 w-full border-y border-dashed border-ink/20 text-sm">
        <caption className="sr-only">Detalle del pedido</caption>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50">
            <th scope="col" className="py-2 font-semibold">
              Producto
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Cant.
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((item) => (
            <tr key={item.name} className="align-top">
              <td className="py-1.5 pr-2">
                {item.name}
                {item.quantity > 1 && (
                  <span className="block text-[11px] text-ink/45">
                    {formatCLP(item.unitPrice)} c/u
                  </span>
                )}
              </td>
              <td className="py-1.5 text-right tabular-nums">{item.quantity}</td>
              <td className="py-1.5 text-right tabular-nums">{formatCLP(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-sm font-bold tracking-wide">TOTAL</span>
        <span className="text-2xl font-bold tabular-nums text-brand">
          {formatCLP(receipt.total)}
        </span>
      </div>

      <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink/50">Estado del pedido</dt>
          <dd>
            <Tag value={receipt.statusLabel} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink/50">Estado del pago</dt>
          <dd>
            <Tag value={receipt.paymentStatusLabel} />
          </dd>
        </div>
        {receipt.paymentMethodLabel && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink/50">Método de pago</dt>
            <dd className="font-medium">{receipt.paymentMethodLabel}</dd>
          </div>
        )}
        {receipt.paymentDate && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink/50">Fecha de pago</dt>
            <dd className="font-medium">{formatReceiptDate(receipt.paymentDate)}</dd>
          </div>
        )}
      </dl>

      {!order.payment && order.status !== 'cancelado' && (
        <p className="mt-4 text-center text-[11px] leading-4 text-ink/45">
          El pago se realiza presencialmente al retirar tu pedido.
        </p>
      )}
    </article>
  );
}
