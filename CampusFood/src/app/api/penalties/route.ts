import { requireSession } from '@/lib/auth/session';
import { toErrorResponse, ServiceError } from '@/lib/services/errors';
import { readJsonBody } from '@/lib/services/http';
import { getPenaltyStatus, liftBlock, listBlockedUsers } from '@/lib/services/penalties';

export const runtime = 'nodejs';

/** Faltas del usuario; el personal con MANAGE_PENALTIES recibe además los clientes bloqueados. */
export async function GET() {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const status = await getPenaltyStatus(auth.session.userId);
    const canManage = auth.session.permissions.has('MANAGE_PENALTIES');

    return Response.json({
      status,
      ...(canManage ? { blocked: await listBlockedUsers() } : {}),
    });
  } catch (error) {
    return toErrorResponse(error, 'GET /api/penalties');
  }
}

/** { action: 'lift', username } — levanta el bloqueo de un cliente (MANAGE_PENALTIES). */
export async function POST(request: Request) {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    if (!auth.session.permissions.has('MANAGE_PENALTIES')) {
      throw new ServiceError(403, 'PERMISSION_DENIED', 'No tienes permiso para esta operación.');
    }

    const body = await readJsonBody(request);

    if (body.action !== 'lift') {
      throw new ServiceError(400, 'INVALID_ACTION', 'Acción no válida.');
    }

    await liftBlock(auth.session.userId, body.username);

    return Response.json({
      status: await getPenaltyStatus(auth.session.userId),
      blocked: await listBlockedUsers(),
    });
  } catch (error) {
    return toErrorResponse(error, 'POST /api/penalties');
  }
}
