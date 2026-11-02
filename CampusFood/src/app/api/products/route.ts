import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const THEMES = [
  'amber',
  'yellow',
  'rose',
  'sky',
  'lime',
] as const;

type ProductTheme =
  (typeof THEMES)[number];

const TONE_MAP: Record<
  ProductTheme,
  string
> = {
  amber:
    'from-amber-100 to-orange-200',
  yellow:
    'from-yellow-100 to-amber-200',
  rose:
    'from-rose-100 to-red-200',
  sky:
    'from-sky-100 to-cyan-200',
  lime:
    'from-lime-100 to-green-200',
};

function isProductTheme(
  value: string,
): value is ProductTheme {
  return THEMES.includes(
    value as ProductTheme,
  );
}

export async function GET() {
  try {
    const products =
      await prisma.producto.findMany({
        where: {
          activo: true,
          categoria: {
            activo: true,
          },
        },
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
          categoria: {
            select: {
              idCategoria: true,
              nombre: true,
            },
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      });

    return Response.json({
      products: products.map(
        (product) => {
          const theme:
            ProductTheme =
            isProductTheme(
              product.temaVisual,
            )
              ? product.temaVisual
              : 'amber';

          return {
            id:
              product.idProducto,

            sku:
              product.sku,

            name:
              product.nombre,

            description:
              product.descripcion ??
              '',

            price:
              product.precio,

            stock:
              product.stock,

            active:
              product.activo,

            categoryId:
              product.categoria
                .idCategoria,

            category:
              product.categoria
                .nombre,

            image:
              product.imagenUrl ??
              undefined,

            theme,

            tone:
              TONE_MAP[theme],

            /*
             * Compatibilidad temporal.
             * El frontend nuevo usará
             * stock <= 0 directamente.
             */
            soldOut:
              product.stock <= 0,
          };
        },
      ),
    });
  } catch (error) {
    console.error(
      'Error obteniendo productos:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible obtener los productos.',
      },
      {
        status: 500,
      },
    );
  }
}