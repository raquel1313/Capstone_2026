'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createClient } from '@/lib/supabase/client';

export type Role =
  | 'student'
  | 'worker'
  | 'admin';

export type User = {
  id: string;
  username: string;
  name: string;
  role: Role;
};

export type LoginResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

type ProfileResponse = {
  user?: {
    id?: unknown;
    username?: unknown;
    name?: unknown;
    role?: unknown;
  };
  error?: unknown;
  code?: unknown;
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

function parseProfile(
  data: ProfileResponse,
): User | null {
  const profile = data.user;

  if (
    !profile ||
    typeof profile.id !== 'string' ||
    typeof profile.username !== 'string' ||
    typeof profile.name !== 'string' ||
    !isRole(profile.role)
  ) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    role: profile.role,
  };
}

export function useAuth() {
 
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);


  const loadProfile = useCallback(
    async (): Promise<User | null> => {
      const response = await fetch(
        '/api/auth/me',
        {
          method: 'GET',
          cache: 'no-store',
          credentials:
            'same-origin',
        },
      );

      /*
       * 401 significa que no existe
       * una sesión autenticada válida.
       */
      if (response.status === 401) {
        setUser(null);

        return null;
      }

      let data: ProfileResponse;

      try {
        data =
          (await response.json()) as ProfileResponse;
      } catch {
        throw new Error(
          'La respuesta de /api/auth/me no contiene JSON válido.',
        );
      }

      if (!response.ok) {
        setUser(null);

        return null;
      }

      const profile =
        parseProfile(data);

      if (!profile) {
        throw new Error(
          'La respuesta de /api/auth/me no tiene el formato esperado.',
        );
      }

      setUser(profile);

      return profile;
    },
    [],
  );

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      try {
        await loadProfile();
      } catch (error) {
        console.error(
          'No se pudo restaurar la sesión:',
          error,
        );

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initializeAuth();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (event) => {
          if (!active) {
            return;
          }

          if (
            event === 'SIGNED_OUT'
          ) {
            setUser(null);
            setLoading(false);

            return;
          }

          if (
            event === 'SIGNED_IN' ||
            event ===
              'TOKEN_REFRESHED' ||
            event ===
              'USER_UPDATED'
          ) {
            window.setTimeout(
              () => {
                if (!active) {
                  return;
                }

                void loadProfile()
                  .catch(
                    (error) => {
                      console.error(
                        'No se pudo actualizar el perfil autenticado:',
                        error,
                      );

                      setUser(
                        null,
                      );
                    },
                  )
                  .finally(
                    () => {
                      if (
                        active
                      ) {
                        setLoading(
                          false,
                        );
                      }
                    },
                  );
              },
              0,
            );
          }
        },
      );

    return () => {
      active = false;

      subscription.unsubscribe();
    };
  }, [
    loadProfile,
    supabase,
  ]);

  async function login(
    username: string,
    password: string,
  ): Promise<LoginResult> {
    const email =
      username
        .trim()
        .toLowerCase();

    setLoading(true);

    try {
      const {
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email,
            password,
          },
        );

      if (error) {
        return {
          ok: false,
          message:
            'Correo o contraseña incorrectos.',
        };
      }

      const profile =
        await loadProfile();

      if (!profile) {
        await supabase.auth.signOut();

        return {
          ok: false,
          message:
            'No fue posible cargar el perfil del usuario.',
        };
      }

      return {
        ok: true,
      };
    } catch (error) {
      console.error(
        'Error durante el inicio de sesión:',
        error,
      );

      await supabase.auth.signOut();

      setUser(null);

      return {
        ok: false,
        message:
          'No fue posible iniciar sesión.',
      };
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        'No se pudo cerrar la sesión:',
        error,
      );

      return;
    }

    setUser(null);
  }

  return {
    user,
    loading,
    login,
    logout,
  };
}