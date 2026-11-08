import type { SessionUser } from '@/lib/auth/session';
import type { Actor } from '@/lib/services/orders';

/** El personal con VIEW_ORDERS puede ver y gestionar los pedidos de todos. */
export function toActor(session: SessionUser): Actor {
  return {
    userId: session.userId,
    email: session.email,
    nombre: session.nombre,
    apellido: session.apellido,
    canManageOrders: session.permissions.has('VIEW_ORDERS'),
  };
}
