import {
  useMemo,
  useSyncExternalStore,
} from 'react';

export type Role = 'student' | 'worker' | 'admin';

export type UserItem = {
  id: string;
  username: string;
  name: string;
  role: Role;
  status: 'Activo' | 'Inactivo';
  password: string;
};

export const INITIAL_USERS: UserItem[] = [
  {
    id: '1',
    username: 'camila@duocuc.cl',
    password: '1234',
    name: 'Camila',
    role: 'student',
    status: 'Activo',
  },
  {
    id: '2',
    username: 'claudia@duocuc.cl',
    password: '1234',
    name: 'Claudia',
    role: 'student',
    status: 'Activo',
  },
  {
    id: '3',
    username: 'sofia@duocuc.cl',
    password: '1234',
    name: 'Sofia',
    role: 'student',
    status: 'Activo',
  },
  {
    id: '4',
    username: 'raquel@duocuc.cl',
    password: '1234',
    name: 'Raquel',
    role: 'student',
    status: 'Activo',
  },
  {
    id: '5',
    username: 'ella@duocuc.cl',
    password: '1234',
    name: 'Ella',
    role: 'student',
    status: 'Activo',
  },
  {
    id: '6',
    username: 'martina@duocuc.cl',
    password: '1234',
    name: 'Martina',
    role: 'student',
    status: 'Activo',
  },
  {
    id: '7',
    username: 'admin@duocuc.cl',
    password: 'casino2026',
    name: 'Personal Casino',
    role: 'admin',
    status: 'Activo',
  },
  {
    id: '8',
    username: 'colaborador@duocuc.cl',
    password: '1234',
    name: 'Colaborador Casino',
    role: 'worker',
    status: 'Activo',
  },
];

const STORAGE_KEY = 'campusfood_users';
const STORAGE_UPDATE_EVENT = 'campusfood-users-update';

const INITIAL_USERS_JSON = JSON.stringify(INITIAL_USERS);

function parseUsers(raw: string): UserItem[] {
  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed as UserItem[])
      : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

function readUsersSnapshot(): string {
  if (typeof window === 'undefined') {
    return INITIAL_USERS_JSON;
  }

  try {
    return (
      window.localStorage.getItem(STORAGE_KEY) ??
      INITIAL_USERS_JSON
    );
  } catch {
    return INITIAL_USERS_JSON;
  }
}

function getServerSnapshot(): string {
  return INITIAL_USERS_JSON;
}

function writeUsers(users: UserItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(users)
  );

  window.dispatchEvent(
    new Event(STORAGE_UPDATE_EVENT)
  );
}

function subscribeToUsers(
  callback: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (
    event: StorageEvent
  ) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener(
    'storage',
    handleStorage
  );

  window.addEventListener(
    STORAGE_UPDATE_EVENT,
    callback
  );

  return () => {
    window.removeEventListener(
      'storage',
      handleStorage
    );

    window.removeEventListener(
      STORAGE_UPDATE_EVENT,
      callback
    );
  };
}

export function loadUsers(): UserItem[] {
  return parseUsers(readUsersSnapshot());
}

export function useUsers() {
  const snapshot = useSyncExternalStore(
    subscribeToUsers,
    readUsersSnapshot,
    getServerSnapshot
  );

  const users = useMemo(
    () => parseUsers(snapshot),
    [snapshot]
  );

  const addUser = (
    user: Omit<UserItem, 'id'>
  ) => {
    const current = loadUsers();

    writeUsers([
      ...current,
      {
        ...user,
        id: crypto.randomUUID(),
      },
    ]);
  };

  const updateUser = (
    id: string,
    updates: Partial<UserItem>
  ) => {
    const current = loadUsers();

    writeUsers(
      current.map((user) =>
        user.id === id
          ? { ...user, ...updates }
          : user
      )
    );
  };

  const removeUser = (id: string) => {
    const current = loadUsers();

    writeUsers(
      current.filter(
        (user) => user.id !== id
      )
    );
  };

  const resetUsers = () => {
    writeUsers(INITIAL_USERS);
  };

  return {
    users,
    addUser,
    updateUser,
    removeUser,
    resetUsers,
  };
}