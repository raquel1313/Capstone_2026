import type { Order, OrderStatus } from '@/types';
import { SERVICE_TIME_ZONE } from '@/utils/orderRules';

/*
 * Datos del comprobante de un pedido. Todo se deriva del pedido guardado en la
 * base de datos (Pedido, PedidoDetalle y Pago): no existe una tabla aparte.
 */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: 'PENDIENTE',
  listo: 'LISTO',
  retirado: 'RETIRADO',
  cancelado: 'CANCELADO',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  TARJETA_ALIMENTACION: 'Tarjeta de alimentación',
  OTRO: 'Otro',
};

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type ReceiptData = {
  code: string;
  createdAt: string;
  customerName: string;
  lines: ReceiptLine[];
  subtotal: number;
  total: number;
  statusLabel: string;
  // Sin registro de pago el estado es PENDIENTE (el pago es presencial).
  paymentStatusLabel: string;
  paymentMethodLabel?: string;
  paymentDate?: string;
};

/**
 * Prioriza los valores históricos guardados: el subtotal de cada línea
 * (PedidoDetalle.subtotal) y el total definitivo del pedido (Pedido.total).
 * Si faltara el subtotal de una línea se calcula cantidad × precio unitario.
 */
export function buildReceipt(order: Order): ReceiptData {
  const lines = order.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price,
    subtotal: item.lineTotal ?? item.quantity * item.price,
  }));

  const payment = order.payment;
  let paymentStatusLabel = 'PENDIENTE';

  if (payment) {
    paymentStatusLabel = payment.status === 'ANULADO' ? 'ANULADO' : 'PAGADO';
  } else if (order.status === 'cancelado') {
    paymentStatusLabel = 'SIN PAGO';
  }

  return {
    code: order.id,
    createdAt: order.createdAt,
    customerName: order.customerName ?? order.username,
    lines,
    subtotal: lines.reduce((sum, line) => sum + line.subtotal, 0),
    // El total guardado manda; la suma de líneas es solo el subtotal informativo.
    total: order.subtotal,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    paymentStatusLabel,
    paymentMethodLabel: payment
      ? (PAYMENT_METHOD_LABEL[payment.method] ?? payment.method)
      : undefined,
    paymentDate: payment?.at,
  };
}

const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const formatCLP = (value: number) => clp.format(value);

/** dd/mm/aaaa hh:mm en hora de Chile. */
export function formatReceiptDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-CL', {
    timeZone: SERVICE_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

export const receiptFileName = (code: string) => `comprobante-${code}.pdf`;
