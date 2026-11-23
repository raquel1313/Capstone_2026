import { requireSessionWithPermission } from '@/lib/auth/session';
import { rangeFromRequest } from '@/lib/dashboard/request';
import { toErrorResponse } from '@/lib/services/errors';
import { getOrdersDashboard } from '@/lib/services/dashboard';

export const runtime = 'nodejs';

/** Demanda (por día, hora y día de la semana) y tiempos operativos (permiso VIEW_DASHBOARD). */
export async function GET(request: Request) {
  const auth = await requireSessionWithPermission('VIEW_DASHBOARD');

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const data = await getOrdersDashboard(rangeFromRequest(request));

    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return toErrorResponse(error, 'GET /api/admin/dashboard/orders');
  }
}
