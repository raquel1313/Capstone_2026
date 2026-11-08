import { requireSession } from '@/lib/auth/session';
import { toErrorResponse, ServiceError } from '@/lib/services/errors';
import { readJsonBody } from '@/lib/services/http';
import { castVote, getPolls, setPollState } from '@/lib/services/polls';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/**
 *   { action: 'vote', optionId }                    (cualquier usuario activo)
 *   { action: 'close' | 'reopen' | 'archive' }      (permiso MANAGE_POLLS)
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await readJsonBody(request);

    if (body.action === 'vote') {
      await castVote(auth.session.userId, id, body.optionId);
    } else if (body.action === 'close' || body.action === 'reopen' || body.action === 'archive') {
      if (!auth.session.permissions.has('MANAGE_POLLS')) {
        throw new ServiceError(403, 'PERMISSION_DENIED', 'No tienes permiso para esta operación.');
      }

      await setPollState(id, body.action);
    } else {
      throw new ServiceError(400, 'INVALID_ACTION', 'Acción no válida.');
    }

    return Response.json(await getPolls(auth.session.userId));
  } catch (error) {
    return toErrorResponse(error, 'PATCH /api/polls/[id]');
  }
}
