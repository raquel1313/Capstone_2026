import { requireSession } from '@/lib/auth/session';
import { toErrorResponse, ServiceError } from '@/lib/services/errors';
import { readJsonBody } from '@/lib/services/http';
import {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/services/notifications';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return Response.json({
      notifications: await listNotifications(auth.session.userId),
    });
  } catch (error) {
    return toErrorResponse(error, 'GET /api/notifications');
  }
}

/** { action: 'read', id } | { action: 'readAll' } | { action: 'dismiss', id } */
export async function PATCH(request: Request) {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await readJsonBody(request);
    const userId = auth.session.userId;

    if (body.action === 'readAll') {
      await markAllNotificationsRead(userId);
    } else if (body.action === 'read' || body.action === 'dismiss') {
      if (typeof body.id !== 'string') {
        throw new ServiceError(400, 'INVALID_ID', 'Falta el identificador de la notificación.');
      }

      if (body.action === 'read') {
        await markNotificationRead(userId, body.id);
      } else {
        await dismissNotification(userId, body.id);
      }
    } else {
      throw new ServiceError(400, 'INVALID_ACTION', 'Acción no válida.');
    }

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error, 'PATCH /api/notifications');
  }
}
