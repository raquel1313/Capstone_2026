import { Download, Printer, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { OrderReceipt } from '@/components/OrderReceipt';
import type { Order } from '@/types';
import { downloadReceiptPdf } from '@/utils/receiptPdf';

/** Ventana con el comprobante, botón de descarga PDF e impresión. */
export function OrderReceiptModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = async () => {
    setDownloading(true);
    setFailed(false);

    try {
      await downloadReceiptPdf(order);
    } catch (error) {
      console.error('No se pudo generar el PDF:', error);
      setFailed(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Comprobante del pedido ${order.id}`}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-cream p-4 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold text-ink">Comprobante</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comprobante"
            className="grid h-9 w-9 place-items-center rounded-full text-ink/60 transition hover:bg-ink/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={18} />
          </button>
        </div>

        <OrderReceipt order={order} />

        {failed && (
          <p role="alert" className="mt-3 text-xs text-red-700 print:hidden">
            No se pudo generar el PDF. Inténtalo nuevamente.
          </p>
        )}

        <div className="mt-4 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            {downloading ? 'Generando…' : 'Descargar comprobante'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Imprimir comprobante"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/15 bg-white text-ink/70 transition hover:bg-ink/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
