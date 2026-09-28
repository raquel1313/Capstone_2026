import { useState } from 'react';

import {
  Check,
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';

import { useUsers, type Role, type UserItem } from '@/hooks/useUsers';

type RoleFilter = 'todos' | Role;

type FormValues = {
  name: string;
  username: string;
  role: Role;
  password: string;
  status: UserItem['status'];
};

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'student', label: 'Estudiantes' },
  { id: 'admin', label: 'Administradores' },
];

const EMPTY_FORM: FormValues = {
  name: '',
  username: '',
  role: 'student',
  password: '',
  status: 'Activo',
};

const INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]';

const LOCKED_MESSAGE = 'Debe quedar al menos un administrador activo';

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function roleLabel(role: Role) {
  return role === 'admin' ? 'Administrador' : 'Estudiante';
}

function UserForm({
  initial,
  isEditing,
  validate,
  onSave,
  onCancel,
}: {
  initial: FormValues;
  isEditing: boolean;
  validate: (values: FormValues) => string | null;
  onSave: (values: FormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const values: FormValues = {
      ...form,
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
    };

    if (!values.name || !values.username) {
      setError('El nombre y el correo son obligatorios.');
      return;
    }

    if (!/^[^\s@]+@duocuc\.cl$/.test(values.username)) {
      setError('El correo debe ser institucional (@duocuc.cl).');
      return;
    }

    if (!isEditing && values.password.length < 4) {
      setError('La contraseña inicial debe tener al menos 4 caracteres.');
      return;
    }

    if (isEditing && values.password && values.password.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    const problem = validate(values);
    if (problem) {
      setError(problem);
      return;
    }

    onSave(values);
  };

  return (
    <div className="rounded-[24px] border-2 border-dashed border-[#4e0611]/40 bg-white p-5">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-black/40">Nombre completo</label>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Ej. Camila Torres"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="text-xs text-black/40">Correo institucional</label>
          <input
            type="email"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder="nombre@duocuc.cl"
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/40">Rol</label>
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
              className={INPUT_CLASS}
            >
              <option value="student">Estudiante</option>
              <option value="admin">Personal Casino / Admin</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-black/40">Estado</label>
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as UserItem['status'] })
              }
              className={INPUT_CLASS}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-black/40">
            {isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder={isEditing ? 'Dejar en blanco para no cambiarla' : 'Mínimo 4 caracteres'}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#4e0611] py-2.5 text-xs font-semibold text-white hover:bg-[#36040c]"
        >
          <Check size={14} /> Guardar
        </button>

        <button
          onClick={onCancel}
          className="rounded-full bg-[#f8edef] px-4 py-2.5 text-xs font-medium text-black/50 hover:bg-black/10"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function UserCard({
  user,
  locked,
  validate,
  onSave,
  onRemove,
  onToggleStatus,
}: {
  user: UserItem;
  locked: boolean; // último administrador activo: no se puede borrar ni desactivar
  validate: (values: FormValues) => string | null;
  onSave: (values: FormValues) => void;
  onRemove: () => void;
  onToggleStatus: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const inactive = user.status === 'Inactivo';

  if (editing) {
    return (
      <UserForm
        initial={{
          name: user.name,
          username: user.username,
          role: user.role,
          password: '',
          status: user.status,
        }}
        isEditing
        validate={validate}
        onSave={(values) => {
          onSave(values);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`rounded-[24px] bg-white p-4 ${inactive ? 'ring-1 ring-red-200' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div
          className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-rose-100 to-red-200 text-sm font-semibold text-[#4e0611] ${
            inactive ? 'grayscale' : ''
          }`}
        >
          {getInitials(user.name)}
        </div>

        <div className="flex gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              user.role === 'admin'
                ? 'bg-[#4e0611]/10 text-[#4e0611]'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {roleLabel(user.role)}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              inactive ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {user.status}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="mt-1 truncate text-xs text-black/45">{user.username}</p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => setEditing(true)}
            aria-label={`Editar ${user.name}`}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
          >
            <Pencil size={13} />
          </button>

          {!confirmingDelete && (
            <button
              onClick={() => setEditing(true)}
              aria-label={`Cambiar contraseña de ${user.name}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
            >
              <KeyRound size={13} />
            </button>
          )}

          {confirmingDelete ? (
            <button
              onClick={onRemove}
              aria-label={`Confirmar eliminación de ${user.name}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
            >
              <Check size={13} />
            </button>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={locked}
              title={locked ? LOCKED_MESSAGE : undefined}
              aria-label={`Eliminar ${user.name}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#f8edef] disabled:hover:text-black/50"
            >
              <Trash2 size={13} />
            </button>
          )}

          {confirmingDelete && (
            <button
              onClick={() => setConfirmingDelete(false)}
              aria-label="Cancelar eliminación"
              className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onToggleStatus}
        disabled={locked}
        title={locked ? LOCKED_MESSAGE : undefined}
        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
          inactive
            ? 'bg-[#4e0611] text-white hover:bg-[#36040c]'
            : 'bg-[#f8edef] text-black/60 hover:bg-black/10 hover:text-[#4e0611]'
        }`}
      >
        {inactive ? <UserCheck size={13} /> : <UserX size={13} />}
        {inactive ? 'Activar usuario' : 'Desactivar usuario'}
      </button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] bg-white p-4">
      <div className="flex items-center justify-between text-black/30">
        <span className="text-xs text-black/40">{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold text-[#4e0611]">{value}</p>
    </div>
  );
}

export function AdminUsersView() {
  const { users, addUser, updateUser, removeUser, resetUsers } = useUsers();

  const [adding, setAdding] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos');
  const [search, setSearch] = useState('');

  const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'Activo');
  const isLastAdmin = (u: UserItem) =>
    u.role === 'admin' && u.status === 'Activo' && activeAdmins.length === 1;

  // Reglas del formulario: correo único y siempre al menos un admin activo.
  const validate = (values: FormValues, current?: UserItem): string | null => {
    if (users.some((u) => u.username === values.username && u.id !== current?.id)) {
      return 'Ya existe un usuario con ese correo.';
    }
    if (
      current &&
      isLastAdmin(current) &&
      (values.role !== 'admin' || values.status !== 'Activo')
    ) {
      return LOCKED_MESSAGE + '.';
    }
    return null;
  };

  const query = search.trim().toLowerCase();

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'todos' || u.role === roleFilter;
    const matchesSearch =
      !query || u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query);
    return matchesRole && matchesSearch;
  });

  return (
    <div>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total usuarios registrados" value={users.length} icon={<Users size={16} />} />
        <MetricCard
          label="Estudiantes / Funcionarios"
          value={users.filter((u) => u.role === 'student').length}
          icon={<UserCheck size={16} />}
        />
        <MetricCard
          label="Personal Casino"
          value={users.filter((u) => u.role === 'admin').length}
          icon={<Shield size={16} />}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setRoleFilter(filter.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                roleFilter === filter.id
                  ? 'bg-[#4e0611] text-white'
                  : 'bg-white text-black/50 hover:bg-[#f8edef] hover:text-[#4e0611]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={resetUsers}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black/45 transition hover:bg-[#f8edef] hover:text-[#4e0611]"
          >
            <RotateCcw size={13} /> Restaurar
          </button>

          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
          >
            <Plus size={13} /> Crear usuario
          </button>
        </div>
      </div>

      <div className="relative mb-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/30"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o correo"
          className="w-full rounded-full border border-black/5 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#4e0611]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {adding && (
          <UserForm
            initial={EMPTY_FORM}
            isEditing={false}
            validate={(values) => validate(values)}
            onSave={(values) => {
              addUser({
                name: values.name,
                username: values.username,
                role: values.role,
                status: values.status,
                password: values.password,
              });
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}

        {filtered.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            locked={isLastAdmin(user)}
            validate={(values) => validate(values, user)}
            onSave={(values) =>
              updateUser(user.id, {
                name: values.name,
                username: values.username,
                role: values.role,
                status: values.status,
                // Solo se cambia la contraseña si se escribió una nueva.
                ...(values.password ? { password: values.password } : {}),
              })
            }
            onRemove={() => removeUser(user.id)}
            onToggleStatus={() =>
              updateUser(user.id, { status: user.status === 'Activo' ? 'Inactivo' : 'Activo' })
            }
          />
        ))}
      </div>

      {filtered.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white p-14 text-center">
          <Users className="text-black/20" size={32} />
          <p className="mt-4 text-sm text-black/45">No se encontraron usuarios con esos filtros.</p>
        </div>
      )}
    </div>
  );
}