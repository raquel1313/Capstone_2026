import type { NivelReaccion } from '../../../generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ServiceError } from '@/lib/services/errors';

// Mismo orden y emojis que usa la interfaz (REACTIONS en useReactions).
const EMOJI_BY_LEVEL: Record<NivelReaccion, string> = {
  EXCELENTE: '👏',
  BUENO: '👍',
  REGULAR: '🤏',
  MALO: '👎',
};

const LEVEL_BY_EMOJI = new Map<string, NivelReaccion>(
  (Object.entries(EMOJI_BY_LEVEL) as [NivelReaccion, string][]).map(([level, emoji]) => [emoji, level]),
);

export type ReactionSummary = {
  // idOferta (id del plato en pantalla) -> emoji -> cantidad
  counts: Record<string, Record<string, number>>;
  // Reacción del usuario: idOferta -> emoji
  mine: Record<string, string>;
};

export async function getReactionSummary(userId: string): Promise<ReactionSummary> {
  const [grouped, mine] = await Promise.all([
    prisma.reaccion.groupBy({
      by: ['idOferta', 'nivel'],
      _count: { _all: true },
    }),
    prisma.reaccion.findMany({
      where: { idUsuario: userId },
      select: { idOferta: true, nivel: true },
    }),
  ]);

  const counts: ReactionSummary['counts'] = {};

  for (const row of grouped) {
    const key = String(row.idOferta);

    counts[key] = {
      ...(counts[key] ?? {}),
      [EMOJI_BY_LEVEL[row.nivel]]: row._count._all,
    };
  }

  const own: ReactionSummary['mine'] = {};

  for (const row of mine) {
    own[String(row.idOferta)] = EMOJI_BY_LEVEL[row.nivel];
  }

  return { counts, mine: own };
}

/** Guarda la reacción del usuario a un plato; `emoji = null` la quita. */
export async function setReaction(
  userId: string,
  rawDishId: unknown,
  emoji: unknown,
): Promise<void> {
  const idOferta = typeof rawDishId === 'string' ? Number(rawDishId) : rawDishId;

  if (typeof idOferta !== 'number' || !Number.isInteger(idOferta) || idOferta <= 0) {
    throw new ServiceError(400, 'INVALID_ID', 'Identificador de plato inválido.');
  }

  if (emoji === null) {
    await prisma.reaccion.deleteMany({ where: { idUsuario: userId, idOferta } });

    return;
  }

  const nivel = typeof emoji === 'string' ? LEVEL_BY_EMOJI.get(emoji) : undefined;

  if (!nivel) {
    throw new ServiceError(400, 'INVALID_REACTION', 'Reacción no válida.');
  }

  const offer = await prisma.ofertaMenu.findUnique({
    where: { idOferta },
    select: { idOferta: true },
  });

  if (!offer) {
    throw new ServiceError(404, 'DISH_NOT_FOUND', 'El plato ya no está en el menú.');
  }

  // Una reacción por usuario y plato: si ya existía, se reemplaza.
  await prisma.reaccion.upsert({
    where: { idUsuario_idOferta: { idUsuario: userId, idOferta } },
    update: { nivel },
    create: { idUsuario: userId, idOferta, nivel },
  });
}
