import { useEffect, useState } from 'react';

export type Role = 'student' | 'admin';

export type UserItem = {
  id: string;
  username: string; // Correo institucional
  name: string;
  role: Role;
  status: 'Activo' | 'Inactivo';
  password: string;
};

// Usuarios de prueba mientras no exista backend.
// TODO: reemplazar por la base de datos en Fase 2 (y guardar contraseñas con hash).
export const INITIAL_USERS: UserItem[] = [
  { id: '1', username: 'camila@duocuc.cl', password: '1234', name: 'Camila', role: 'student', status: 'Activo' },
  { id: '2', username: 'claudia@duocuc.cl', password: '1234', name: 'Claudia', role: 'student', status: 'Activo' },
  { id: '3', username: 'sofia@duocuc.cl', password: '1234', name: 'Sofia', role: 'student', status: 'Activo' },
  { id: '4', username: 'raquel@duocuc.cl', password: '1234', name: 'Raquel', role: 'student', status: 'Activo' },
  { id: '5', username: 'ella@duocuc.cl', password: '1234', name: 'Ella', role: 'student', status: 'Activo' },
  { id: '6', username: 'martina@duocuc.cl', password: '1234', name: 'Martina', role: 'student', status: 'Activo' },
  { id: '7', username: 'admin@duocuc.cl', password: 'casino2026', name: 'Personal Casino', role: 'admin', status: 'Activo' },
];

const STORAGE_KEY = 'campusfood_users';

// Lectura directa: la usan también useAuth y useAdminAuth al iniciar sesión,
// así siempre ven la lista más reciente.
export function loadUsers(): UserItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UserItem[];
  } catch {
    /* si el dato está corrupto, se usan los usuarios iniciales */
  }
  return INITIAL_USERS;
}

export function useUsers() {
  const [users, setUsers] = useState<UserItem[]>(() => loadUsers());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const addUser = (user: Omit<UserItem, 'id'>) => {
    setUsers((prev) => [...prev, { ...user, id: crypto.randomUUID() }]);
  };

  const updateUser = (id: string, updates: Partial<UserItem>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };

  const removeUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const resetUsers = () => setUsers(INITIAL_USERS);

  return { users, addUser, updateUser, removeUser, resetUsers };
}