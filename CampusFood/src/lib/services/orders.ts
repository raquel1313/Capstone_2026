import { randomInt } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ServiceError } from '@/lib/services/errors';
import { createNotification } from '@/lib/services/notifications';
import { assertNotBlocked, recordLateCancellation } from '@/lib/services/penalties';
import type { Order, OrderStatus } from '@/types';

/*
 * Reglas de stock:
 *  - disponible = stock - unidades en pedidos PENDIENTE o LISTO
 *  - CANCELADO libera esas unidades
 *  - RETIRADO descuenta el stock físico
 * Toda la validación se hace dentro de una transacción con bloqueo de las
 * filas de producto (SELECT ... FOR UPDATE), de modo que dos pedidos
 * simultáneos no pueden quedarse con la misma unidad.
 */

type Tx = Prisma.TransactionClient;

export type Actor = {
  userId: string;
  email: string;
  nombre: string;
  apellido: string;
  canManageOrders: boolean;
};

const ESTADOS = ['PENDIENTE', 'LISTO', 'RETIRADO', 'CANCELADO'] as const;
type EstadoNombre = (typeof ESTADOS)[number];

const COMMITTED_STATES = ['PENDIENTE', 'LISTO'] as const;

// Sin 0/O/1/I/L para que el código no se confunda al leerlo.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const CODE_PREFIX = 'CF-';
const CODE_MAX_ATTEMPTS = 6;

const formatPrice = (value: number) => `$${value.toLocaleString('es-CL')}`;

const MAX_ITEMS_PER_ORDER = 30;
const MAX_QUANTITY_PER_ITEM = 20;
const LIST_LIMIT = 500;

function generatePickupCode(): string {
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }

  return `${CODE_PREFIX}${code}`;
}

async function getEstadoIds(tx: Tx): Promise<Record<EstadoNombre, number>> {
  const rows = await tx.estadoPedido.findMany({
    where: { nombre: { in: [...ESTADOS] } },
    select: { idEstado: true, nombre: true },
  });

  const map = new Map(rows.map((row) => [row.nombre, row.idEstado]));
  const result = {} as Record<EstadoNombre, number>;

  for (const nombre of ESTADOS) {
    const id = map.get(nombre);

    if (id === undefined) {
      throw new ServiceError(
        500,
        'ESTADOS_NO_CONFIGURADOS',
        `Falta el estado de pedido ${nombre}. Ejecuta el seed de la base de datos.`,
      );
    }

    result[nombre] = id;
  }

  return result;
}

/* ------------------------------ Lectura ------------------------------ */

const orderInclude = {
  estado: { select: { nombre: true } },
  detalles: {
    select: {
      idProducto: true,
      nombreProducto: true,
      cantidad: true,
      precioUnitario: true,
    },
    orderBy: { idDetalle: 'asc' },
  },
  ajustes: {
    select: {
      idProducto: true,
      nombreProducto: true,
      cantidad: true,
      origen: true,
      motivo: true,
      fecha: true,
    },
    orderBy: { fecha: 'asc' },
  },
  historial: {
    where: { estado: { nombre: 'RETIRADO' } },
    select: {
      usuario: { select: { nombre: true, apellido: true } },
    },
    take: 1,
  },
  pago: {
    select: { monto: true, medioPago: true, fechaPago: true },
  },
} satisfies Prisma.PedidoInclude;

type OrderRow = Prisma.PedidoGetPayload<{ include: typeof orderInclude }>;

function toOrderStatus(nombre: string): OrderStatus {
  switch (nombre) {
    case 'LISTO':
      return 'listo';
    case 'RETIRADO':
      return 'retirado';
    case 'CANCELADO':
      return 'cancelado';
    default:
      return 'pendiente';
  }
}

export function toOrder(row: OrderRow): Order {
  const retirador = row.historial[0]?.usuario;

  return {
    id: row.codigoRetiro,
    username: row.clienteEmail,
    items: row.detalles.map((detalle) => ({
      id: detalle.idProducto,
      name: detalle.nombreProducto,
      price: detalle.precioUnitario,
      quantity: detalle.cantidad,
    })),
    subtotal: row.total,
    status: toOrderStatus(row.estado.nombre),
    createdAt: row.fechaCreacion.toISOString(),
    cancelledAt: row.fechaCancelacion?.toISOString(),
    cancelledBy: row.origenCancelacion
      ? row.origenCancelacion === 'CLIENTE'
        ? 'cliente'
        : 'personal'
      : undefined,
    cancelReason: row.motivoCancelacion ?? undefined,
    retiredAt: row.fechaRetiro?.toISOString(),
    retiredBy: retirador
      ? `${retirador.nombre} ${retirador.apellido}`.trim()
      : undefined,
    adjustments: row.ajustes.map((ajuste) => ({
      at: ajuste.fecha.toISOString(),
      by: ajuste.origen === 'CLIENTE' ? 'cliente' : 'personal',
      itemId: ajuste.idProducto,
      name: ajuste.nombreProducto,
      quantity: ajuste.cantidad,
      reason: ajuste.motivo,
    })),
    payment: row.pago
      ? {
          amount: row.pago.monto,
          method: row.pago.medioPago,
          at: row.pago.fechaPago.toISOString(),
        }
      : undefined,
  };
}

async function loadOrder(tx: Tx | typeof prisma, code: string): Promise<Order> {
  const row = await tx.pedido.findUnique({
    where: { codigoRetiro: code },
    include: orderInclude,
  });

  if (!row) {
    throw new ServiceError(404, 'ORDER_NOT_FOUND', 'El pedido no existe.');
  }

  return toOrder(row);
}

export async function listOrders(actor: Actor): Promise<Order[]> {
  const rows = await prisma.pedido.findMany({
    where: actor.canManageOrders ? {} : { idUsuario: actor.userId },
    include: orderInclude,
    orderBy: { fechaCreacion: 'desc' },
    take: LIST_LIMIT,
  });

  return rows.map(toOrder);
}

/** Unidades de cada producto que están en pedidos PENDIENTE o LISTO. */
export async function getCommittedUnits(
  client: Tx | typeof prisma = prisma,
): Promise<Map<number, number>> {
  const rows = await client.$queryRaw<
    { id_producto: number; comprometido: number }[]
  >`
    SELECT d.id_producto, COALESCE(SUM(d.cantidad), 0)::int AS comprometido
    FROM pedido_detalle d
    JOIN pedidos o ON o.id_pedido = d.id_pedido
    JOIN estados_pedido e ON e.id_estado = o.id_estado
    WHERE e.nombre IN (${Prisma.join([...COMMITTED_STATES])})
    GROUP BY d.id_producto
  `;

  return new Map(rows.map((row) => [row.id_producto, row.comprometido]));
}

/* ------------------------------ Creación ------------------------------ */

export type CreateOrderInput = {
  items: { productId: number; quantity: number }[];
};

function normalizeItems(input: CreateOrderInput) {
  if (input.items.length === 0) {
    throw new ServiceError(400, 'EMPTY_ORDER', 'El pedido no tiene productos.');
  }

  if (input.items.length > MAX_ITEMS_PER_ORDER) {
    throw new ServiceError(400, 'TOO_MANY_ITEMS', 'El pedido tiene demasiados productos.');
  }

  const merged = new Map<number, number>();

  for (const item of input.items) {
    if (
      !Number.isInteger(item.productId) ||
      item.productId <= 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > MAX_QUANTITY_PER_ITEM
    ) {
      throw new ServiceError(400, 'INVALID_ITEM', 'Hay un producto o cantidad inválidos.');
    }

    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  return [...merged.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId - b.productId);
}

export async function createOrder(
  actor: Actor,
  input: CreateOrderInput,
): Promise<Order> {
  const items = normalizeItems(input);

  // Un cliente con 3 faltas recientes no puede pedir (se valida en el servidor).
  await assertNotBlocked(actor.userId);

  const ids = items.map((item) => item.productId);

  for (let attempt = 1; attempt <= CODE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const estados = await getEstadoIds(tx);

          // Bloquea las filas de producto (en orden de id para evitar deadlocks).
          const products = await tx.$queryRaw<
            {
              id_producto: number;
              nombre: string;
              precio: number;
              stock: number;
              activo: boolean;
              categoria_activa: boolean;
            }[]
          >`
            SELECT p.id_producto, p.nombre, p.precio, p.stock, p.activo,
                   c.activo AS categoria_activa
            FROM productos p
            JOIN categorias_producto c ON c.id_categoria = p.id_categoria
            WHERE p.id_producto IN (${Prisma.join(ids)})
            ORDER BY p.id_producto
            FOR UPDATE OF p
          `;

          const byId = new Map(products.map((product) => [product.id_producto, product]));
          const committed = await getCommittedUnits(tx);

          let total = 0;

          const detalles = items.map((item) => {
            const product = byId.get(item.productId);

            if (!product || !product.activo || !product.categoria_activa) {
              throw new ServiceError(
                409,
                'PRODUCT_UNAVAILABLE',
                'Uno de los productos ya no está disponible.',
              );
            }

            const available = product.stock - (committed.get(product.id_producto) ?? 0);

            if (item.quantity > available) {
              throw new ServiceError(
                409,
                'INSUFFICIENT_STOCK',
                available <= 0
                  ? `${product.nombre} está agotado.`
                  : `Solo quedan ${available} unidades de ${product.nombre}.`,
              );
            }

            const subtotal = product.precio * item.quantity;
            total += subtotal;

            return {
              idProducto: product.id_producto,
              nombreProducto: product.nombre,
              cantidad: item.quantity,
              precioUnitario: product.precio,
              subtotal,
            };
          });

          const pedido = await tx.pedido.create({
            data: {
              idUsuario: actor.userId,
              idEstado: estados.PENDIENTE,
              codigoRetiro: generatePickupCode(),
              clienteEmail: actor.email,
              total,
              detalles: { create: detalles },
              historial: {
                create: {
                  idEstado: estados.PENDIENTE,
                  cambiadoPor: actor.userId,
                  motivo: 'Pedido creado',
                },
              },
            },
            select: { codigoRetiro: true },
          });

          // El carrito activo queda como histórico: el pedido ya lo reemplaza.
          await tx.carrito.updateMany({
            where: { idUsuario: actor.userId, estado: 'ACTIVO' },
            data: { estado: 'CONVERTIDO' },
          });

          return loadOrder(tx, pedido.codigoRetiro);
        },
        { timeout: 15000, maxWait: 10000 },
      );
    } catch (error) {
      // Colisión del código de retiro: se genera otro y se reintenta.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        attempt < CODE_MAX_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new ServiceError(500, 'CODE_GENERATION_FAILED', 'No fue posible generar el código de retiro.');
}

/* --------------------------- Cambios de estado --------------------------- */

type OrderForUpdate = {
  idPedido: number;
  createdAt: Date;
  idUsuario: string;
  total: number;
  estado: EstadoNombre;
};

async function lockOrder(tx: Tx, code: string): Promise<OrderForUpdate> {
  const rows = await tx.$queryRaw<
    {
      id_pedido: number;
      id_usuario: string;
      total: number;
      fecha_creacion: Date;
      estado: EstadoNombre;
    }[]
  >`
    SELECT o.id_pedido, o.id_usuario, o.total, o.fecha_creacion, e.nombre AS estado
    FROM pedidos o
    JOIN estados_pedido e ON e.id_estado = o.id_estado
    WHERE o.codigo_retiro = ${code}
    FOR UPDATE OF o
  `;

  const row = rows[0];

  if (!row) {
    throw new ServiceError(404, 'ORDER_NOT_FOUND', 'El pedido no existe.');
  }

  return {
    idPedido: row.id_pedido,
    createdAt: row.fecha_creacion,
    idUsuario: row.id_usuario,
    total: row.total,
    estado: row.estado,
  };
}

function assertCanActOn(actor: Actor, order: OrderForUpdate) {
  if (order.idUsuario !== actor.userId && !actor.canManageOrders) {
    // No revelamos si el pedido existe para otro usuario.
    throw new ServiceError(404, 'ORDER_NOT_FOUND', 'El pedido no existe.');
  }
}

function assertStaff(actor: Actor) {
  if (!actor.canManageOrders) {
    throw new ServiceError(403, 'PERMISSION_DENIED', 'No tienes permiso para esta operación.');
  }
}

function cleanReason(reason: string | undefined, fallback: string): string {
  const trimmed = (reason ?? '').trim().slice(0, 255);

  return trimmed || fallback;
}

/** Solo permite pasar entre PENDIENTE y LISTO (cancelar y retirar tienen su propia operación). */
export async function setOrderStatus(
  actor: Actor,
  code: string,
  status: 'pendiente' | 'listo',
): Promise<Order> {
  assertStaff(actor);

  return prisma.$transaction(async (tx) => {
    const estados = await getEstadoIds(tx);
    const order = await lockOrder(tx, code);
    const target: EstadoNombre = status === 'listo' ? 'LISTO' : 'PENDIENTE';

    if (order.estado !== 'PENDIENTE' && order.estado !== 'LISTO') {
      throw new ServiceError(409, 'INVALID_TRANSITION', 'El pedido ya no puede cambiar de estado.');
    }

    if (order.estado === target) {
      return loadOrder(tx, code);
    }

    await tx.pedido.update({
      where: { idPedido: order.idPedido },
      data: {
        idEstado: estados[target],
        ...(target === 'LISTO' ? { fechaConfirmacion: new Date() } : {}),
      },
    });

    await tx.historialEstadoPedido.create({
      data: {
        idPedido: order.idPedido,
        idEstado: estados[target],
        cambiadoPor: actor.userId,
      },
    });

    if (target === 'LISTO') {
      await createNotification(tx, {
        idUsuario: order.idUsuario,
        idPedido: order.idPedido,
        tipo: 'PEDIDO_LISTO',
        clave: `ready:${order.idPedido}`,
        titulo: 'Pedido listo',
        mensaje: `Tu pedido ${code} está listo para retirar.`,
      });
    }

    return loadOrder(tx, code);
  });
}

async function cancelInTransaction(
  tx: Tx,
  actor: Actor,
  order: OrderForUpdate,
  code: string,
  reason: string,
  estados: Record<EstadoNombre, number>,
) {
  const origen = order.idUsuario === actor.userId ? 'CLIENTE' : 'PERSONAL';

  const now = new Date();

  await tx.pedido.update({
    where: { idPedido: order.idPedido },
    data: {
      idEstado: estados.CANCELADO,
      origenCancelacion: origen,
      motivoCancelacion: reason,
      fechaCancelacion: now,
    },
  });

  // Cancelar fuera del plazo gratuito es una falta del cliente.
  if (origen === 'CLIENTE') {
    await recordLateCancellation(tx, {
      idUsuario: order.idUsuario,
      idPedido: order.idPedido,
      createdAt: order.createdAt,
      now,
    });
  }

  await tx.historialEstadoPedido.create({
    data: {
      idPedido: order.idPedido,
      idEstado: estados.CANCELADO,
      cambiadoPor: actor.userId,
      motivo: reason,
    },
  });

  // Solo se avisa si cancela el casino; si el cliente cancela, ya lo sabe.
  if (origen === 'PERSONAL') {
    await createNotification(tx, {
      idUsuario: order.idUsuario,
      idPedido: order.idPedido,
      tipo: 'PEDIDO_CANCELADO',
      clave: `cancelled:${order.idPedido}`,
      titulo: 'Pedido cancelado',
      mensaje: `Tu pedido ${code} fue cancelado por el casino. Motivo: ${reason}.`,
    });
  }
}

export async function cancelOrder(
  actor: Actor,
  code: string,
  reason?: string,
): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    const estados = await getEstadoIds(tx);
    const order = await lockOrder(tx, code);

    assertCanActOn(actor, order);

    if (order.estado !== 'PENDIENTE') {
      throw new ServiceError(409, 'INVALID_TRANSITION', 'Solo se puede cancelar un pedido pendiente.');
    }

    const origen = order.idUsuario === actor.userId ? 'CLIENTE' : 'PERSONAL';
    const fallback =
      origen === 'CLIENTE' ? 'Solicitud del cliente' : 'Cancelado por el casino';

    await cancelInTransaction(tx, actor, order, code, cleanReason(reason, fallback), estados);

    return loadOrder(tx, code);
  });
}

export async function removeOrderItem(
  actor: Actor,
  code: string,
  input: { productId: number; quantity: number; reason?: string },
): Promise<Order> {
  if (
    !Number.isInteger(input.productId) ||
    input.productId <= 0 ||
    !Number.isInteger(input.quantity) ||
    input.quantity <= 0
  ) {
    throw new ServiceError(400, 'INVALID_ITEM', 'Producto o cantidad inválidos.');
  }

  return prisma.$transaction(async (tx) => {
    const estados = await getEstadoIds(tx);
    const order = await lockOrder(tx, code);

    assertCanActOn(actor, order);

    if (order.estado !== 'PENDIENTE') {
      throw new ServiceError(409, 'INVALID_TRANSITION', 'Solo se pueden quitar productos de un pedido pendiente.');
    }

    const detalles = await tx.pedidoDetalle.findMany({
      where: { idPedido: order.idPedido },
      select: {
        idDetalle: true,
        idProducto: true,
        nombreProducto: true,
        cantidad: true,
        precioUnitario: true,
      },
    });

    const target = detalles.find((detalle) => detalle.idProducto === input.productId);

    if (!target) {
      throw new ServiceError(404, 'ITEM_NOT_FOUND', 'El producto no está en el pedido.');
    }

    const origen = order.idUsuario === actor.userId ? 'CLIENTE' : 'PERSONAL';
    const reason = cleanReason(
      input.reason,
      origen === 'CLIENTE' ? 'Solicitud del cliente' : 'Cancelado por el casino',
    );
    const removed = Math.min(input.quantity, target.cantidad);

    const ajuste = await tx.ajustePedido.create({
      data: {
        idPedido: order.idPedido,
        idProducto: target.idProducto,
        nombreProducto: target.nombreProducto,
        cantidad: removed,
        origen,
        motivo: reason,
        realizadoPor: actor.userId,
      },
      select: { idAjuste: true },
    });

    const remainingUnits =
      detalles.reduce((sum, detalle) => sum + detalle.cantidad, 0) - removed;

    // Se quitó todo: queda cancelado y conserva el detalle original.
    if (remainingUnits <= 0) {
      await cancelInTransaction(tx, actor, order, code, reason, estados);

      return loadOrder(tx, code);
    }

    const newQuantity = target.cantidad - removed;

    if (newQuantity === 0) {
      await tx.pedidoDetalle.delete({ where: { idDetalle: target.idDetalle } });
    } else {
      await tx.pedidoDetalle.update({
        where: { idDetalle: target.idDetalle },
        data: {
          cantidad: newQuantity,
          subtotal: newQuantity * target.precioUnitario,
        },
      });
    }

    const newTotal = detalles.reduce(
      (sum, detalle) =>
        sum +
        (detalle.idDetalle === target.idDetalle
          ? newQuantity * detalle.precioUnitario
          : detalle.cantidad * detalle.precioUnitario),
      0,
    );

    await tx.pedido.update({
      where: { idPedido: order.idPedido },
      data: { total: newTotal },
    });

    // El casino quitó un producto (si se canceló completo, avisa la cancelación).
    if (origen === 'PERSONAL') {
      await createNotification(tx, {
        idUsuario: order.idUsuario,
        idPedido: order.idPedido,
        tipo: 'PRODUCTO_RETIRADO',
        clave: `adjusted:${ajuste.idAjuste}`,
        titulo: 'Producto quitado de tu pedido',
        mensaje: `El casino quitó ${removed}x ${target.nombreProducto} de tu pedido ${code}. Motivo: ${reason}. Nuevo total: ${formatPrice(newTotal)}.`,
      });
    }

    return loadOrder(tx, code);
  });
}

export type RetireInput = {
  medioPago?: 'EFECTIVO' | 'DEBITO' | 'CREDITO' | 'OTRO';
};

/** Entrega el pedido: registra el pago presencial, descuenta el stock y cierra el pedido. */
export async function retireOrder(
  actor: Actor,
  code: string,
  input: RetireInput = {},
): Promise<Order> {
  assertStaff(actor);

  return prisma.$transaction(
    async (tx) => {
      const estados = await getEstadoIds(tx);
      const order = await lockOrder(tx, code);

      if (order.estado !== 'LISTO') {
        throw new ServiceError(409, 'INVALID_TRANSITION', 'Solo se puede retirar un pedido que está listo.');
      }

      const detalles = await tx.pedidoDetalle.findMany({
        where: { idPedido: order.idPedido },
        select: { idProducto: true, cantidad: true },
        orderBy: { idProducto: 'asc' },
      });

      // El stock nunca queda negativo (también lo exige un CHECK en la BD).
      for (const detalle of detalles) {
        await tx.$executeRaw`
          UPDATE productos
          SET stock = GREATEST(stock - ${detalle.cantidad}, 0),
              fecha_actualizacion = now()
          WHERE id_producto = ${detalle.idProducto}
        `;
      }

      // El índice único sobre id_pedido impide registrar dos pagos del mismo pedido.
      await tx.pago.create({
        data: {
          idPedido: order.idPedido,
          monto: order.total,
          medioPago: input.medioPago ?? 'EFECTIVO',
          registradoPor: actor.userId,
        },
      });

      await tx.pedido.update({
        where: { idPedido: order.idPedido },
        data: { idEstado: estados.RETIRADO, fechaRetiro: new Date() },
      });

      await tx.historialEstadoPedido.create({
        data: {
          idPedido: order.idPedido,
          idEstado: estados.RETIRADO,
          cambiadoPor: actor.userId,
        },
      });

      return loadOrder(tx, code);
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
