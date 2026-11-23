import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export type SessionUser = {
  userId: string;
  email: string;
  nombre: string;
  apellido: string;
  roles: string[];
  permissions: ReadonlySet<string>;
};

type SessionResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: Response };

function fail(
  status: number,
  error: string,
  code?: string,
): SessionResult {
  return {
    ok: false,
    response: Response.json(code ? { error, code } : { error }, { status }),
  };
}

/**
 * Exige una sesión válida de Supabase y un usuario activo en CampusFood.
 * Devuelve sus roles y permisos para que cada API decida qué puede hacer.
 */
export async function requireSession(): Promise<SessionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || !userId) {
      return fail(401, 'No autenticado.');
    }

    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: userId },
      select: {
        nombre: true,
        apellido: true,
        activo: true,
        roles: {
          select: {
            rol: {
              select: {
                nombre: true,
                permisos: { select: { permiso: { select: { nombre: true } } } },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      return fail(403, 'Usuario no registrado.', 'USER_NOT_REGISTERED');
    }

    if (!usuario.activo) {
      return fail(403, 'La cuenta está desactivada.', 'ACCOUNT_INACTIVE');
    }

    const permissions = new Set<string>();

    for (const { rol } of usuario.roles) {
      for (const { permiso } of rol.permisos) {
        permissions.add(permiso.nombre);
      }
    }

    const email =
      typeof data.claims.email === 'string' ? data.claims.email : '';

    return {
      ok: true,
      session: {
        userId,
        email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        roles: usuario.roles.map(({ rol }) => rol.nombre),
        permissions,
      },
    };
  } catch (error) {
    console.error('requireSession failed:', error);
    return fail(500, 'Error interno al verificar la sesión.', 'AUTHORIZATION_ERROR');
  }
}

/**
 * Igual que requireSession, pero además exige un permiso. Responde 401 si no hay sesión
 * y 403 si el usuario (por ejemplo un estudiante) no tiene el permiso. La autorización
 * siempre se valida aquí, en el servidor: ocultar botones en la pantalla no protege nada.
 */
export async function requireSessionWithPermission(permission: string): Promise<SessionResult> {
  const result = await requireSession();

  if (!result.ok) {
    return result;
  }

  if (!result.session.permissions.has(permission)) {
    return fail(403, 'No tienes permiso para realizar esta operación.', 'PERMISSION_DENIED');
  }

  return result;
}
