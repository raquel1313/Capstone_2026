import { requirePermission } from '@/lib/auth/require-permission';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateStockBody = {
  stock?: unknown;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

function parseId(
  value: string,
): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function isNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function isPrismaError(
  error: unknown,
  code: string,
): boolean {
  return (
    isRecord(error) &&
    error.code === code
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const auth =
    await requirePermission(
      'MANAGE_STOCK',
    );

  if (!auth.ok) {
    return auth.response;
  }

  const { id: rawId } =
    await context.params;

  const id = parseId(rawId);

  if (id === null) {
    return Response.json(
      {
        error:
          'El ID del producto es inválido.',
      },
      {
        status: 400,
      },
    );
  }

  let body: UpdateStockBody;

  try {
    const parsed: unknown =
      await request.json();

    if (!isRecord(parsed)) {
      return Response.json(
        {
          error:
            'El cuerpo de la solicitud es inválido.',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Este endpoint debe aceptar
     * exclusivamente el campo stock.
     *
     * Evita que alguien con MANAGE_STOCK
     * intente modificar precio, nombre,
     * categoría u otros atributos.
     */
    const keys =
      Object.keys(parsed);

    if (
      keys.length !== 1 ||
      keys[0] !== 'stock'
    ) {
      return Response.json(
        {
          error:
            'Esta operación solo permite modificar el stock.',
        },
        {
          status: 400,
        },
      );
    }

    body = parsed;
  } catch {
    return Response.json(
      {
        error:
          'El cuerpo de la solicitud no contiene JSON válido.',
      },
      {
        status: 400,
      },
    );
  }

  if (
    !isNonNegativeInteger(
      body.stock,
    )
  ) {
    return Response.json(
      {
        error:
          'El stock debe ser un entero mayor o igual a 0.',
      },
      {
        status: 400,
      },
    );
  }

  try {
    const product =
      await prisma.producto.update({
        where: {
          idProducto: id,
        },
        data: {
          stock: body.stock,
        },
        select: {
          idProducto: true,
          sku: true,
          nombre: true,
          stock: true,
          activo: true,
          fechaActualizacion: true,
        },
      });

    return Response.json({
      product: {
        id:
          product.idProducto,
        sku:
          product.sku,
        name:
          product.nombre,
        stock:
          product.stock,
        active:
          product.activo,
        soldOut:
          product.stock <= 0,
        updatedAt:
          product.fechaActualizacion,
      },
    });
  } catch (error) {
    if (
      isPrismaError(
        error,
        'P2025',
      )
    ) {
      return Response.json(
        {
          error:
            'El producto no existe.',
        },
        {
          status: 404,
        },
      );
    }

    console.error(
      'Error actualizando stock:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible actualizar el stock.',
      },
      {
        status: 500,
      },
    );
  }
}