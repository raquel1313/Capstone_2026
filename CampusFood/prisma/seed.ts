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

async function main() {
  const studentRole = await prisma.rol.upsert({
    where: {
      nombre: 'student',
    },
    update: {
      descripcion: 'Estudiante o funcionario usuario de CampusFood.',
    },
    create: {
      nombre: 'student',
      descripcion: 'Estudiante o funcionario usuario de CampusFood.',
    },
  });

  const adminRole = await prisma.rol.upsert({
    where: {
      nombre: 'admin',
    },
    update: {
      descripcion: 'Personal del casino con funciones administrativas.',
    },
    create: {
      nombre: 'admin',
      descripcion: 'Personal del casino con funciones administrativas.',
    },
  });

  for (const permissionData of permissions) {
    const permission = await prisma.permiso.upsert({
      where: {
        nombre: permissionData.nombre,
      },
      update: {
        descripcion: permissionData.descripcion,
      },
      create: permissionData,
    });

    await prisma.rolPermiso.upsert({
      where: {
        idRol_idPermiso: {
          idRol: adminRole.idRol,
          idPermiso: permission.idPermiso,
        },
      },
      update: {},
      create: {
        idRol: adminRole.idRol,
        idPermiso: permission.idPermiso,
      },
    });
  }

  console.log(
    `Roles creados/verificados: ${studentRole.nombre}, ${adminRole.nombre}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });