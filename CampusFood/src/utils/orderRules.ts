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

// undefined = producto sin control de stock
export function getAvailable(
  product: Product,
  committed: Record<number, number>
): number | undefined {
  if (typeof product.stock !== 'number') return undefined;

  return Math.max(0, product.stock - (committed[product.id] ?? 0));
}

// Lo que ve el cliente: el producto queda agotado si lo marcaron a mano
// o si todo su stock ya está comprometido en pedidos
export function withAvailability(
  products: Product[],
  committed: Record<number, number>
): Product[] {
  return products.map((product) => {
    const available = getAvailable(product, committed);

    return {
      ...product,
      available,
      soldOut: Boolean(product.soldOut) || available === 0,
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
        product.soldOut ||
        (typeof product.stock === 'number' &&
          (product.stock <= 0 || (committed[product.id] ?? 0) > product.stock))
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

function startOfNextDay(iso: string) {
  const date = new Date(iso);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

// Una falta es: cancelar un pedido pasado el plazo gratuito, o dejar un pedido
// en "listo" sin retirarlo hasta que termina el día. Cancelar el casino nunca cuenta.
function getFaults(
  orders: Order[],
  username: string,
  amnestyAt: string | undefined,
  now: number
): Fault[] {
  const amnesty = amnestyAt ? new Date(amnestyAt).getTime() : 0;
  const faults: Fault[] = [];

  for (const order of orders) {
    if (order.username !== username) continue;

    if (isLateCancellation(order) && order.cancelledAt) {
      faults.push({
        orderId: order.id,
        at: new Date(order.cancelledAt).getTime(),
        reason: 'cancelacion_tardia',
      });
    }

    if (order.status === 'listo') {
      const deadline = startOfNextDay(order.createdAt);

      if (deadline <= now) {
        faults.push({ orderId: order.id, at: deadline, reason: 'no_retirado' });
      }
    }
  }

  return faults.filter((fault) => fault.at > amnesty).sort((a, b) => a.at - b.at);
}

export function computePenaltyStatus(
  orders: Order[],
  username: string,
  amnestyAt: string | undefined,
  now: number = Date.now()
): PenaltyStatus {
  const faults = getFaults(orders, username, amnestyAt, now);

  let recent: number[] = [];
  let blockedUntil: number | null = null;

  // Cada vez que se juntan STRIKE_LIMIT faltas dentro de la ventana, se activa
  // un bloqueo y esas faltas se "consumen" (el contador parte de cero).
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