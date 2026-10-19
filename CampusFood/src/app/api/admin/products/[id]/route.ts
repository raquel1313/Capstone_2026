import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const THEMES = [
  'amber',
  'yellow',
  'rose',
  'sky',
  'lime',
] as const;

type Theme = (typeof THEMES)[number];

const TONE_MAP: Record<Theme, string> = {
  amber: 'from-amber-100 to-orange-200',
  yellow: 'from-yellow-100 to-amber-200',
  rose: 'from-rose-100 to-red-200',
  sky: 'from-sky-100 to-cyan-200',
  lime: 'from-lime-100 to-green-200',
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateProductBody = {
  sku?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  precio?: unknown;
  stock?: unknown;
  idCategoria?: unknown;
  activo?: unknown;
  imagenUrl?: unknown;
  temaVisual?: unknown;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

function isTheme(
  value: unknown,
): value is Theme {
  return (
    typeof value === 'string' &&
    THEMES.includes(value as Theme)
  );
}

function normalizeSku(
  value: string,
): string {
  return value.trim().toUpperCase();
}

function normalizeName(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, ' ');
}

function isValidSku(
  value: string,
): boolean {
  return /^[A-Z0-9][A-Z0-9._-]{0,49}$/.test(
    value,
  );
}

function isPositiveInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  );
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

function parseImageUrl(
  value: unknown,
):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  if (
    value === null ||
    value === ''
  ) {
    return {
      ok: true,
      value: null,
    };
  }

  if (typeof value !== 'string') {
    return {
      ok: false,
      error:
        'La imagen debe ser una ruta o URL válida.',
    };
  }

  const normalized = value.trim();

  if (normalized.length > 2048) {
    return {
      ok: false,
      error:
        'La ruta de imagen es demasiado larga.',
    };
  }

  if (
    normalized.startsWith('/') &&
    !normalized.startsWith('//')
  ) {
    return {
      ok: true,
      value: normalized,
    };
  }

  try {
    const url = new URL(normalized);

    if (url.protocol !== 'https:') {
      return {
        ok: false,
        error:
          'Las imágenes externas deben utilizar HTTPS.',
      };
    }

    return {
      ok: true,
      value: normalized,
    };
  } catch {
    return {
      ok: false,
      error:
        'La imagen debe ser una ruta local o URL HTTPS válida.',
    };
  }
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
          'El ID del producto es inválido.',
      },
      {
        status: 400,
      },
    );
  }

  let body: UpdateProductBody;

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
    sku?: string;
    nombre?: string;
    descripcion?: string | null;
    precio?: number;
    stock?: number;
    idCategoria?: number;
    activo?: boolean;
    imagenUrl?: string | null;
    temaVisual?: string;
  } = {};

  if (body.sku !== undefined) {
    if (
      typeof body.sku !== 'string'
    ) {
      return Response.json(
        {
          error:
            'El SKU debe ser texto.',
        },
        {
          status: 400,
        },
      );
    }

    const sku =
      normalizeSku(body.sku);

    if (!isValidSku(sku)) {
      return Response.json(
        {
          error:
            'El SKU debe contener entre 1 y 50 caracteres y solo puede usar letras, números, punto, guion o guion bajo.',
        },
        {
          status: 400,
        },
      );
    }

    data.sku = sku;
  }

  if (
    body.nombre !== undefined
  ) {
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
      nombre.length > 150
    ) {
      return Response.json(
        {
          error:
            'El nombre debe contener entre 1 y 150 caracteres.',
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
    if (
      body.descripcion === null
    ) {
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
        descripcion.length > 500
      ) {
        return Response.json(
          {
            error:
              'La descripción no puede superar 500 caracteres.',
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

  if (
    body.precio !== undefined
  ) {
    if (
      !isPositiveInteger(
        body.precio,
      )
    ) {
      return Response.json(
        {
          error:
            'El precio debe ser un entero mayor que 0.',
        },
        {
          status: 400,
        },
      );
    }

    data.precio = body.precio;
  }

  if (body.stock !== undefined) {
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

    data.stock = body.stock;
  }

  if (
    body.idCategoria !== undefined
  ) {
    if (
      !isPositiveInteger(
        body.idCategoria,
      )
    ) {
      return Response.json(
        {
          error:
            'La categoría es inválida.',
        },
        {
          status: 400,
        },
      );
    }

    data.idCategoria =
      body.idCategoria;
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
    body.temaVisual !== undefined
  ) {
    if (
      !isTheme(
        body.temaVisual,
      )
    ) {
      return Response.json(
        {
          error:
            'El tema visual es inválido.',
        },
        {
          status: 400,
        },
      );
    }

    data.temaVisual =
      body.temaVisual;
  }

  if (
    body.imagenUrl !== undefined
  ) {
    const parsedImage =
      parseImageUrl(
        body.imagenUrl,
      );

    if (!parsedImage.ok) {
      return Response.json(
        {
          error:
            parsedImage.error,
        },
        {
          status: 400,
        },
      );
    }

    data.imagenUrl =
      parsedImage.value;
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
      await prisma.producto.findUnique({
        where: {
          idProducto: id,
        },
        select: {
          idProducto: true,
        },
      });

    if (!current) {
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

    if (
      data.idCategoria !==
      undefined
    ) {
      const category =
        await prisma.categoriaProducto.findUnique(
          {
            where: {
              idCategoria:
                data.idCategoria,
            },
            select: {
              idCategoria: true,
            },
          },
        );

      if (!category) {
        return Response.json(
          {
            error:
              'La categoría seleccionada no existe.',
          },
          {
            status: 400,
          },
        );
      }
    }

    if (data.sku !== undefined) {
      const duplicate =
        await prisma.producto.findFirst({
          where: {
            sku: {
              equals: data.sku,
              mode: 'insensitive',
            },
            NOT: {
              idProducto: id,
            },
          },
          select: {
            idProducto: true,
          },
        });

      if (duplicate) {
        return Response.json(
          {
            error:
              'Ya existe un producto con ese SKU.',
          },
          {
            status: 409,
          },
        );
      }
    }

    const product =
      await prisma.producto.update({
        where: {
          idProducto: id,
        },
        data,
        select: {
          idProducto: true,
          sku: true,
          nombre: true,
          descripcion: true,
          precio: true,
          stock: true,
          activo: true,
          imagenUrl: true,
          temaVisual: true,
          fechaCreacion: true,
          fechaActualizacion: true,
          categoria: {
            select: {
              idCategoria: true,
              nombre: true,
              activo: true,
            },
          },
        },
      });

    const theme = isTheme(
      product.temaVisual,
    )
      ? product.temaVisual
      : 'amber';

    return Response.json({
      product: {
        id: product.idProducto,
        sku: product.sku,
        name: product.nombre,
        description:
          product.descripcion ?? '',
        price: product.precio,
        stock: product.stock,
        active: product.activo,

        categoryId:
          product.categoria
            .idCategoria,

        category:
          product.categoria.nombre,

        categoryActive:
          product.categoria.activo,

        image:
          product.imagenUrl ??
          undefined,

        theme,
        tone: TONE_MAP[theme],

        soldOut:
          product.stock <= 0,

        createdAt:
          product.fechaCreacion,

        updatedAt:
          product.fechaActualizacion,
      },
    });
  } catch (error) {
    if (
      isPrismaError(
        error,
        'P2002',
      )
    ) {
      return Response.json(
        {
          error:
            'Ya existe un producto con ese SKU.',
        },
        {
          status: 409,
        },
      );
    }

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
      'Error actualizando producto:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible actualizar el producto.',
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
          'El ID del producto es inválido.',
      },
      {
        status: 400,
      },
    );
  }

  try {
    const product =
      await prisma.producto.findUnique({
        where: {
          idProducto: id,
        },
        select: {
          idProducto: true,
        },
      });

    if (!product) {
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

    await prisma.producto.delete({
      where: {
        idProducto: id,
      },
    });

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    /*
     * Esto será especialmente importante
     * cuando PedidoDetalle tenga una FK
     * hacia Producto.
     */
    if (
      isPrismaError(
        error,
        'P2003',
      )
    ) {
      return Response.json(
        {
          error:
            'No se puede eliminar este producto porque está asociado a otros registros. Desactívalo en su lugar.',
        },
        {
          status: 409,
        },
      );
    }

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
      'Error eliminando producto:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible eliminar el producto.',
      },
      {
        status: 500,
      },
    );
  }
}