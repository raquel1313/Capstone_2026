import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type CreateCategoryBody = {
  nombre?: unknown;
  descripcion?: unknown;
  activo?: unknown;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

function normalizeName(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, ' ');
}

export async function GET() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const categories =
      await prisma.categoriaProducto.findMany({
        select: {
          idCategoria: true,
          nombre: true,
          descripcion: true,
          activo: true,
          _count: {
            select: {
              productos: true,
            },
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      });

    return Response.json({
      categories: categories.map(
        (category) => ({
          id: category.idCategoria,
          name: category.nombre,
          description:
            category.descripcion ?? '',
          active: category.activo,
          productCount:
            category._count.productos,
        }),
      ),
    });
  } catch (error) {
    console.error(
      'Error obteniendo categorías administrativas:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible obtener las categorías.',
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  let body: CreateCategoryBody;

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
    typeof body.nombre !== 'string'
  ) {
    return Response.json(
      {
        error:
          'El nombre de la categoría es obligatorio.',
      },
      {
        status: 400,
      },
    );
  }

  const nombre =
    normalizeName(body.nombre);

  if (
    nombre.length === 0 ||
    nombre.length > 100
  ) {
    return Response.json(
      {
        error:
          'El nombre debe contener entre 1 y 100 caracteres.',
      },
      {
        status: 400,
      },
    );
  }

  let descripcion: string | null =
    null;

  if (
    body.descripcion !== undefined &&
    body.descripcion !== null
  ) {
    if (
      typeof body.descripcion !==
      'string'
    ) {
      return Response.json(
        {
          error:
            'La descripción debe ser texto.',
        },
        {
          status: 400,
        },
      );
    }

    const normalizedDescription =
      body.descripcion.trim();

    if (
      normalizedDescription.length >
      255
    ) {
      return Response.json(
        {
          error:
            'La descripción no puede superar 255 caracteres.',
        },
        {
          status: 400,
        },
      );
    }

    descripcion =
      normalizedDescription || null;
  }

  if (
    body.activo !== undefined &&
    typeof body.activo !== 'boolean'
  ) {
    return Response.json(
      {
        error:
          'El estado activo debe ser booleano.',
      },
      {
        status: 400,
      },
    );
  }

  try {
    const existing =
      await prisma.categoriaProducto.findFirst(
        {
          where: {
            nombre: {
              equals: nombre,
              mode: 'insensitive',
            },
          },
          select: {
            idCategoria: true,
          },
        },
      );

    if (existing) {
      return Response.json(
        {
          error:
            'Ya existe una categoría con ese nombre.',
        },
        {
          status: 409,
        },
      );
    }

    const category =
      await prisma.categoriaProducto.create(
        {
          data: {
            nombre,
            descripcion,
            activo:
              body.activo ?? true,
          },
        },
      );

    return Response.json(
      {
        category: {
          id:
            category.idCategoria,
          name:
            category.nombre,
          description:
            category.descripcion ??
            '',
          active:
            category.activo,
          productCount: 0,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      'Error creando categoría:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible crear la categoría.',
      },
      {
        status: 500,
      },
    );
  }
}