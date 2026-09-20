import { useState } from 'react';

export type Role = 'student' | 'admin';

export type User = {
  username: string;
  name: string;
  role: Role;
};

// Usuarios de prueba mientras no exista backend.
// TODO: reemplazar por validación real contra la base de datos en Fase 2.
const USERS: (User & { password: string })[] = [
  { username: 'camila@duocuc.cl', password: '1234', name: 'Camila', role: 'student' },
  { username: 'claudia@duocuc.cl', password: '1234', name: 'Claudia', role: 'student' },
   { username: 'sofia@duocuc.cl', password: '1234', name: 'Sofia', role: 'student' },
    { username: 'raquel@duocuc.cl', password: '1234', name: 'Raquel', role: 'student' },
     { username: 'ella@duocuc.cl', password: '1234', name: 'Ella', role: 'student' },
      { username: 'martina@duocuc.cl', password: '1234', name: 'Martina', role: 'student' },
  { username: 'admin@duocuc.cl', password: 'casino2026', name: 'Personal Casino', role: 'admin' },
];

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
    const match = USERS.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (!match) {
      setError('Usuario o contraseña incorrectos.');
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