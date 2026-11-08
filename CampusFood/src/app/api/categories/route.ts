import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const categories =
      await prisma.categoriaProducto.findMany(
        {
          where: {
            activo: true,
          },
          select: {
            idCategoria: true,
            nombre: true,
            descripcion: true,
            activo: true,
          },
          orderBy: {
            nombre: 'asc',
          },
        },
      );

    return Response.json({
      categories:
        categories.map(
          (category) => ({
            id:
              category.idCategoria,
            name:
              category.nombre,
            description:
              category.descripcion ??
              '',
            active:
              category.activo,
          }),
        ),
    });
  } catch (error) {
    console.error(
      'Error obteniendo categorías:',
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