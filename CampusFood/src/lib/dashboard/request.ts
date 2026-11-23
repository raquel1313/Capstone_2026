import { resolveRange } from '@/lib/dashboard/range';
import type { ResolvedRange } from '@/lib/dashboard/types';

/** Lee ?preset=&from=&to= de la URL y lo convierte en un rango validado. */
export function rangeFromRequest(request: Request): ResolvedRange {
  const params = new URL(request.url).searchParams;

  return resolveRange({
    preset: params.get('preset') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  });
}
