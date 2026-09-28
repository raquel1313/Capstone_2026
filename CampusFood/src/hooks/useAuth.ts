import { useState } from 'react';

import { loadUsers, type Role } from './useUsers';

export type { Role };

export type User = {
  username: string;
  name: string;
  role: Role;
};

const SESSION_KEY = 'campusfood_session';

function loadSession(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => loadSession());
  const [error, setError] = useState<string | null>(null);

  const login = (username: string, password: string) => {
    // Los usuarios vienen de la misma lista que administra el panel (useUsers).
    const match = loadUsers().find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (!match) {
      setError('Usuario o contraseña incorrectos.');
      return false;
    }

    if (match.status === 'Inactivo') {
      setError('Tu cuenta está desactivada. Contacta al personal del casino.');
      return false;
    }

    const loggedUser: User = { username: match.username, name: match.name, role: match.role };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(loggedUser));
    setUser(loggedUser);
    setError(null);
    return true;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return { user, login, logout, error };
}