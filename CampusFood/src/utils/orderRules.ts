import type { Product } from '@/data';
import type { Order } from '@/types';

// ---- Reglas de sanción: cambia estos números si quieres ajustarlas ----
export const FREE_CANCEL_MINUTES = 5; // cancelar es gratis durante este tiempo
export const STRIKE_LIMIT = 3; // faltas para quedar bloqueado
export const STRIKE_WINDOW_DAYS = 7; // las faltas cuentan durante este período
export const BLOCK_DAYS = 3; // duración del bloqueo

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// ---------------------------- Stock ----------------------------

// Unidades de cada producto que están en pedidos pendientes o listos (aún no retirados)
export function getCommittedByProduct(orders: Order[]): Record<number, number> {
  const committed: Record<number, number> = {};

  for (const order of orders) {
    if (order.status !== 'pendiente' && order.status !== 'listo') continue;

    for (const item of order.items) {
      committed[item.id] = (committed[item.id] ?? 0) + item.quantity;
    }
  }

  return committed;
}

export function getAvailable(
  product: Product,
  committed: Record<number, number>
): number {
  return Math.max(0, product.stock - (committed[product.id] ?? 0));
}

// Lo que ve el cliente: el producto queda agotado si todo su stock
// ya está comprometido en pedidos
export function withAvailability(
  products: Product[],
  committed: Record<number, number>
): Product[] {
  return products.map((product) => {
    const available = getAvailable(product, committed);

    return {
      ...product,
      available,
      soldOut: available === 0,
    };
  });
}

// Faltante real, para avisar al casino: agotado a mano, sin stock físico,
// o más pedido de lo que hay. Un producto con todo el stock comprometido
// en pedidos que se pueden preparar NO cuenta como faltante.
export function getShortageIds(
  products: Product[],
  committed: Record<number, number>
): number[] {
  return products
    .filter(
      (product) =>
        product.stock <= 0 ||
        (committed[product.id] ?? 0) > product.stock
    )
    .map((product) => product.id);
}

// ------------------------- Faltas y bloqueo -------------------------

export type FaultReason = 'cancelacion_tardia' | 'no_retirado';

export type Fault = {
  orderId: string;
  at: number;
  reason: FaultReason;
};

export type PenaltyStatus = {
  strikes: number;
  faults: Fault[];
  isBlocked: boolean;
  blockedUntil: number | null;
};

export function faultLabel(reason: FaultReason) {
  return reason === 'cancelacion_tardia'
    ? 'Cancelación fuera de plazo'
    : 'Pedido listo sin retirar';
}

export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isLateCancellation(order: Order) {
  if (order.status !== 'cancelado' || order.cancelledBy !== 'cliente' || !order.cancelledAt) {
    return false;
  }

  const waited =
    new Date(order.cancelledAt).getTime() - new Date(order.createdAt).getTime();

  return waited > FREE_CANCEL_MINUTES * MINUTE;
}

// Cada vez que se juntan STRIKE_LIMIT faltas dentro de la ventana, se activa
// un bloqueo y esas faltas se "consumen" (el contador parte de cero).
// Las faltas las guarda y entrega el servidor (tabla penalizaciones).
export function computeStatusFromFaults(
  allFaults: Fault[],
  now: number = Date.now()
): PenaltyStatus {
  const faults = [...allFaults].sort((a, b) => a.at - b.at);

  let recent: number[] = [];
  let blockedUntil: number | null = null;

  for (const fault of faults) {
    recent = recent.filter((time) => fault.at - time <= STRIKE_WINDOW_DAYS * DAY);
    recent.push(fault.at);

    if (recent.length >= STRIKE_LIMIT) {
      blockedUntil = Math.max(blockedUntil ?? 0, fault.at + BLOCK_DAYS * DAY);
      recent = [];
    }
  }

  const isBlocked = blockedUntil !== null && now < blockedUntil;
  const activeWindow = recent.filter((time) => now - time <= STRIKE_WINDOW_DAYS * DAY);

  return {
    strikes: isBlocked ? STRIKE_LIMIT : activeWindow.length,
    faults: faults.filter((fault) => now - fault.at <= STRIKE_WINDOW_DAYS * DAY),
    isBlocked,
    blockedUntil: isBlocked ? blockedUntil : null,
  };
}
