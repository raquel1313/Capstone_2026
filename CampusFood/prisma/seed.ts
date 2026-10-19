import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('DIRECT_URL no está definida.');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const permissions = [
  {
    nombre: 'MANAGE_USERS',
    descripcion: 'Gestionar usuarios, roles y estados.',
  },
  {
    nombre: 'MANAGE_PRODUCTS',
    descripcion: 'Gestionar productos de cafetería.',
  },
  {
    nombre: 'MANAGE_MENU',
    descripcion: 'Gestionar menú semanal y platos.',
  },
  {
    nombre: 'MANAGE_ORDERS',
    descripcion: 'Gestionar pedidos y sus estados.',
  },
  {
    nombre: 'MANAGE_POLLS',
    descripcion: 'Gestionar encuestas y votaciones.',
  },
] as const;

async function seedRolesAndPermissions() {
  const studentRole = await prisma.rol.upsert({
    where: {
      nombre: 'student',
    },
    update: {
      descripcion:
        'Estudiante o funcionario usuario de CampusFood.',
    },
    create: {
      nombre: 'student',
      descripcion:
        'Estudiante o funcionario usuario de CampusFood.',
    },
  });

  const adminRole = await prisma.rol.upsert({
    where: {
      nombre: 'admin',
    },
    update: {
      descripcion:
        'Personal del casino con funciones administrativas.',
    },
    create: {
      nombre: 'admin',
      descripcion:
        'Personal del casino con funciones administrativas.',
    },
  });

  for (const permissionData of permissions) {
    const permission =
      await prisma.permiso.upsert({
        where: {
          nombre: permissionData.nombre,
        },
        update: {
          descripcion:
            permissionData.descripcion,
        },
        create: permissionData,
      });

    await prisma.rolPermiso.upsert({
      where: {
        idRol_idPermiso: {
          idRol: adminRole.idRol,
          idPermiso:
            permission.idPermiso,
        },
      },
      update: {},
      create: {
        idRol: adminRole.idRol,
        idPermiso:
          permission.idPermiso,
      },
    });
  }

  console.log(
    `Roles creados/verificados: ${studentRole.nombre}, ${adminRole.nombre}`,
  );
}

async function seedProductCatalog() {
  const dulce =
    await prisma.categoriaProducto.upsert({
      where: {
        nombre: 'Dulce',
      },
      update: {
        activo: true,
      },
      create: {
        nombre: 'Dulce',
        activo: true,
      },
    });

  const bebidas =
    await prisma.categoriaProducto.upsert({
      where: {
        nombre: 'Bebidas',
      },
      update: {
        activo: true,
      },
      create: {
        nombre: 'Bebidas',
        activo: true,
      },
    });

  const snacks =
    await prisma.categoriaProducto.upsert({
      where: {
        nombre: 'Snacks',
      },
      update: {
        activo: true,
      },
      create: {
        nombre: 'Snacks',
        activo: true,
      },
    });

  /*
   * HomeView ya utiliza esta categoría,
   * aunque todavía no existe un producto
   * Gohan en el catálogo inicial.
   */
  await prisma.categoriaProducto.upsert({
    where: {
      nombre: 'Gohan',
    },
    update: {
      activo: true,
    },
    create: {
      nombre: 'Gohan',
      activo: true,
    },
  });

  const products = [
    {
      sku: 'DUL-QUE-001',
      idCategoria:
        dulce.idCategoria,
      nombre:
        'Queque de zanahoria',
      descripcion:
        'Suave, casero y con nueces',
      precio: 2990,
      stock: 10,
      activo: true,
      imagenUrl:
        '/images/products/foto1.jpg',
      temaVisual: 'amber',
    },
    {
      sku: 'DUL-GAL-001',
      idCategoria:
        dulce.idCategoria,
      nombre:
        'Galleta con chips',
      descripcion:
        'Recién horneada, 80 g',
      precio: 1990,
      stock: 10,
      activo: true,
      imagenUrl:
        '/images/products/foto2.jpg',
      temaVisual: 'yellow',
    },
    {
      sku: 'BEB-CCZ-350',
      idCategoria:
        bebidas.idCategoria,
      nombre:
        'Coca-Cola Zero',
      descripcion:
        'Lata 350 ml',
      precio: 2490,
      stock: 10,
      activo: true,
      imagenUrl:
        '/images/products/foto3.jpg',
      temaVisual: 'rose',
    },
    {
      sku: 'BEB-AGU-500',
      idCategoria:
        bebidas.idCategoria,
      nombre:
        'Agua mineral',
      descripcion:
        'Botella 500 ml',
      precio: 1290,
      stock: 10,
      activo: true,
      imagenUrl:
        '/images/products/foto4.jpg',
      temaVisual: 'sky',
    },
    {
      sku: 'SNK-BAR-001',
      idCategoria:
        snacks.idCategoria,
      nombre:
        'Barra de cereal',
      descripcion:
        'Avena, miel y frutos secos',
      precio: 1690,
      stock: 10,
      activo: true,
      imagenUrl:
        '/images/products/foto5.jpg',
      temaVisual: 'lime',
    },
  ] as const;

  for (const product of products) {
    await prisma.producto.upsert({
      where: {
        sku: product.sku,
      },
      update: {
        idCategoria:
          product.idCategoria,
        nombre:
          product.nombre,
        descripcion:
          product.descripcion,
        precio:
          product.precio,

        /*
         * No actualizamos stock aquí.
         *
         * Es deliberado: volver a ejecutar
         * el seed no debe resetear el
         * inventario existente.
         */
        activo:
          product.activo,
        imagenUrl:
          product.imagenUrl,
        temaVisual:
          product.temaVisual,
      },
      create: {
        sku:
          product.sku,
        idCategoria:
          product.idCategoria,
        nombre:
          product.nombre,
        descripcion:
          product.descripcion,
        precio:
          product.precio,
        stock:
          product.stock,
        activo:
          product.activo,
        imagenUrl:
          product.imagenUrl,
        temaVisual:
          product.temaVisual,
      },
    });
  }

  console.log(
    'Categorías creadas/verificadas: Dulce, Bebidas, Snacks, Gohan',
  );

  console.log(
    `Productos creados/verificados: ${products.length}`,
  );
}

async function main() {
  await seedRolesAndPermissions();
  await seedProductCatalog();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });