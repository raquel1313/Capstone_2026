import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateCategoryBody = {
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

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireAdmin();

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
          'El ID de la categoría es inválido.',
      },
      {
        status: 400,
      },
    );
  }

  let body: UpdateCategoryBody;

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

  const data: {
    nombre?: string;
    descripcion?: string | null;
    activo?: boolean;
  } = {};

  if (body.nombre !== undefined) {
    if (
      typeof body.nombre !== 'string'
    ) {
      return Response.json(
        {
          error:
            'El nombre debe ser texto.',
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

    data.nombre = nombre;
  }

  if (
    body.descripcion !== undefined
  ) {
    if (body.descripcion === null) {
      data.descripcion = null;
    } else {
      if (
        typeof body.descripcion !==
        'string'
      ) {
        return Response.json(
          {
            error:
              'La descripción debe ser texto o null.',
          },
          {
            status: 400,
          },
        );
      }

      const descripcion =
        body.descripcion.trim();

      if (
        descripcion.length > 255
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

      data.descripcion =
        descripcion || null;
    }
  }

  if (body.activo !== undefined) {
    if (
      typeof body.activo !==
      'boolean'
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

    data.activo = body.activo;
  }

  if (
    Object.keys(data).length === 0
  ) {
    return Response.json(
      {
        error:
          'No se proporcionaron cambios válidos.',
      },
      {
        status: 400,
      },
    );
  }

  try {
    const current =
      await prisma.categoriaProducto.findUnique(
        {
          where: {
            idCategoria: id,
          },
          select: {
            idCategoria: true,
          },
        },
      );

    if (!current) {
      return Response.json(
        {
          error:
            'La categoría no existe.',
        },
        {
          status: 404,
        },
      );
    }

    if (data.nombre !== undefined) {
      const duplicate =
        await prisma.categoriaProducto.findFirst(
          {
            where: {
              nombre: {
                equals:
                  data.nombre,
                mode:
                  'insensitive',
              },
              NOT: {
                idCategoria: id,
              },
            },
            select: {
              idCategoria: true,
            },
          },
        );

      if (duplicate) {
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
    }

    const category =
      await prisma.categoriaProducto.update(
        {
          where: {
            idCategoria: id,
          },
          data,
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
        },
      );

    return Response.json({
      category: {
        id:
          category.idCategoria,
        name:
          category.nombre,
        description:
          category.descripcion ?? '',
        active:
          category.activo,
        productCount:
          category._count.productos,
      },
    });
  } catch (error) {
    console.error(
      'Error actualizando categoría:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible actualizar la categoría.',
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const auth = await requireAdmin();

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
          'El ID de la categoría es inválido.',
      },
      {
        status: 400,
      },
    );
  }

  try {
    const category =
      await prisma.categoriaProducto.findUnique(
        {
          where: {
            idCategoria: id,
          },
          select: {
            idCategoria: true,
            _count: {
              select: {
                productos: true,
              },
            },
          },
        },
      );

    if (!category) {
      return Response.json(
        {
          error:
            'La categoría no existe.',
        },
        {
          status: 404,
        },
      );
    }

    if (
      category._count.productos > 0
    ) {
      return Response.json(
        {
          error:
            'No se puede eliminar una categoría que contiene productos. Desactívala si deseas ocultarla del catálogo.',
        },
        {
          status: 409,
        },
      );
    }

    await prisma.categoriaProducto.delete(
      {
        where: {
          idCategoria: id,
        },
      },
    );

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    console.error(
      'Error eliminando categoría:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible eliminar la categoría.',
      },
      {
        status: 500,
      },
    );
  }
}