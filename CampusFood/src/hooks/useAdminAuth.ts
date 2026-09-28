import {
  useState,
  useSyncExternalStore,
} from 'react';

import { loadUsers } from './useUsers';

const SESSION_KEY = 'campusfood_admin_session';
const SESSION_UPDATE_EVENT =
  'campusfood-admin-session-update';

function readSessionSnapshot(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return (
      window.sessionStorage.getItem(
        SESSION_KEY
      ) === 'true'
    );
  } catch {
    return false;
  }
}

function getServerSnapshot(): false {
  return false;
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

function saveSession(): void {
  window.sessionStorage.setItem(
    SESSION_KEY,
    'true'
  );

  notifySessionChange();
}

function clearSession(): void {
  window.sessionStorage.removeItem(
    SESSION_KEY
  );

  notifySessionChange();
}

export function useAdminAuth() {
  const isAuthenticated =
    useSyncExternalStore(
      subscribeToSession,
      readSessionSnapshot,
      getServerSnapshot
    );

  const [error, setError] =
    useState<string | null>(null);

  const login = (
    username: string,
    password: string
  ) => {
    const input =
      username.trim().toLowerCase();

    const isValid = loadUsers().some(
      (user) =>
        user.role === 'admin' &&
        user.status === 'Activo' &&
        (
          user.username.toLowerCase() ===
            input ||
          user.username
            .split('@')[0]
            .toLowerCase() === input
        ) &&
        user.password === password // esta es una mala práctica, pero es solo para fines de demostración.
    );

    if (!isValid) {
      setError(
        'Usuario o contraseña incorrectos.'
      );

      return false;
    }

    saveSession();
    setError(null);

    return true;
  };

  const logout = () => {
    clearSession();
    setError(null);
  };

  return {
    isAuthenticated,
    login,
    logout,
    error,
  };
}