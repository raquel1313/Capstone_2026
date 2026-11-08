import { requireSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/require-permission';
import { toErrorResponse, ServiceError } from '@/lib/services/errors';
import { readJsonBody } from '@/lib/services/http';
import { addDish, getMenu, moveDay, removeDay, removeDish, updateDish } from '@/lib/services/menu';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return Response.json({ days: await getMenu() });
  } catch (error) {
    return toErrorResponse(error, 'GET /api/menu');
  }
}

/**
 * Cambios al menú (permiso MANAGE_MENU):
 *   { action: 'addDish', date, name, detail, color, image? }
 *   { action: 'updateDish', id, name?, detail?, color?, image?, soldOut? }
 *   { action: 'removeDish', id }
 *   { action: 'moveDay', from, to }
 *   { action: 'removeDay', date }
 */
export async function POST(request: Request) {
  const auth = await requirePermission('MANAGE_MENU');

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await readJsonBody(request);

    switch (body.action) {
      case 'addDish':
        await addDish(auth.userId, {
          date: body.date as string,
          name: body.name as string,
          detail: body.detail as string,
          color: body.color as string,
          image: typeof body.image === 'string' ? body.image : undefined,
          soldOut: body.soldOut === true,
        });
        break;

      case 'updateDish':
        await updateDish(auth.userId, body.id, {
          name: typeof body.name === 'string' ? body.name : undefined,
          detail: typeof body.detail === 'string' ? body.detail : undefined,
          color: typeof body.color === 'string' ? body.color : undefined,
          image: typeof body.image === 'string' ? body.image : undefined,
          soldOut: typeof body.soldOut === 'boolean' ? body.soldOut : undefined,
        });
        break;

      case 'removeDish':
        await removeDish(body.id);
        break;

      case 'moveDay':
        await moveDay(auth.userId, body.from, body.to);
        break;

      case 'removeDay':
        await removeDay(body.date);
        break;

      default:
        throw new ServiceError(400, 'INVALID_ACTION', 'Acción no válida.');
    }

    return Response.json({ days: await getMenu() });
  } catch (error) {
    return toErrorResponse(error, 'POST /api/menu');
  }
}
