import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

type RequireAdminResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      response: Response;
    };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (error || !userId) {
    return {
      ok: false,
      response: Response.json(
        { error: 'No autenticado.' },
        { status: 401 },
      ),
    };
  }

  const usuario =
    await prisma.usuario.findUnique({
      where: {
        idUsuario: userId,
      },
      select: {
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
    return {
      ok: false,
      response: Response.json(
        { error: 'Usuario no registrado.' },
        { status: 403 },
      ),
    };
  }

  if (!usuario.activo) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Usuario inactivo.' },
        { status: 403 },
      ),
    };
  }

  const isAdmin =
    usuario.roles.some(
      ({ rol }) =>
        rol.nombre === 'admin',
    );

  if (!isAdmin) {
    return {
      ok: false,
      response: Response.json(
        {
          error:
            'Se requiere rol administrador.',
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    userId,
  };
}