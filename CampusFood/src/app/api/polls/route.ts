import { requireSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/require-permission';
import { toErrorResponse } from '@/lib/services/errors';
import { readJsonBody } from '@/lib/services/http';
import { createPoll, getPolls } from '@/lib/services/polls';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return Response.json(await getPolls(auth.session.userId));
  } catch (error) {
    return toErrorResponse(error, 'GET /api/polls');
  }
}

/** Crea una encuesta (MANAGE_POLLS). La vigente anterior pasa al historial. */
export async function POST(request: Request) {
  const auth = await requirePermission('MANAGE_POLLS');

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await readJsonBody(request);

    await createPoll(auth.userId, {
      question: body.question,
      options: body.options,
      startDate: body.startDate,
      endDate: body.endDate,
    });

    return Response.json(await getPolls(auth.userId), { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'POST /api/polls');
  }
}
