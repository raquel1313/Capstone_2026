import { Prisma } from '../../../generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ServiceError } from '@/lib/services/errors';

export type CartLine = { productId: number; quantity: number };

const MAX_ITEMS = 30;
const MAX_QUANTITY = 20;

export async function getCart(userId: string): Promise<CartLine[]> {
  const cart = await prisma.carrito.findFirst({
    where: { idUsuario: userId, estado: 'ACTIVO' },
    select: {
      detalles: {
        select: { idProducto: true, cantidad: true },
        orderBy: { idProducto: 'asc' },
      },
    },
  });

  return (cart?.detalles ?? []).map((detalle) => ({
    productId: detalle.idProducto,
    quantity: detalle.cantidad,
  }));
}

/**
 * Reemplaza el contenido del carrito activo del usuario.
 * Se ignoran productos inexistentes o inactivos; el stock se valida al crear el pedido.
 */
export async function replaceCart(
  userId: string,
  lines: CartLine[],
): Promise<CartLine[]> {
  if (lines.length > MAX_ITEMS) {
    throw new ServiceError(400, 'TOO_MANY_ITEMS', 'El carrito tiene demasiados productos.');
  }

  const merged = new Map<number, number>();

  for (const line of lines) {
    if (
      !Number.isInteger(line.productId) ||
      line.productId <= 0 ||
      !Number.isInteger(line.quantity) ||
      line.quantity <= 0
    ) {
      throw new ServiceError(400, 'INVALID_ITEM', 'Hay un producto o cantidad inválidos.');
    }

    merged.set(
      line.productId,
      Math.min(MAX_QUANTITY, (merged.get(line.productId) ?? 0) + line.quantity),
    );
  }

  const valid = await prisma.producto.findMany({
    where: {
      idProducto: { in: [...merged.keys()] },
      activo: true,
      categoria: { activo: true },
    },
    select: { idProducto: true },
  });

  const validIds = new Set(valid.map((product) => product.idProducto));
  const detalles = [...merged.entries()]
    .filter(([productId]) => validIds.has(productId))
    .map(([idProducto, cantidad]) => ({ idProducto, cantidad }));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        let cart = await tx.carrito.findFirst({
          where: { idUsuario: userId, estado: 'ACTIVO' },
          select: { idCarrito: true },
        });

        if (!cart) {
          cart = await tx.carrito.create({
            data: { idUsuario: userId },
            select: { idCarrito: true },
          });
        }

        await tx.carritoDetalle.deleteMany({ where: { idCarrito: cart.idCarrito } });

        if (detalles.length > 0) {
          await tx.carritoDetalle.createMany({
            data: detalles.map((detalle) => ({ idCarrito: cart.idCarrito, ...detalle })),
          });
        }

        await tx.carrito.update({
          where: { idCarrito: cart.idCarrito },
          data: { fechaActualizacion: new Date() },
        });
      });

      break;
    } catch (error) {
      // Dos pestañas crearon el carrito a la vez (índice único parcial): se reintenta.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        attempt === 0
      ) {
        continue;
      }

      throw error;
    }
  }

  return detalles.map((detalle) => ({
    productId: detalle.idProducto,
    quantity: detalle.cantidad,
  }));
}
