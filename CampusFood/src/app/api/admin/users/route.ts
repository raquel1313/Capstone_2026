import type { User as SupabaseUser } from '@supabase/supabase-js';

import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type Role = 'student' | 'worker' | 'admin';
type Status = 'Activo' | 'Inactivo';

type CreateUserBody = {
  nombre?: unknown;
  apellido?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  status?: unknown;
};

function isRole(value: unknown): value is Role {
  return value === 'student' || value === 'worker' || value === 'admin';
}

function isStatus(value: unknown): value is Status {
  return value === 'Activo' || value === 'Inactivo';
}

function normalizeString(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function isInstitutionalEmail(email: string): boolean {
  return /^[^\s@]+@duocuc\.cl$/i.test(email);
}

export async function GET() {
  const authorization = await requireAdmin();

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: {
        fechaCreacion: 'desc',
      },
      select: {
        idUsuario: true,
        nombre: true,
        apellido: true,
        activo: true,
        fechaCreacion: true,
        roles: {
          select: {
            rol: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });

    const authUsers: SupabaseUser[] = [];

    const perPage = 100;
    let page = 1;

    while (true) {
      const { data, error } =
        await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

      if (error) {
        console.error(
          'Supabase listUsers failed:',
          error,
        );

        return Response.json(
          {
            error:
              'No fue posible obtener los usuarios de autenticación.',
          },
          { status: 500 },
        );
      }

      authUsers.push(...data.users);

      if (data.users.length < perPage) {
        break;
      }

      page += 1;
    }

    const authById = new Map(
      authUsers.map((authUser) => [
        authUser.id,
        authUser,
      ]),
    );

    const users = usuarios.map((usuario) => {
      const roles = usuario.roles.map(
        ({ rol }) => rol.nombre,
      );

      let role: Role | null = null;

      if (roles.includes('admin')) {
        role = 'admin';
      } else if (roles.includes('student')) {
        role = 'student';
      } else if (roles.includes('worker')) {
        role = 'worker';
      }

      const authUser = authById.get(
        usuario.idUsuario,
      );

      return {
        id: usuario.idUsuario,
        username: authUser?.email ?? '',
        name:
          `${usuario.nombre} ${usuario.apellido}`.trim(),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        role,
        roles,
        status: usuario.activo
          ? ('Activo' as const)
          : ('Inactivo' as const),
        fechaCreacion:
          usuario.fechaCreacion.toISOString(),
      };
    });

    return Response.json({
      users,
    });
  } catch (error) {
    console.error(
      'GET /api/admin/users failed:',
      error,
    );

    return Response.json(
      {
        error:
          'Error interno al obtener los usuarios.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();

  if (!authorization.ok) {
    return authorization.response;
  }

  let body: CreateUserBody;

  try {
    body =
      (await request.json()) as CreateUserBody;
  } catch {
    return Response.json(
      {
        error:
          'El cuerpo de la solicitud no es válido.',
      },
      { status: 400 },
    );
  }

  const nombre = normalizeString(
    body.nombre,
  );

  const apellido = normalizeString(
    body.apellido,
  );

  const email = normalizeString(
    body.email,
  ).toLowerCase();

  const password =
    typeof body.password === 'string'
      ? body.password
      : '';

  if (
    nombre.length === 0 ||
    nombre.length > 100
  ) {
    return Response.json(
      {
        error: 'El nombre no es válido.',
      },
      { status: 400 },
    );
  }

  if (
    apellido.length === 0 ||
    apellido.length > 100
  ) {
    return Response.json(
      {
        error: 'El apellido no es válido.',
      },
      { status: 400 },
    );
  }

  if (
    email.length === 0 ||
    email.length > 254 ||
    !isInstitutionalEmail(email)
  ) {
    return Response.json(
      {
        error:
          'El correo debe ser institucional (@duocuc.cl).',
      },
      { status: 400 },
    );
  }

  if (
    password.length < 15 ||
    password.length > 128
  ) {
    return Response.json(
      {
        error:
          'La contraseña debe tener entre 15 y 128 caracteres.',
      },
      { status: 400 },
    );
  }

  if (!isRole(body.role)) {
    return Response.json(
      {
        error: 'El rol no es válido.',
      },
      { status: 400 },
    );
  }

  if (!isStatus(body.status)) {
    return Response.json(
      {
        error: 'El estado no es válido.',
      },
      { status: 400 },
    );
  }

  /*
   * A partir de aquí TypeScript conoce los
   * tipos concretos y no dependemos nuevamente
   * de propiedades `unknown` de body.
   */
  const role: Role = body.role;
  const status: Status = body.status;

  const {
    data,
    error: authError,
  } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
      },
    });

  if (authError) {
    console.error(
      'Supabase createUser failed:',
      authError,
    );

    if (
      authError.code === 'email_exists' ||
      authError.code ===
        'user_already_exists'
    ) {
      return Response.json(
        {
          error:
            'Ya existe un usuario con ese correo.',
        },
        { status: 409 },
      );
    }

    return Response.json(
      {
        error:
          'No fue posible crear el usuario.',
      },
      { status: 400 },
    );
  }

  const userId = data.user.id;

  try {
    await prisma.$transaction(
      async (transaction) => {
        const rol =
          await transaction.rol.findUnique({
            where: {
              nombre: role,
            },
            select: {
              idRol: true,
            },
          });

        if (!rol) {
          throw new Error(
            `El rol "${role}" no existe.`,
          );
        }

        /*
         * El trigger de auth.users ya creó
         * public.usuarios y asignó student.
         *
         * Aquí dejamos el estado y rol final
         * solicitado por el administrador.
         */
        await transaction.usuario.update({
          where: {
            idUsuario: userId,
          },
          data: {
            activo: status === 'Activo',
          },
        });

        await transaction.usuarioRol.deleteMany({
          where: {
            idUsuario: userId,
          },
        });

        await transaction.usuarioRol.create({
          data: {
            idUsuario: userId,
            idRol: rol.idRol,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      'Database user creation failed:',
      error,
    );

    /*
     * Supabase Auth y Prisma no comparten
     * una misma transacción ACID.
     *
     * Si PostgreSQL falla después de haber
     * creado auth.users, eliminamos el usuario
     * de Auth como operación compensatoria.
     */
    const { error: rollbackError } =
      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

    if (rollbackError) {
      console.error(
        'Supabase Auth rollback failed:',
        rollbackError,
      );
    }

    return Response.json(
      {
        error:
          'No fue posible completar la creación del usuario.',
      },
      { status: 500 },
    );
  }

  return Response.json(
    {
      user: {
        id: userId,
        username:
          data.user.email ?? email,
        name: `${nombre} ${apellido}`,
        nombre,
        apellido,
        role,
        roles: [role],
        status,
      },
    },
    { status: 201 },
  );
}