import { requireSession } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/services/errors';
import { readJsonBody } from '@/lib/services/http';
import { getReactionSummary, setReaction } from '@/lib/services/reactions';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return Response.json(await getReactionSummary(auth.session.userId));
  } catch (error) {
    return toErrorResponse(error, 'GET /api/reactions');
  }
}

/** { dishId, emoji | null }: guarda o quita la reacción del usuario a un plato. */
export async function PUT(request: Request) {
  const auth = await requireSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await readJsonBody(request);

    await setReaction(auth.session.userId, body.dishId, body.emoji ?? null);

    return Response.json(await getReactionSummary(auth.session.userId));
  } catch (error) {
    return toErrorResponse(error, 'PUT /api/reactions');
  }
}
