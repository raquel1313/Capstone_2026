'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

export type Role =
  | 'student'
  | 'admin';

export type UserStatus =
  | 'Activo'
  | 'Inactivo';

export type UserItem = {
  id: string;
  username: string;
  name: string;
  nombre: string;
  apellido: string;
  role: Role;
  status: UserStatus;
  fechaCreacion?: string;
};

export type CreateUserInput = {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  role: Role;
  status: UserStatus;
};

export type UpdateUserInput = {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  role?: Role;
  status?: UserStatus;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

function isRole(
  value: unknown,
): value is Role {
  return (
    value === 'student' ||
    value === 'admin'
  );
}

function isStatus(
  value: unknown,
): value is UserStatus {
  return (
    value === 'Activo' ||
    value === 'Inactivo'
  );
}

function parseUser(
  value: unknown,
): UserItem | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.nombre !== 'string' ||
    typeof value.apellido !== 'string' ||
    !isRole(value.role) ||
    !isStatus(value.status)
  ) {
    return null;
  }

  return {
    id: value.id,
    username: value.username,
    name: value.name,
    nombre: value.nombre,
    apellido: value.apellido,
    role: value.role,
    status: value.status,
    fechaCreacion:
      typeof value.fechaCreacion === 'string'
        ? value.fechaCreacion
        : undefined,
  };
}

async function readJson(
  response: Response,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(
  data: unknown,
  fallback: string,
): string {
  if (
    isRecord(data) &&
    typeof data.error === 'string'
  ) {
    return data.error;
  }

  return fallback;
}

function isAbortError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.name === 'AbortError'
  );
}

async function fetchUsersFromApi(
  signal?: AbortSignal,
): Promise<UserItem[]> {
  const response = await fetch(
    '/api/admin/users',
    {
      method: 'GET',
      cache: 'no-store',
      signal,
    },
  );

  const data =
    await readJson(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        'No fue posible obtener los usuarios.',
      ),
    );
  }

  if (
    !isRecord(data) ||
    !Array.isArray(data.users)
  ) {
    throw new Error(
      'La API devolvió una respuesta inválida.',
    );
  }

  const parsedUsers =
    data.users.map(parseUser);

  if (
    parsedUsers.some(
      (user) => user === null,
    )
  ) {
    throw new Error(
      'La API devolvió uno o más usuarios inválidos.',
    );
  }

  return parsedUsers as UserItem[];
}

async function requestUser(
  url: string,
  init: RequestInit,
): Promise<UserItem> {
  const response = await fetch(
    url,
    init,
  );

  const data =
    await readJson(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        'No fue posible procesar el usuario.',
      ),
    );
  }

  if (
    !isRecord(data) ||
    !('user' in data)
  ) {
    throw new Error(
      'La API devolvió una respuesta inválida.',
    );
  }

  const user =
    parseUser(data.user);

  if (!user) {
    throw new Error(
      'La API devolvió un usuario inválido.',
    );
  }

  return user;
}

export function useUsers() {
  const [users, setUsers] =
    useState<UserItem[]>([]);

  /*
   * Empieza en true para evitar llamar
   * setLoading(true) de forma síncrona
   * desde el useEffect inicial.
   */
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Carga inicial.
   *
   * La primera actualización de estado
   * ocurre después del await, evitando
   * react-hooks/set-state-in-effect.
   */
  useEffect(() => {
    const controller =
      new AbortController();

    async function loadInitialUsers() {
      try {
        const result =
          await fetchUsersFromApi(
            controller.signal,
          );

        if (
          controller.signal.aborted
        ) {
          return;
        }

        setUsers(result);
        setError(null);
      } catch (requestError) {
        if (
          isAbortError(
            requestError,
          ) ||
          controller.signal.aborted
        ) {
          return;
        }

        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible obtener los usuarios.';

        setError(message);
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    void loadInitialUsers();

    return () => {
      controller.abort();
    };
  }, []);

  const refreshUsers =
    useCallback(
      async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await fetchUsersFromApi();

          setUsers(result);
        } catch (requestError) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : 'No fue posible obtener los usuarios.';

          setError(message);

          throw new Error(
            message,
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  const addUser =
    useCallback(
      async (
        input: CreateUserInput,
      ): Promise<UserItem> => {
        setError(null);

        try {
          const user =
            await requestUser(
              '/api/admin/users',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify(
                  input,
                ),
              },
            );

          setUsers(
            (current) => [
              user,
              ...current,
            ],
          );

          return user;
        } catch (requestError) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : 'No fue posible crear el usuario.';

          setError(message);

          throw new Error(
            message,
          );
        }
      },
      [],
    );

  const updateUser =
    useCallback(
      async (
        id: string,
        updates: UpdateUserInput,
      ): Promise<UserItem> => {
        setError(null);

        try {
          const user =
            await requestUser(
              `/api/admin/users/${id}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify(
                  updates,
                ),
              },
            );

          setUsers(
            (current) =>
              current.map(
                (candidate) =>
                  candidate.id ===
                  id
                    ? user
                    : candidate,
              ),
          );

          return user;
        } catch (requestError) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : 'No fue posible actualizar el usuario.';

          setError(message);

          throw new Error(
            message,
          );
        }
      },
      [],
    );

  const removeUser =
    useCallback(
      async (
        id: string,
      ): Promise<void> => {
        setError(null);

        try {
          const response =
            await fetch(
              `/api/admin/users/${id}`,
              {
                method:
                  'DELETE',
              },
            );

          if (!response.ok) {
            const data =
              await readJson(
                response,
              );

            throw new Error(
              getErrorMessage(
                data,
                'No fue posible eliminar el usuario.',
              ),
            );
          }

          setUsers(
            (current) =>
              current.filter(
                (user) =>
                  user.id !== id,
              ),
          );
        } catch (requestError) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : 'No fue posible eliminar el usuario.';

          setError(message);

          throw new Error(
            message,
          );
        }
      },
      [],
    );

  return {
    users,
    loading,
    error,
    refreshUsers,
    addUser,
    updateUser,
    removeUser,
  };
}