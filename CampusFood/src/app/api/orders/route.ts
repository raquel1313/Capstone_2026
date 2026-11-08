import { requireSession } from '@/lib/auth/session';
import { toErrorResponse, ServiceError } from '@/lib/services/errors';
import { readJsonBody, positiveInt } from '@/lib/services/http';
import { toActor } from '@/lib/services/actor';
import { createOrder, listOrders } from '@/lib/services/orders';

export const runtime = 'nodejs';

/** Estudiantes: sus pedidos. Personal con VIEW_ORDERS: todos los pedidos. */
export async function GET() {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const orders = await listOrders(toActor(auth.session));

    return Response.json({ orders });
  } catch (error) {
    return toErrorResponse(error, 'GET /api/orders');
  }
}

export async function POST(request: Request) {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await readJsonBody(request);

    if (!Array.isArray(body.items)) {
      throw new ServiceError(400, 'INVALID_FIELD', 'Faltan los productos del pedido.');
    }

    const items = body.items.map((raw: unknown) => {
      if (typeof raw !== 'object' || raw === null) {
        throw new ServiceError(400, 'INVALID_ITEM', 'Hay un producto inválido.');
      }

      const item = raw as Record<string, unknown>;

      return {
        productId: positiveInt(item.productId, 'productId'),
        quantity: positiveInt(item.quantity, 'quantity'),
      };
    });

    const order = await createOrder(toActor(auth.session), { items });

    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'POST /api/orders');
  }
}
