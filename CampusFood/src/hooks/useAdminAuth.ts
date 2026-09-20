import { useState } from 'react';

// Credenciales temporales mientras no exista backend.
// TODO: reemplazar por validación real contra la base de datos en Fase 2.
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'casino2026',
};

const SESSION_KEY = 'campusfood_admin_session';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  );
  const [error, setError] = useState<string | null>(null);

  const login = (username: string, password: string) => {
    const isValid =
      username.trim().toLowerCase() === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password;

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