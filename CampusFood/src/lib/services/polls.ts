import { Prisma } from '../../../generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ServiceError } from '@/lib/services/errors';
import { parseDate } from '@/lib/services/menu';

export type PollDto = {
  id: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
  startDate: string;
  endDate: string;
  active: boolean;
  // Vigente hoy (hora de Chile): activa y dentro del rango de fechas.
  open: boolean;
};

export type PollsResponse = {
  poll: PollDto | null;
  history: PollDto[];
  // idEncuesta -> idOpcion elegida por el usuario
  myVotes: Record<string, string>;
};

const HISTORY_LIMIT = 50;
const MAX_OPTIONS = 10;

/** Fecha de hoy en Chile (AAAA-MM-DD): no depende de la zona horaria del navegador. */
export function todayInChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

const pollInclude = {
  opciones: {
    select: {
      idOpcion: true,
      etiqueta: true,
      _count: { select: { votos: true } },
    },
    orderBy: { orden: 'asc' },
  },
} satisfies Prisma.EncuestaInclude;

type PollRow = Prisma.EncuestaGetPayload<{ include: typeof pollInclude }>;

function toDto(row: PollRow, today: string): PollDto {
  const startDate = row.fechaInicio.toISOString().slice(0, 10);
  const endDate = row.fechaFin.toISOString().slice(0, 10);
  const active = row.estado === 'ACTIVA';

  return {
    id: String(row.idEncuesta),
    question: row.titulo,
    options: row.opciones.map((option) => ({
      id: String(option.idOpcion),
      label: option.etiqueta,
      votes: option._count.votos,
    })),
    startDate,
    endDate,
    active,
    open: active && startDate <= today && today <= endDate,
  };
}

export async function getPolls(userId: string): Promise<PollsResponse> {
  const today = todayInChile();

  const [current, archived] = await Promise.all([
    prisma.encuesta.findFirst({
      where: { estado: { in: ['ACTIVA', 'CERRADA'] } },
      include: pollInclude,
      orderBy: { fechaCreacion: 'desc' },
    }),
    prisma.encuesta.findMany({
      where: { estado: 'ARCHIVADA' },
      include: pollInclude,
      orderBy: { fechaCreacion: 'desc' },
      take: HISTORY_LIMIT,
    }),
  ]);

  const ids = [...(current ? [current.idEncuesta] : []), ...archived.map((poll) => poll.idEncuesta)];

  const votes = await prisma.voto.findMany({
    where: { idUsuario: userId, idEncuesta: { in: ids } },
    select: { idEncuesta: true, idOpcion: true },
  });

  return {
    poll: current ? toDto(current, today) : null,
    history: archived.map((poll) => toDto(poll, today)),
    myVotes: Object.fromEntries(votes.map((vote) => [String(vote.idEncuesta), String(vote.idOpcion)])),
  };
}

export type CreatePollInput = {
  question: unknown;
  options: unknown;
  startDate: unknown;
  endDate: unknown;
};

export async function createPoll(userId: string, input: CreatePollInput): Promise<void> {
  const question = typeof input.question === 'string' ? input.question.trim() : '';

  if (question.length === 0 || question.length > 255) {
    throw new ServiceError(400, 'INVALID_QUESTION', 'La pregunta es obligatoria (máximo 255 caracteres).');
  }

  if (!Array.isArray(input.options)) {
    throw new ServiceError(400, 'INVALID_OPTIONS', 'Faltan las opciones.');
  }

  const labels = input.options.map((option: unknown) =>
    typeof option === 'string' ? option.trim() : '',
  );

  if (
    labels.length < 2 ||
    labels.length > MAX_OPTIONS ||
    labels.some((label) => label.length === 0 || label.length > 150)
  ) {
    throw new ServiceError(400, 'INVALID_OPTIONS', `Se necesitan entre 2 y ${MAX_OPTIONS} opciones válidas.`);
  }

  if (new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) {
    throw new ServiceError(400, 'DUPLICATE_OPTIONS', 'Las opciones no pueden repetirse.');
  }

  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);

  if (end < start) {
    throw new ServiceError(400, 'INVALID_RANGE', 'La fecha de término no puede ser anterior a la de inicio.');
  }

  await prisma.$transaction(async (tx) => {
    // La encuesta anterior pasa al historial antes de publicar la nueva.
    await tx.encuesta.updateMany({
      where: { estado: { in: ['ACTIVA', 'CERRADA'] } },
      data: { estado: 'ARCHIVADA' },
    });

    const options = await Promise.all(
      labels.map(async (label, index) => {
        // Si la opción coincide con un plato del catálogo, queda enlazada a él.
        const plato = await tx.plato.findFirst({
          where: { nombre: { equals: label, mode: 'insensitive' }, activo: true },
          select: { idPlato: true },
        });

        return { etiqueta: label, idPlato: plato?.idPlato ?? null, orden: index };
      }),
    );

    await tx.encuesta.create({
      data: {
        titulo: question,
        fechaInicio: start,
        fechaFin: end,
        creadoPor: userId,
        opciones: { create: options },
      },
    });
  });
}

function parsePollId(value: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceError(400, 'INVALID_ID', 'Identificador de encuesta inválido.');
  }

  return id;
}

export async function setPollState(
  rawId: string,
  action: 'close' | 'reopen' | 'archive',
): Promise<void> {
  const id = parsePollId(rawId);
  const poll = await prisma.encuesta.findUnique({ where: { idEncuesta: id }, select: { estado: true } });

  if (!poll) {
    throw new ServiceError(404, 'POLL_NOT_FOUND', 'La encuesta no existe.');
  }

  const next =
    action === 'close' && poll.estado === 'ACTIVA'
      ? 'CERRADA'
      : action === 'reopen' && poll.estado === 'CERRADA'
        ? 'ACTIVA'
        : action === 'archive' && poll.estado !== 'ARCHIVADA'
          ? 'ARCHIVADA'
          : null;

  if (!next) {
    throw new ServiceError(409, 'INVALID_TRANSITION', 'La encuesta no puede cambiar a ese estado.');
  }

  await prisma.encuesta.update({ where: { idEncuesta: id }, data: { estado: next } });
}

/** Un voto por usuario y encuesta; lo garantiza el índice único (idEncuesta, idUsuario). */
export async function castVote(userId: string, rawPollId: string, rawOptionId: unknown): Promise<void> {
  const idEncuesta = parsePollId(rawPollId);
  const idOpcion = typeof rawOptionId === 'string' ? Number(rawOptionId) : rawOptionId;

  if (typeof idOpcion !== 'number' || !Number.isInteger(idOpcion) || idOpcion <= 0) {
    throw new ServiceError(400, 'INVALID_ID', 'Opción inválida.');
  }

  const poll = await prisma.encuesta.findUnique({
    where: { idEncuesta },
    select: { estado: true, fechaInicio: true, fechaFin: true },
  });

  const today = todayInChile();

  if (
    !poll ||
    poll.estado !== 'ACTIVA' ||
    poll.fechaInicio.toISOString().slice(0, 10) > today ||
    poll.fechaFin.toISOString().slice(0, 10) < today
  ) {
    throw new ServiceError(409, 'POLL_CLOSED', 'La votación no está abierta.');
  }

  try {
    // La clave compuesta (opción, encuesta) impide votar una opción de otra encuesta.
    await prisma.voto.create({ data: { idEncuesta, idOpcion, idUsuario: userId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ServiceError(409, 'ALREADY_VOTED', 'Ya votaste en esta encuesta.');
      }

      if (error.code === 'P2003') {
        throw new ServiceError(400, 'INVALID_OPTION', 'La opción no pertenece a la encuesta.');
      }
    }

    throw error;
  }
}
