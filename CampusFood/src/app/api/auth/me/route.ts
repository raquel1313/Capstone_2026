import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase.auth.getClaims();

    const userId =
      data?.claims?.sub;

    if (error || !userId) {
      return Response.json(
        {
          error: 'No autenticado.',
        },
        {
          status: 401,
        },
      );
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          idUsuario: userId,
        },
        select: {
          idUsuario: true,
          nombre: true,
          apellido: true,
          activo: true,
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

    if (!usuario) {
      return Response.json(
        {
          error:
            'El usuario no está habilitado para utilizar la aplicación.',
          code:
            'USER_NOT_REGISTERED',
        },
        {
          status: 403,
        },
      );
    }

    if (!usuario.activo) {
      return Response.json(
        {
          error:
            'La cuenta está desactivada.',
          code:
            'ACCOUNT_INACTIVE',
        },
        {
          status: 403,
        },
      );
    }

    const roles =
      usuario.roles.map(
        ({ rol }) =>
          rol.nombre,
      );

    const role =
      roles.includes('admin')
        ? 'admin'
        : roles.includes('worker')
          ? 'worker'
          : roles.includes('student')
            ? 'student'
            : null;

    if (!role) {
      return Response.json(
        {
          error:
            'El usuario no tiene un rol asignado.',
          code:
            'ROLE_NOT_ASSIGNED',
        },
        {
          status: 403,
        },
      );
    }

    const email =
      typeof data.claims.email ===
      'string'
        ? data.claims.email
        : null;

    return Response.json({
      user: {
        id:
          usuario.idUsuario,
        username:
          email,
        name:
          `${usuario.nombre} ${usuario.apellido}`.trim(),
        nombre:
          usuario.nombre,
        apellido:
          usuario.apellido,
        role,
        roles,
      },
    });
  } catch (error) {
    console.error(
      'GET /api/auth/me failed:',
      error,
    );

    return Response.json(
      {
        error:
          'Error interno al obtener el perfil.',
      },
      {
        status: 500,
      },
    );
  }
}