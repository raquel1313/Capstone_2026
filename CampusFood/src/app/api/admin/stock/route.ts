import { requirePermission } from '@/lib/auth/require-permission';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const auth =
    await requirePermission(
      'MANAGE_STOCK',
    );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const products =
      await prisma.producto.findMany({
        select: {
          idProducto: true,
          sku: true,
          nombre: true,
          stock: true,
          activo: true,
          fechaActualizacion: true,
          categoria: {
            select: {
              idCategoria: true,
              nombre: true,
            },
          },
        },
        orderBy: [
          {
            categoria: {
              nombre: 'asc',
            },
          },
          {
            nombre: 'asc',
          },
        ],
      });

    return Response.json({
      products: products.map(
        (product) => ({
          id: product.idProducto,
          sku: product.sku,
          name: product.nombre,
          stock: product.stock,
          active: product.activo,

          categoryId:
            product.categoria
              .idCategoria,

          category:
            product.categoria
              .nombre,

          soldOut:
            product.stock <= 0,

          updatedAt:
            product.fechaActualizacion,
        }),
      ),
    });
  } catch (error) {
    console.error(
      'Error obteniendo inventario:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible obtener el inventario.',
      },
      {
        status: 500,
      },
    );
  }
}