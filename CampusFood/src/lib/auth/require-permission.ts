import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

/*
 * Permisos válidos actualmente en CampusFood.
 *
 * Este tipo evita que una API solicite accidentalmente
 * un permiso inexistente por un error de escritura.
 */
export const PERMISSIONS = [
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
  'MANAGE_PENALTIES',
] as const;

export type Permission =
  (typeof PERMISSIONS)[number];

type RequirePermissionResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      response: Response;
    };

/**
 * Exige que el usuario:
 *
 * 1. tenga una sesión válida de Supabase;
 * 2. exista en la base de datos de CampusFood;
 * 3. esté activo;
 * 4. tenga el permiso solicitado a través
 *    de al menos uno de sus roles.
 */
export async function requirePermission(
  permission: Permission,
): Promise<RequirePermissionResult> {
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

    /*
     * 401:
     * No existe una identidad autenticada válida.
     */
    if (error || !userId) {
      return {
        ok: false,
        response: Response.json(
          {
            error: 'No autenticado.',
          },
          {
            status: 401,
          },
        ),
      };
    }

    /*
     * Obtenemos únicamente la información necesaria
     * para autorización:
     *
     * Usuario
     *   -> UsuarioRol
     *      -> Rol
     *         -> RolPermiso
     *            -> Permiso
     */
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
                  permisos: {
                    select: {
                      permiso: {
                        select: {
                          nombre: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

    /*
     * La identidad existe en Supabase,
     * pero no existe como usuario válido
     * dentro de CampusFood.
     */
    if (!usuario) {
      return {
        ok: false,
        response: Response.json(
          {
            error:
              'Usuario no registrado.',
            code:
              'USER_NOT_REGISTERED',
          },
          {
            status: 403,
          },
        ),
      };
    }

    /*
     * La sesión de Supabase puede seguir siendo válida
     * después de desactivar una cuenta.
     *
     * Por eso el estado activo se valida siempre
     * contra PostgreSQL.
     */
    if (!usuario.activo) {
      return {
        ok: false,
        response: Response.json(
          {
            error:
              'La cuenta está desactivada.',
            code:
              'ACCOUNT_INACTIVE',
          },
          {
            status: 403,
          },
        ),
      };
    }

    /*
     * Un usuario puede tener uno o más roles.
     *
     * El acceso se concede si cualquiera de ellos
     * contiene el permiso solicitado.
     */
    const hasPermission =
      usuario.roles.some(
        ({ rol }) =>
          rol.permisos.some(
            ({ permiso }) =>
              permiso.nombre ===
              permission,
          ),
      );

    if (!hasPermission) {
      return {
        ok: false,
        response: Response.json(
          {
            error:
              'No tienes permiso para realizar esta operación.',
            code:
              'PERMISSION_DENIED',
          },
          {
            status: 403,
          },
        ),
      };
    }

    return {
      ok: true,
      userId,
    };
  } catch (error) {
    console.error(
      'requirePermission failed:',
      error,
    );

    return {
      ok: false,
      response: Response.json(
        {
          error:
            'Error interno al verificar los permisos.',
          code:
            'AUTHORIZATION_ERROR',
        },
        {
          status: 500,
        },
      ),
    };
  }
}