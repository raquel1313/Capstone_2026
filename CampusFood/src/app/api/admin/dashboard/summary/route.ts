import { requireSessionWithPermission } from '@/lib/auth/session';
import { rangeFromRequest } from '@/lib/dashboard/request';
import { toErrorResponse } from '@/lib/services/errors';
import { getDashboardSummary } from '@/lib/services/dashboard';

export const runtime = 'nodejs';

/**
 * KPIs de pedidos con comparación, cancelaciones y faltas (permiso VIEW_DASHBOARD).
 * Los montos (valor de pedidos, ingreso registrado, ticket) solo se incluyen si el
 * usuario además tiene VIEW_FINANCIALS; si no, `commercial` llega como null.
 */
export async function GET(request: Request) {
  const auth = await requireSessionWithPermission('VIEW_DASHBOARD');

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const range = rangeFromRequest(request);

    const summary = await getDashboardSummary(range, {
      includeCommercial: auth.session.permissions.has('VIEW_FINANCIALS'),
    });

    return Response.json(summary, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return toErrorResponse(error, 'GET /api/admin/dashboard/summary');
  }
}
