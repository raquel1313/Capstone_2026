import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type Role =
  | 'student'
  | 'worker'
  | 'admin';
type Status = 'Activo' | 'Inactivo';

type UpdateUserBody = {
  nombre?: unknown;
  apellido?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  status?: unknown;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isRole(
  value: unknown,
): value is Role {
  return (
    value === 'student' ||
    value === 'worker' ||
    value === 'admin'
  );
}

function isStatus(value: unknown): value is Status {
  return value === 'Activo' || value === 'Inactivo';
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isInstitutionalEmail(email: string): boolean {
  return /^[^\s@]+@duocuc\.cl$/i.test(email);
}

function getRole(
  roles: Array<{
    rol: {
      nombre: string;
    };
  }>,
): Role | null {
  if (
    roles.some(
      ({ rol }) =>
        rol.nombre === 'admin',
    )
  ) {
    return 'admin';
  }

  if (
    roles.some(
      ({ rol }) =>
        rol.nombre === 'worker',
    )
  ) {
    return 'worker';
  }

  if (
    roles.some(
      ({ rol }) =>
        rol.nombre === 'student',
    )
  ) {
    return 'student';
  }

  return null;
}

async function getTargetUser(id: string) {
  return prisma.usuario.findUnique({
    where: {
      idUsuario: id,
    },
    select: {
      idUsuario: true,
      nombre: true,
      apellido: true,
      activo: true,
      roles: {
        select: {
          idRol: true,
          rol: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  });
}

async function countActiveAdmins(): Promise<number> {
  return prisma.usuario.count({
    where: {
      activo: true,
      roles: {
        some: {
          rol: {
            nombre: 'admin',
          },
        },
      },
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const authorization = await requireAdmin();

  if (!authorization.ok) {
    return authorization.response;
  }

  const { id } = await params;

  if (!isUuid(id)) {
    return Response.json(
      {
        error: 'El identificador del usuario no es válido.',
      },
      { status: 400 },
    );
  }

  let body: UpdateUserBody;

  try {
    body =
      (await request.json()) as UpdateUserBody;
  } catch {
    return Response.json(
      {
        error:
          'El cuerpo de la solicitud no es válido.',
      },
      { status: 400 },
    );
  }

  const hasNombre = body.nombre !== undefined;
  const hasApellido = body.apellido !== undefined;
  const hasEmail = body.email !== undefined;
  const hasPassword = body.password !== undefined;
  const hasRole = body.role !== undefined;
  const hasStatus = body.status !== undefined;

  let nombre: string | undefined;
  let apellido: string | undefined;
  let email: string | undefined;
  let password: string | undefined;
  let role: Role | undefined;
  let status: Status | undefined;

  if (hasNombre) {
    if (typeof body.nombre !== 'string') {
      return Response.json(
        { error: 'El nombre no es válido.' },
        { status: 400 },
      );
    }

    nombre = body.nombre.trim();

    if (
      nombre.length === 0 ||
      nombre.length > 100
    ) {
      return Response.json(
        { error: 'El nombre no es válido.' },
        { status: 400 },
      );
    }
  }

  if (hasApellido) {
    if (typeof body.apellido !== 'string') {
      return Response.json(
        { error: 'El apellido no es válido.' },
        { status: 400 },
      );
    }

    apellido = body.apellido.trim();

    if (
      apellido.length === 0 ||
      apellido.length > 100
    ) {
      return Response.json(
        { error: 'El apellido no es válido.' },
        { status: 400 },
      );
    }
  }

  if (hasEmail) {
    if (typeof body.email !== 'string') {
      return Response.json(
        { error: 'El correo no es válido.' },
        { status: 400 },
      );
    }

    email = body.email.trim().toLowerCase();

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
  }

  if (hasPassword) {
    if (typeof body.password !== 'string') {
      return Response.json(
        { error: 'La contraseña no es válida.' },
        { status: 400 },
      );
    }

    /*
     * En edición, una contraseña vacía significa
     * "no cambiar contraseña".
     */
    if (body.password.length > 0) {
      if (
        body.password.length < 15 ||
        body.password.length > 128
      ) {
        return Response.json(
          {
            error:
              'La contraseña debe tener entre 15 y 128 caracteres.',
          },
          { status: 400 },
        );
      }

      password = body.password;
    }
  }

  if (hasRole) {
    if (!isRole(body.role)) {
      return Response.json(
        { error: 'El rol no es válido.' },
        { status: 400 },
      );
    }

    role = body.role;
  }

  if (hasStatus) {
    if (!isStatus(body.status)) {
      return Response.json(
        { error: 'El estado no es válido.' },
        { status: 400 },
      );
    }

    status = body.status;
  }

  if (
    nombre === undefined &&
    apellido === undefined &&
    email === undefined &&
    password === undefined &&
    role === undefined &&
    status === undefined
  ) {
    return Response.json(
      {
        error:
          'No se proporcionaron cambios válidos.',
      },
      { status: 400 },
    );
  }

  const target = await getTargetUser(id);

  if (!target) {
    return Response.json(
      { error: 'Usuario no encontrado.' },
      { status: 404 },
    );
  }

  const currentRole = getRole(target.roles);

  const resultingRole =
    role ?? currentRole;

  if (!resultingRole) {
    return Response.json(
      {
        error:
          'El usuario no tiene un rol válido. Debes asignar uno.',
      },
      { status: 409 },
    );
  }

  const resultingActive =
    status !== undefined
      ? status === 'Activo'
      : target.activo;

  /*
   * Regla de seguridad:
   * no permitir que desaparezca el último admin activo.
   */
  if (
    currentRole === 'admin' &&
    target.activo &&
    (resultingRole !== 'admin' ||
      !resultingActive)
  ) {
    const activeAdmins =
      await countActiveAdmins();

    if (activeAdmins <= 1) {
      return Response.json(
        {
          error:
            'Debe quedar al menos un administrador activo.',
        },
        { status: 409 },
      );
    }
  }

  /*
   * Obtenemos también la identidad actual de Supabase
   * antes de modificar PostgreSQL.
   */
  const {
    data: authData,
    error: authReadError,
  } =
    await supabaseAdmin.auth.admin.getUserById(
      id,
    );

  if (authReadError || !authData.user) {
    console.error(
      'Supabase getUserById failed:',
      authReadError,
    );

    return Response.json(
      {
        error:
          'No fue posible encontrar el usuario de autenticación.',
      },
      { status: 404 },
    );
  }

  const originalRoleIds =
    target.roles.map(
      ({ idRol }) => idRol,
    );

  try {
    await prisma.$transaction(
      async (transaction) => {
        await transaction.usuario.update({
          where: {
            idUsuario: id,
          },
          data: {
            ...(nombre !== undefined
              ? { nombre }
              : {}),
            ...(apellido !== undefined
              ? { apellido }
              : {}),
            ...(status !== undefined
              ? {
                  activo:
                    status === 'Activo',
                }
              : {}),
          },
        });

        if (role !== undefined) {
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

          await transaction.usuarioRol.deleteMany({
            where: {
              idUsuario: id,
            },
          });

          await transaction.usuarioRol.create({
            data: {
              idUsuario: id,
              idRol: rol.idRol,
            },
          });
        }
      },
    );
  } catch (error) {
    console.error(
      'Database user update failed:',
      error,
    );

    return Response.json(
      {
        error:
          'No fue posible actualizar el usuario.',
      },
      { status: 500 },
    );
  }

  const shouldUpdateAuth =
    email !== undefined ||
    password !== undefined ||
    nombre !== undefined ||
    apellido !== undefined;

  let updatedEmail =
    authData.user.email ?? '';

  if (shouldUpdateAuth) {
    const currentMetadata =
      authData.user.user_metadata ?? {};

    const {
      data: updatedAuthData,
      error: authUpdateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        id,
        {
          ...(email !== undefined
            ? { email }
            : {}),
          ...(password !== undefined
            ? { password }
            : {}),
          user_metadata: {
            ...currentMetadata,
            nombre:
              nombre ?? target.nombre,
            apellido:
              apellido ?? target.apellido,
          },
        },
      );

    if (authUpdateError) {
      console.error(
        'Supabase updateUserById failed:',
        authUpdateError,
      );

      /*
       * Supabase Auth y Prisma no pueden compartir
       * una transacción. Revertimos PostgreSQL
       * como operación compensatoria.
       */
      try {
        await prisma.$transaction(
          async (transaction) => {
            await transaction.usuario.update({
              where: {
                idUsuario: id,
              },
              data: {
                nombre: target.nombre,
                apellido: target.apellido,
                activo: target.activo,
              },
            });

            await transaction.usuarioRol.deleteMany({
              where: {
                idUsuario: id,
              },
            });

            if (
              originalRoleIds.length > 0
            ) {
              await transaction.usuarioRol.createMany({
                data:
                  originalRoleIds.map(
                    (idRol) => ({
                      idUsuario: id,
                      idRol,
                    }),
                  ),
              });
            }
          },
        );
      } catch (rollbackError) {
        console.error(
          'Database rollback failed:',
          rollbackError,
        );
      }

      if (
        authUpdateError.code ===
          'email_exists' ||
        authUpdateError.code ===
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
            'No fue posible actualizar los datos de autenticación.',
        },
        { status: 500 },
      );
    }

    updatedEmail =
      updatedAuthData.user.email ??
      email ??
      updatedEmail;
  }

  const finalNombre =
    nombre ?? target.nombre;

  const finalApellido =
    apellido ?? target.apellido;

  return Response.json({
    user: {
      id,
      username: updatedEmail,
      name:
        `${finalNombre} ${finalApellido}`.trim(),
      nombre: finalNombre,
      apellido: finalApellido,
      role: resultingRole,
      roles: [resultingRole],
      status: resultingActive
        ? 'Activo'
        : 'Inactivo',
    },
  });
}