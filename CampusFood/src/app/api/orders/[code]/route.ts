import { requireSession } from '@/lib/auth/session';
import { toActor } from '@/lib/services/actor';
import { toErrorResponse, ServiceError } from '@/lib/services/errors';
import { optionalString, positiveInt, readJsonBody } from '@/lib/services/http';
import {
  cancelOrder,
  removeOrderItem,
  retireOrder,
  setOrderStatus,
  type RetireInput,
} from '@/lib/services/orders';

export const runtime = 'nodejs';

const CODE_PATTERN = /^CF-[A-Z0-9]{4}$/;
const PAYMENT_METHODS = ['EFECTIVO', 'DEBITO', 'CREDITO', 'OTRO'] as const;

type RouteContext = {
  params: Promise<{ code: string }>;
};

/**
 * Operaciones sobre un pedido, identificado por su código de retiro:
 *   { action: 'status', status: 'pendiente' | 'listo' }   (personal)
 *   { action: 'cancel', reason? }                          (dueño o personal)
 *   { action: 'removeItem', productId, quantity, reason? } (dueño o personal)
 *   { action: 'retire', medioPago? }                       (personal con cobro)
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();

    if (!CODE_PATTERN.test(code)) {
      throw new ServiceError(400, 'INVALID_CODE', 'El código de pedido no es válido.');
    }

    const body = await readJsonBody(request);
    const actor = toActor(auth.session);

    switch (body.action) {
      case 'status': {
        if (body.status !== 'pendiente' && body.status !== 'listo') {
          throw new ServiceError(400, 'INVALID_STATUS', 'Estado no permitido.');
        }

        if (!auth.session.permissions.has('UPDATE_ORDER_STATUS')) {
          throw new ServiceError(403, 'PERMISSION_DENIED', 'No tienes permiso para esta operación.');
        }

        return Response.json({ order: await setOrderStatus(actor, code, body.status) });
      }

      case 'cancel':
        return Response.json({
          order: await cancelOrder(actor, code, optionalString(body.reason)),
        });

      case 'removeItem':
        return Response.json({
          order: await removeOrderItem(actor, code, {
            productId: positiveInt(body.productId, 'productId'),
            quantity: positiveInt(body.quantity, 'quantity'),
            reason: optionalString(body.reason),
          }),
        });

      case 'retire': {
        if (
          !auth.session.permissions.has('UPDATE_ORDER_STATUS') ||
          !auth.session.permissions.has('REGISTER_PAYMENT')
        ) {
          throw new ServiceError(403, 'PERMISSION_DENIED', 'No tienes permiso para esta operación.');
        }

        let medioPago: RetireInput['medioPago'];

        if (body.medioPago !== undefined) {
          const method = PAYMENT_METHODS.find((candidate) => candidate === body.medioPago);

          if (!method) {
            throw new ServiceError(400, 'INVALID_PAYMENT_METHOD', 'Medio de pago no válido.');
          }

          medioPago = method;
        }

        return Response.json({ order: await retireOrder(actor, code, { medioPago }) });
      }

      default:
        throw new ServiceError(400, 'INVALID_ACTION', 'Acción no válida.');
    }
  } catch (error) {
    return toErrorResponse(error, 'PATCH /api/orders/[code]');
  }
}
