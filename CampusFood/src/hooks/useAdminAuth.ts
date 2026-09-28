import { useState } from 'react';

import { loadUsers } from './useUsers';

const SESSION_KEY = 'campusfood_admin_session';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  );
  const [error, setError] = useState<string | null>(null);

  const login = (username: string, password: string) => {
    const input = username.trim().toLowerCase();

    // Solo entran usuarios con rol admin y cuenta activa.
    // Acepta el correo completo o solo la parte antes de la @ (ej. "admin").
    const isValid = loadUsers().some(
      (u) =>
        u.role === 'admin' &&
        u.status === 'Activo' &&
        (u.username.toLowerCase() === input || u.username.split('@')[0].toLowerCase() === input) &&
        u.password === password
    );

    if (isValid) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setError(null);
      return true;
    }

    setError('Usuario o contraseña incorrectos.');
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  return { isAuthenticated, login, logout, error };
}