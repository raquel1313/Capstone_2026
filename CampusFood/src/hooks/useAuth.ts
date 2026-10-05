import {
  useState,
  useSyncExternalStore,
} from 'react';

import {
  loadUsers,
  type Role,
} from './useUsers';

export type { Role };

export type User = {
  username: string;
  name: string;
  role: Role;
};

const SESSION_KEY = 'campusfood_session';
const SESSION_UPDATE_EVENT = 'campusfood-session-update';

function readSessionSnapshot(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage.getItem(
      SESSION_KEY
    );
  } catch {
    return null;
  }
}

function getServerSnapshot(): null {
  return null;
}

function parseSession(
  raw: string | null
): User | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('username' in parsed) ||
      !('name' in parsed) ||
      !('role' in parsed)
    ) {
      return null;
    }

    const user = parsed as Partial<User>;

    if (
      typeof user.username !== 'string' ||
      typeof user.name !== 'string' ||
      (user.role !== 'student' &&
        user.role !== 'worker' &&
        user.role !== 'admin')
    ) {
      return null;
    }

    return {
      username: user.username,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
}

function subscribeToSession(
  callback: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(
    SESSION_UPDATE_EVENT,
    callback
  );

  return () => {
    window.removeEventListener(
      SESSION_UPDATE_EVENT,
      callback
    );
  };
}

function notifySessionChange(): void {
  window.dispatchEvent(
    new Event(SESSION_UPDATE_EVENT)
  );
}

function saveSession(user: User): void {
  window.sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(user)
  );

  notifySessionChange();
}

function clearSession(): void {
  window.sessionStorage.removeItem(
    SESSION_KEY
  );

  notifySessionChange();
}

export function useAuth() {
  const sessionSnapshot =
    useSyncExternalStore(
      subscribeToSession,
      readSessionSnapshot,
      getServerSnapshot
    );

  const user = parseSession(
    sessionSnapshot
  );

  const [error, setError] =
    useState<string | null>(null);

  const login = (
    username: string,
    password: string
  ) => {
    const normalizedUsername =
      username.trim().toLowerCase();

    const match = loadUsers().find(
      (candidate) =>
        candidate.username.toLowerCase() ===
          normalizedUsername &&
        candidate.password === password
    );

    if (!match) {
      setError(
        'Usuario o contraseña incorrectos.'
      );

      return false;
    }

    if (match.status === 'Inactivo') {
      setError(
        'Tu cuenta está desactivada. Comunícate con administración para reactivarla.'
      );

      return false;
    }

    const loggedUser: User = {
      username: match.username,
      name: match.name,
      role: match.role,
    };

    saveSession(loggedUser);

    setError(null);

    return true;
  };

  const logout = () => {
    clearSession();
    setError(null);
  };

  return {
    user,
    login,
    logout,
    error,
  };
}