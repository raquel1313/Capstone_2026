import { Prisma } from '../../../generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ServiceError } from '@/lib/services/errors';
import {
  BLOCK_DAYS,
  computeStatusFromFaults,
  type Fault,
  type PenaltyStatus,
} from '@/utils/orderRules';

/*
 * Una falta es: dejar un pedido en "listo" sin retirarlo hasta que termina el día 
 * (medianoche de Chile). Las cancelaciones no generan faltas. Con 3 faltas en 7 días 
 * el cliente queda bloqueado 3 días. El bloqueo se calcula desde las faltas guardadas 
 * y se valida en el servidor.
 */

type Tx = Prisma.TransactionClient;

const FAULT_LOOKBACK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type BlockedUserDto = {
  username: string;
  until: number;
  strikes: number;
};

export type PenaltyView = {
  status: PenaltyStatus;
  blocked?: BlockedUserDto[];
};

const REASON = {
  NO_RETIRO: 'no_retirado',
} as const;

/**
 * Registra como falta los pedidos que quedaron "listo" sin retirar al terminar el día
 * (medianoche de Chile). Es idempotente: un pedido genera una sola falta.
 */
export async function syncMissedPickups(userId?: string) {
  const userFilter = userId
    ? Prisma.sql`AND o.id_usuario = ${userId}::uuid`
    : Prisma.empty;

  await prisma.$executeRaw`
    INSERT INTO penalizaciones (id_usuario, id_pedido, tipo, fecha_falta)
    SELECT o.id_usuario, o.id_pedido, 'NO_RETIRO'::"TipoPenalizacion",
           ((date_trunc('day', o.fecha_creacion AT TIME ZONE 'America/Santiago') + interval '1 day')
             AT TIME ZONE 'America/Santiago')
    FROM pedidos o
    JOIN estados_pedido e ON e.id_estado = o.id_estado
    WHERE e.nombre = 'LISTO'
      AND ((date_trunc('day', o.fecha_creacion AT TIME ZONE 'America/Santiago') + interval '1 day')
             AT TIME ZONE 'America/Santiago') <= now()
      ${userFilter}
    ON CONFLICT (id_pedido, tipo) DO NOTHING
  `;
}

const faultSelect = {
  tipo: true,
  fechaFalta: true,
  pedido: { select: { codigoRetiro: true, clienteEmail: true } },
} satisfies Prisma.PenalizacionSelect;

type FaultRow = Prisma.PenalizacionGetPayload<{ select: typeof faultSelect }>;

function toFault(row: FaultRow): Fault {
  return {
    orderId: row.pedido.codigoRetiro,
    at: row.fechaFalta.getTime(),
    reason: REASON.NO_RETIRO,
  };
}

function lookbackDate() {
  return new Date(Date.now() - FAULT_LOOKBACK_DAYS * DAY_MS);
}

export async function getPenaltyStatus(userId: string): Promise<PenaltyStatus> {
  await syncMissedPickups(userId);

  const rows = await prisma.penalizacion.findMany({
    where: { idUsuario: userId, anulada: false, fechaFalta: { gte: lookbackDate() } },
    select: faultSelect,
    orderBy: { fechaFalta: 'asc' },
  });

  return computeStatusFromFaults(rows.map(toFault));
}

/** Lanza 403 si el cliente está bloqueado. Se llama antes de crear un pedido. */
export async function assertNotBlocked(userId: string) {
  const status = await getPenaltyStatus(userId);

  if (status.isBlocked && status.blockedUntil !== null) {
    const until = new Date(status.blockedUntil).toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    throw new ServiceError(
      403,
      'USER_BLOCKED',
      `No puedes hacer pedidos hasta el ${until} por acumular ${status.strikes} faltas.`,
    );
  }
}

/** Clientes con bloqueo vigente (para el personal). */
export async function listBlockedUsers(): Promise<BlockedUserDto[]> {
  await syncMissedPickups();

  const rows = await prisma.penalizacion.findMany({
    where: { anulada: false, fechaFalta: { gte: lookbackDate() } },
    select: { idUsuario: true, ...faultSelect },
    orderBy: { fechaFalta: 'asc' },
  });

  const byUser = new Map<string, { email: string; faults: Fault[] }>();

  for (const row of rows) {
    const entry = byUser.get(row.idUsuario) ?? { email: row.pedido.clienteEmail, faults: [] };

    entry.faults.push(toFault(row));
    byUser.set(row.idUsuario, entry);
  }

  const blocked: BlockedUserDto[] = [];

  for (const { email, faults } of byUser.values()) {
    const status = computeStatusFromFaults(faults);

    if (status.isBlocked && status.blockedUntil !== null) {
      blocked.push({ username: email, until: status.blockedUntil, strikes: status.strikes });
    }
  }

  return blocked.sort((a, b) => a.until - b.until);
}

/** Levanta el bloqueo: anula las faltas vigentes del cliente (amnistía). */
export async function liftBlock(actorId: string, username: unknown) {
  if (typeof username !== 'string' || username.trim() === '') {
    throw new ServiceError(400, 'INVALID_USER', 'Falta el cliente.');
  }

  const result = await prisma.penalizacion.updateMany({
    where: {
      anulada: false,
      pedido: { clienteEmail: { equals: username.trim(), mode: 'insensitive' } },
    },
    data: { anulada: true, fechaAnulacion: new Date(), anuladaPor: actorId },
  });

  return result.count;
}

export { BLOCK_DAYS };