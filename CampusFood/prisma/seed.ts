import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

const connectionString =
  process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error(
    'DIRECT_URL no está definida.',
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

/*
 * Permisos disponibles en CampusFood.
 *
 * Los permisos operativos se mantienen
 * separados de los administrativos para
 * aplicar mínimo privilegio.
 */
const permissions = [
  {
    nombre: 'MANAGE_USERS',
    descripcion:
      'Crear, editar, activar y desactivar usuarios.',
  },
  {
    nombre: 'MANAGE_ROLES',
    descripcion:
      'Gestionar roles y permisos del sistema.',
  },
  {
    nombre: 'MANAGE_PRODUCTS',
    descripcion:
      'Crear, editar, activar y administrar productos de cafetería.',
  },
  {
    nombre: 'MANAGE_CATEGORIES',
    descripcion:
      'Gestionar categorías de productos.',
  },
  {
    nombre: 'MANAGE_STOCK',
    descripcion:
      'Consultar y modificar el stock de productos.',
  },
  {
    nombre: 'MANAGE_MENU',
    descripcion:
      'Gestionar menú semanal, platos y disponibilidad.',
  },
  {
    nombre: 'VIEW_ORDERS',
    descripcion:
      'Consultar pedidos necesarios para la operación.',
  },
  {
    nombre: 'UPDATE_ORDER_STATUS',
    descripcion:
      'Actualizar el estado operativo de los pedidos.',
  },
  {
    nombre: 'REGISTER_PAYMENT',
    descripcion:
      'Registrar el pago presencial de pedidos.',
  },
  {
    nombre: 'MANAGE_POLLS',
    descripcion:
      'Gestionar encuestas y votaciones.',
  },
] as const;

type PermissionName =
  (typeof permissions)[number]['nombre'];

const adminPermissions:
  readonly PermissionName[] = [
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'MANAGE_PRODUCTS',
    'MANAGE_CATEGORIES',
    'MANAGE_STOCK',
    'MANAGE_MENU',
    'VIEW_ORDERS',
    'UPDATE_ORDER_STATUS',
    'REGISTER_PAYMENT',
    'MANAGE_POLLS',
  ];

const workerPermissions:
  readonly PermissionName[] = [
    'MANAGE_STOCK',
    'MANAGE_MENU',
    'VIEW_ORDERS',
    'UPDATE_ORDER_STATUS',
    'REGISTER_PAYMENT',
  ];

/*
 * Sincroniza los permisos de un rol.
 *
 * A diferencia de solo hacer upsert,
 * esta función también elimina relaciones
 * de permisos que ya no deberían pertenecer
 * al rol.
 *
 * Esto evita privilegios residuales.
 */
async function syncRolePermissions(
  roleId: number,
  permissionNames:
    readonly PermissionName[],
  permissionIds:
    ReadonlyMap<
      PermissionName,
      number
    >,
) {
  const desiredPermissionIds =
    permissionNames.map((name) => {
      const permissionId =
        permissionIds.get(name);

      if (
        permissionId === undefined
      ) {
        throw new Error(
          `El permiso "${name}" no fue encontrado durante el seed.`,
        );
      }

      return permissionId;
    });

  /*
   * Un rol sin permisos administrativos,
   * como student, debe quedar sin relaciones
   * en RolPermiso.
   */
  if (
    desiredPermissionIds.length === 0
  ) {
    await prisma.rolPermiso.deleteMany({
      where: {
        idRol: roleId,
      },
    });

    return;
  }

  await prisma.$transaction(
    async (transaction) => {
      /*
       * Elimina permisos que ya no
       * correspondan al rol.
       */
      await transaction.rolPermiso.deleteMany({
        where: {
          idRol: roleId,
          idPermiso: {
            notIn:
              desiredPermissionIds,
          },
        },
      });

      /*
       * Crea las relaciones faltantes
       * sin duplicar las existentes.
       */
      for (
        const permissionId
        of desiredPermissionIds
      ) {
        await transaction.rolPermiso.upsert({
          where: {
            idRol_idPermiso: {
              idRol: roleId,
              idPermiso:
                permissionId,
            },
          },
          update: {},
          create: {
            idRol: roleId,
            idPermiso:
              permissionId,
          },
        });
      }
    },
  );
}

async function seedRolesAndPermissions() {
  /*
   * Rol de usuario final.
   *
   * Puede ser estudiante o funcionario
   * que utiliza CampusFood como cliente.
   */
  const studentRole =
    await prisma.rol.upsert({
      where: {
        nombre: 'student',
      },
      update: {
        descripcion:
          'Usuario final de CampusFood que utiliza la plataforma como cliente.',
      },
      create: {
        nombre: 'student',
        descripcion:
          'Usuario final de CampusFood que utiliza la plataforma como cliente.',
      },
    });

  /*
   * Rol operativo.
   *
   * Puede gestionar únicamente las
   * funciones necesarias para la
   * operación diaria del casino.
   */
  const workerRole =
    await prisma.rol.upsert({
      where: {
        nombre: 'worker',
      },
      update: {
        descripcion:
          'Colaborador del casino con permisos operativos limitados.',
      },
      create: {
        nombre: 'worker',
        descripcion:
          'Colaborador del casino con permisos operativos limitados.',
      },
    });

  /*
   * Rol administrativo.
   */
  const adminRole =
    await prisma.rol.upsert({
      where: {
        nombre: 'admin',
      },
      update: {
        descripcion:
          'Administrador de CampusFood con funciones de gestión y seguridad.',
      },
      create: {
        nombre: 'admin',
        descripcion:
          'Administrador de CampusFood con funciones de gestión y seguridad.',
      },
    });

  /*
   * Creamos o actualizamos todos los
   * permisos y guardamos sus IDs.
   */
  const permissionIds =
    new Map<
      PermissionName,
      number
    >();

  for (
    const permissionData
    of permissions
  ) {
    const permission =
      await prisma.permiso.upsert({
        where: {
          nombre:
            permissionData.nombre,
        },
        update: {
          descripcion:
            permissionData.descripcion,
        },
        create: {
          nombre:
            permissionData.nombre,
          descripcion:
            permissionData.descripcion,
        },
      });

    permissionIds.set(
      permissionData.nombre,
      permission.idPermiso,
    );
  }

  /*
   * STUDENT
   *
   * No recibe permisos administrativos.
   */
  await syncRolePermissions(
    studentRole.idRol,
    [],
    permissionIds,
  );

  /*
   * WORKER
   *
   * Solo permisos necesarios para
   * operación diaria.
   */
  await syncRolePermissions(
    workerRole.idRol,
    workerPermissions,
    permissionIds,
  );

  /*
   * ADMIN
   *
   * Recibe todos los permisos definidos.
   */
  await syncRolePermissions(
    adminRole.idRol,
    adminPermissions,
    permissionIds,
  );

  /*
   * El antiguo MANAGE_ORDERS quedó
   * reemplazado por permisos operativos
   * granulares.
   *
   * Se elimina únicamente si existe y
   * ya no está relacionado con roles.
   */
  const legacyPermission =
    await prisma.permiso.findUnique({
      where: {
        nombre: 'MANAGE_ORDERS',
      },
      select: {
        idPermiso: true,
      },
    });

  if (legacyPermission) {
    await prisma.rolPermiso.deleteMany({
      where: {
        idPermiso:
          legacyPermission.idPermiso,
      },
    });

    await prisma.permiso.delete({
      where: {
        idPermiso:
          legacyPermission.idPermiso,
      },
    });
  }

  console.log(
    'Roles creados/verificados: student, worker, admin',
  );

  console.log(
    `Permisos creados/verificados: ${permissions.length}`,
  );

  console.log(
    `Permisos worker: ${workerPermissions.join(', ')}`,
  );

  console.log(
    `Permisos admin: ${adminPermissions.length}`,
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

  for (
    const product
    of products
  ) {
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
         * Volver a ejecutar el seed no
         * debe sobrescribir inventario
         * operativo real.
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