import type { Prisma } from '../../../generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ServiceError } from '@/lib/services/errors';
import type { OrderNotification } from '@/types';

type Tx = Prisma.TransactionClient;

const LIST_LIMIT = 50;

type NotificationInput = {
  idUsuario: string;
  idPedido: number;
  tipo: 'PEDIDO_LISTO' | 'PEDIDO_CANCELADO' | 'PRODUCTO_RETIRADO';
  clave: string;
  titulo: string;
  mensaje: string;
};

/**
 * Crea un aviso. Si ya existía uno con la misma clave (aunque el usuario lo
 * haya descartado) no se vuelve a crear.
 */
export async function createNotification(tx: Tx, input: NotificationInput) {
  await tx.notificacionPedido.createMany({
    data: [input],
    skipDuplicates: true,
  });
}

const KIND = {
  PEDIDO_LISTO: 'ready',
  PEDIDO_CANCELADO: 'cancelled',
  PRODUCTO_RETIRADO: 'adjusted',
} as const;

export async function listNotifications(userId: string): Promise<OrderNotification[]> {
  const rows = await prisma.notificacionPedido.findMany({
    where: { idUsuario: userId, fechaDescarte: null },
    select: {
      idNotificacion: true,
      tipo: true,
      mensaje: true,
      leida: true,
      fechaCreacion: true,
      pedido: { select: { codigoRetiro: true } },
    },
    orderBy: { fechaCreacion: 'desc' },
    take: LIST_LIMIT,
  });

  return rows.map((row) => ({
    id: String(row.idNotificacion),
    orderId: row.pedido?.codigoRetiro ?? '',
    kind: KIND[row.tipo],
    message: row.mensaje,
    read: row.leida,
    createdAt: row.fechaCreacion.toISOString(),
  }));
}

function parseId(id: string): number {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ServiceError(400, 'INVALID_ID', 'Identificador de notificación inválido.');
  }

  return parsed;
}

// Siempre se filtra por usuario: nadie puede tocar avisos ajenos.
export async function markNotificationRead(userId: string, id: string) {
  await prisma.notificacionPedido.updateMany({
    where: { idNotificacion: parseId(id), idUsuario: userId, leida: false },
    data: { leida: true, fechaLectura: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notificacionPedido.updateMany({
    where: { idUsuario: userId, leida: false },
    data: { leida: true, fechaLectura: new Date() },
  });
}

export async function dismissNotification(userId: string, id: string) {
  await prisma.notificacionPedido.updateMany({
    where: { idNotificacion: parseId(id), idUsuario: userId, fechaDescarte: null },
    data: { fechaDescarte: new Date() },
  });
}
