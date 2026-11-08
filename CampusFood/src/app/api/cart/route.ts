import { requireSession } from '@/lib/auth/session';
import { getCart, replaceCart } from '@/lib/services/cart';
import { toErrorResponse, ServiceError } from '@/lib/services/errors';
import { positiveInt, readJsonBody } from '@/lib/services/http';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return Response.json({ items: await getCart(auth.session.userId) });
  } catch (error) {
    return toErrorResponse(error, 'GET /api/cart');
  }
}

/** Reemplaza el carrito activo: { items: [{ productId, quantity }] } */
export async function PUT(request: Request) {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await readJsonBody(request);

    if (!Array.isArray(body.items)) {
      throw new ServiceError(400, 'INVALID_FIELD', 'Faltan los productos del carrito.');
    }

    const lines = body.items.map((raw: unknown) => {
      if (typeof raw !== 'object' || raw === null) {
        throw new ServiceError(400, 'INVALID_ITEM', 'Hay un producto inválido.');
      }

      const item = raw as Record<string, unknown>;

      return {
        productId: positiveInt(item.productId, 'productId'),
        quantity: positiveInt(item.quantity, 'quantity'),
      };
    });

    return Response.json({ items: await replaceCart(auth.session.userId, lines) });
  } catch (error) {
    return toErrorResponse(error, 'PUT /api/cart');
  }
}
