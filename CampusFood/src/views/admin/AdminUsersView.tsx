'use client';

import {
  useId,
  useState,
  type ReactNode,
} from 'react';

import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';

import {
  useUsers,
  type Role,
  type UpdateUserInput,
  type UserItem,
} from '@/hooks/useUsers';

type RoleFilter =
  | 'todos'
  | Role;

type FormValues = {
  nombre: string;
  apellido: string;
  email: string;
  role: Role;
  password: string;
  status: UserItem['status'];
};

const ROLE_FILTERS: {
  id: RoleFilter;
  label: string;
}[] = [
  {
    id: 'todos',
    label: 'Todos',
  },
  {
    id: 'student',
    label: 'Estudiantes / Funcionarios',
  },
  {
    id: 'worker',
    label: 'Personal Casino',
  },
  {
    id: 'admin',
    label: 'Administradores',
  },
];

const ROLE_LABELS: Record<
  Role,
  string
> = {
  student:
    'Estudiante / Funcionario',
  worker:
    'Personal Casino',
  admin:
    'Administrador',
};

const ROLE_BADGE_CLASSES: Record<
  Role,
  string
> = {
  student:
    'bg-emerald-100 text-emerald-700',
  worker:
    'bg-amber-100 text-amber-700',
  admin:
    'bg-[#4e0611]/10 text-[#4e0611]',
};

const EMPTY_FORM: FormValues = {
  nombre: '',
  apellido: '',
  email: '',
  role: 'student',
  password: '',
  status: 'Activo',
};

const INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611] disabled:cursor-not-allowed disabled:opacity-60';

const LOCKED_MESSAGE =
  'Debe quedar al menos un administrador activo';

function getInitials(
  name: string,
): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ?? '',
    )
    .join('');
}

function roleLabel(
  role: Role,
): string {
  return ROLE_LABELS[role];
}

function roleBadgeClass(
  role: Role,
): string {
  return ROLE_BADGE_CLASSES[role];
}

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado.';
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
  validate: (
    values: FormValues,
  ) => string | null;
  onSave: (
    values: FormValues,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const formId =
    useId();

  const [
    form,
    setForm,
  ] =
    useState<FormValues>(
      initial,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const firstNameId =
    `${formId}-first-name`;

  const lastNameId =
    `${formId}-last-name`;

  const emailId =
    `${formId}-email`;

  const roleId =
    `${formId}-role`;

  const statusId =
    `${formId}-status`;

  const passwordId =
    `${formId}-password`;

  const handleSave =
    async (): Promise<void> => {
      const values: FormValues = {
        ...form,

        nombre:
          form.nombre.trim(),

        apellido:
          form.apellido.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),
      };

      if (
        !values.nombre ||
        !values.apellido ||
        !values.email
      ) {
        setError(
          'El nombre, apellido y correo son obligatorios.',
        );

        return;
      }

      const originalEmail =
        initial.email
          .trim()
          .toLowerCase();

      const emailChanged =
        values.email !==
        originalEmail;

      /*
       * Al crear:
       * correo institucional obligatorio.
       *
       * Al editar:
       * un correo histórico puede
       * mantenerse, pero cualquier correo
       * nuevo debe ser institucional.
       */
      if (
        (!isEditing ||
          emailChanged) &&
        !/^[^\s@]+@duocuc\.cl$/i.test(
          values.email,
        )
      ) {
        setError(
          'El correo debe ser institucional (@duocuc.cl).',
        );

        return;
      }

      if (
        !isEditing &&
        (
          values.password.length <
            15 ||
          values.password.length >
            128
        )
      ) {
        setError(
          'La contraseña inicial debe tener entre 15 y 128 caracteres.',
        );

        return;
      }

      if (
        isEditing &&
        values.password &&
        (
          values.password.length <
            15 ||
          values.password.length >
            128
        )
      ) {
        setError(
          'La nueva contraseña debe tener entre 15 y 128 caracteres.',
        );

        return;
      }

      const problem =
        validate(values);

      if (problem) {
        setError(problem);

        return;
      }

      setSaving(true);
      setError(null);

      try {
        await onSave(values);
      } catch (saveError) {
        setError(
          getErrorMessage(
            saveError,
          ),
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="rounded-[24px] border-2 border-dashed border-[#4e0611]/40 bg-white p-5">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={
                firstNameId
              }
              className="text-xs text-black/40"
            >
              Nombre
            </label>

            <input
              id={
                firstNameId
              }
              autoComplete="given-name"
              value={
                form.nombre
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  nombre:
                    event
                      .target
                      .value,
                })
              }
              disabled={
                saving
              }
              placeholder="Ej. Camila"
              className={
                INPUT_CLASS
              }
            />
          </div>

          <div>
            <label
              htmlFor={
                lastNameId
              }
              className="text-xs text-black/40"
            >
              Apellido
            </label>

            <input
              id={
                lastNameId
              }
              autoComplete="family-name"
              value={
                form.apellido
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  apellido:
                    event
                      .target
                      .value,
                })
              }
              disabled={
                saving
              }
              placeholder="Ej. Torres"
              className={
                INPUT_CLASS
              }
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={emailId}
            className="text-xs text-black/40"
          >
            Correo institucional
          </label>

          <input
            id={emailId}
            type="email"
            autoComplete="email"
            value={
              form.email
            }
            onChange={(
              event,
            ) =>
              setForm({
                ...form,

                email:
                  event.target
                    .value,
              })
            }
            disabled={saving}
            placeholder="nombre@duocuc.cl"
            className={
              INPUT_CLASS
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={roleId}
              className="text-xs text-black/40"
            >
              Rol
            </label>

            <select
              id={roleId}
              value={
                form.role
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  role:
                    event
                      .target
                      .value as Role,
                })
              }
              disabled={
                saving
              }
              className={
                INPUT_CLASS
              }
            >
              <option value="student">
                Estudiante /
                Funcionario
              </option>

              <option value="worker">
                Personal Casino
              </option>

              <option value="admin">
                Administrador
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor={
                statusId
              }
              className="text-xs text-black/40"
            >
              Estado
            </label>

            <select
              id={statusId}
              value={
                form.status
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  status:
                    event
                      .target
                      .value as UserItem['status'],
                })
              }
              disabled={
                saving
              }
              className={
                INPUT_CLASS
              }
            >
              <option value="Activo">
                Activo
              </option>

              <option value="Inactivo">
                Inactivo
              </option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor={
              passwordId
            }
            className="text-xs text-black/40"
          >
            {isEditing
              ? 'Nueva contraseña (opcional)'
              : 'Contraseña inicial'}
          </label>

          <div className="relative">
            <input
              id={
                passwordId
              }
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              autoComplete="new-password"
              value={
                form.password
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  password:
                    event
                      .target
                      .value,
                })
              }
              disabled={
                saving
              }
              placeholder={
                isEditing
                  ? 'Dejar en blanco para no cambiarla'
                  : 'Mínimo 15 caracteres'
              }
              className={`${INPUT_CLASS} pr-10`}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              disabled={
                saving
              }
              aria-label={
                showPassword
                  ? 'Ocultar contraseña'
                  : 'Mostrar contraseña'
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 transition hover:text-[#4e0611] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {showPassword ? (
                <EyeOff
                  size={15}
                />
              ) : (
                <Eye
                  size={15}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-500"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#4e0611] py-2.5 text-xs font-semibold text-white hover:bg-[#36040c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check
            size={14}
          />

          {saving
            ? 'Guardando...'
            : 'Guardar'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full bg-[#f8edef] px-4 py-2.5 text-xs font-medium text-black/50 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-60"
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
  onToggleStatus,
}: {
  user: UserItem;
  locked: boolean;

  validate: (
    values: FormValues,
  ) => string | null;

  onSave: (
    values: FormValues,
  ) => Promise<void>;

  onToggleStatus:
    () => Promise<void>;
}) {
  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    actionPending,
    setActionPending,
  ] =
    useState(false);

  const [
    actionError,
    setActionError,
  ] =
    useState<string | null>(
      null,
    );

  const inactive =
    user.status ===
    'Inactivo';

  if (editing) {
    return (
      <UserForm
        initial={{
          nombre:
            user.nombre,

          apellido:
            user.apellido,

          email:
            user.username,

          role:
            user.role,

          password: '',

          status:
            user.status,
        }}
        isEditing
        validate={validate}
        onSave={async (
          values,
        ) => {
          await onSave(
            values,
          );

          setEditing(
            false,
          );
        }}
        onCancel={() =>
          setEditing(false)
        }
      />
    );
  }

  const handleToggleStatus =
    async (): Promise<void> => {
      setActionPending(
        true,
      );

      setActionError(
        null,
      );

      try {
        await onToggleStatus();
      } catch (
        statusError
      ) {
        setActionError(
          getErrorMessage(
            statusError,
          ),
        );
      } finally {
        setActionPending(
          false,
        );
      }
    };

  return (
    <div
      className={`rounded-[24px] bg-white p-4 ${
        inactive
          ? 'ring-1 ring-red-200'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-rose-100 to-red-200 text-sm font-semibold text-[#4e0611] ${
            inactive
              ? 'grayscale'
              : ''
          }`}
        >
          {getInitials(
            user.name,
          )}
        </div>

        <div className="flex gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${roleBadgeClass(
              user.role,
            )}`}
          >
            {roleLabel(
              user.role,
            )}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              inactive
                ? 'bg-slate-200 text-slate-600'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {user.status}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {user.name}
          </p>

          <p className="mt-1 truncate text-xs text-black/45">
            {
              user.username
            }
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() =>
              setEditing(
                true,
              )
            }
            disabled={
              actionPending
            }
            aria-label={`Editar ${user.name}`}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil
              size={13}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              setEditing(
                true,
              )
            }
            disabled={
              actionPending
            }
            aria-label={`Cambiar contraseña de ${user.name}`}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <KeyRound
              size={13}
            />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          void handleToggleStatus();
        }}
        disabled={
          locked ||
          actionPending
        }
        title={
          locked
            ? LOCKED_MESSAGE
            : undefined
        }
        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
          inactive
            ? 'bg-[#4e0611] text-white hover:bg-[#36040c]'
            : 'bg-[#f8edef] text-black/60 hover:bg-black/10 hover:text-[#4e0611]'
        }`}
      >
        {inactive ? (
          <UserCheck
            size={13}
          />
        ) : (
          <UserX
            size={13}
          />
        )}

        {actionPending
          ? 'Procesando...'
          : inactive
            ? 'Activar usuario'
            : 'Desactivar usuario'}
      </button>

      {locked && (
        <p className="mt-2 text-center text-[11px] text-black/40">
          {
            LOCKED_MESSAGE
          }
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-500"
        >
          {
            actionError
          }
        </p>
      )}
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
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[24px] bg-white p-4">
      <div className="flex items-center justify-between text-black/30">
        <span className="text-xs text-black/40">
          {label}
        </span>

        {icon}
      </div>

      <p className="mt-1 text-2xl font-semibold text-[#4e0611]">
        {value}
      </p>
    </div>
  );
}

export function AdminUsersView() {
  const {
    users,
    loading,
    error,
    refreshUsers,
    addUser,
    updateUser,
    setUserStatus,
  } = useUsers();

  const [
    adding,
    setAdding,
  ] =
    useState(false);

  const [
    roleFilter,
    setRoleFilter,
  ] =
    useState<RoleFilter>(
      'todos',
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const activeAdmins =
    users.filter(
      (user) =>
        user.role ===
          'admin' &&
        user.status ===
          'Activo',
    );

  const isLastAdmin = (
    user: UserItem,
  ): boolean =>
    user.role ===
      'admin' &&
    user.status ===
      'Activo' &&
    activeAdmins.length ===
      1;

  /*
   * Estas reglas mejoran la UX.
   * El backend continúa siendo
   * la autoridad definitiva.
   */
  const validate = (
    values: FormValues,
    current?: UserItem,
  ): string | null => {
    const normalizedEmail =
      values.email
        .trim()
        .toLowerCase();

    if (
      users.some(
        (user) =>
          user.username
            .toLowerCase() ===
            normalizedEmail &&
          user.id !==
            current?.id,
      )
    ) {
      return 'Ya existe un usuario con ese correo.';
    }

    if (
      current &&
      isLastAdmin(
        current,
      ) &&
      (
        values.role !==
          'admin' ||
        values.status !==
          'Activo'
      )
    ) {
      return `${LOCKED_MESSAGE}.`;
    }

    return null;
  };

  const query =
    search
      .trim()
      .toLowerCase();

  const filtered =
    users.filter(
      (user) => {
        const matchesRole =
          roleFilter ===
            'todos' ||
          user.role ===
            roleFilter;

        const matchesSearch =
          !query ||
          user.name
            .toLowerCase()
            .includes(
              query,
            ) ||
          user.username
            .toLowerCase()
            .includes(
              query,
            );

        return (
          matchesRole &&
          matchesSearch
        );
      },
    );

  const studentCount =
    users.filter(
      (user) =>
        user.role ===
        'student',
    ).length;

  const workerCount =
    users.filter(
      (user) =>
        user.role ===
        'worker',
    ).length;

  const adminCount =
    users.filter(
      (user) =>
        user.role ===
        'admin',
    ).length;

  return (
    <div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total usuarios registrados"
          value={
            users.length
          }
          icon={
            <Users
              size={16}
            />
          }
        />

        <MetricCard
          label="Estudiantes / Funcionarios"
          value={
            studentCount
          }
          icon={
            <UserCheck
              size={16}
            />
          }
        />

        <MetricCard
          label="Personal Casino"
          value={
            workerCount
          }
          icon={
            <Users
              size={16}
            />
          }
        />

        <MetricCard
          label="Administradores"
          value={
            adminCount
          }
          icon={
            <Shield
              size={16}
            />
          }
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              void refreshUsers();
            }}
            className="shrink-0 text-xs font-semibold text-red-700 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map(
            (
              filter,
            ) => (
              <button
                type="button"
                key={
                  filter.id
                }
                onClick={() =>
                  setRoleFilter(
                    filter.id,
                  )
                }
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  roleFilter ===
                  filter.id
                    ? 'bg-[#4e0611] text-white'
                    : 'bg-white text-black/50 hover:bg-[#f8edef] hover:text-[#4e0611]'
                }`}
              >
                {
                  filter.label
                }
              </button>
            ),
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void refreshUsers();
            }}
            disabled={
              loading
            }
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black/45 transition hover:bg-[#f8edef] hover:text-[#4e0611] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={
                loading
                  ? 'animate-spin'
                  : undefined
              }
            />

            Actualizar
          </button>

          <button
            type="button"
            onClick={() =>
              setAdding(
                true,
              )
            }
            disabled={
              adding
            }
            className="flex items-center gap-1.5 rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus
              size={13}
            />

            Crear usuario
          </button>
        </div>
      </div>

      <div className="relative mb-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/30"
        />

        <input
          value={
            search
          }
          onChange={(
            event,
          ) =>
            setSearch(
              event.target
                .value,
            )
          }
          placeholder="Buscar por nombre o correo"
          className="w-full rounded-full border border-black/5 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#4e0611]"
        />
      </div>

      {loading &&
      users.length === 0 ? (
        <div className="rounded-[28px] bg-white p-14 text-center">
          <RefreshCw
            size={28}
            className="mx-auto animate-spin text-black/20"
          />

          <p className="mt-4 text-sm text-black/45">
            Cargando
            usuarios...
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {adding && (
              <UserForm
                initial={
                  EMPTY_FORM
                }
                isEditing={
                  false
                }
                validate={(
                  values,
                ) =>
                  validate(
                    values,
                  )
                }
                onSave={async (
                  values,
                ) => {
                  await addUser(
                    {
                      nombre:
                        values.nombre,

                      apellido:
                        values.apellido,

                      email:
                        values.email,

                      password:
                        values.password,

                      role:
                        values.role,

                      status:
                        values.status,
                    },
                  );

                  setAdding(
                    false,
                  );
                }}
                onCancel={() =>
                  setAdding(
                    false,
                  )
                }
              />
            )}

            {filtered.map(
              (user) => (
                <UserCard
                  key={
                    user.id
                  }
                  user={
                    user
                  }
                  locked={isLastAdmin(
                    user,
                  )}
                  validate={(
                    values,
                  ) =>
                    validate(
                      values,
                      user,
                    )
                  }
                  onSave={async (
                    values,
                  ) => {
                    const updates: UpdateUserInput =
                      {
                        nombre:
                          values.nombre,

                        apellido:
                          values.apellido,

                        role:
                          values.role,

                        status:
                          values.status,
                      };

                    if (
                      values.email !==
                      user.username
                        .trim()
                        .toLowerCase()
                    ) {
                      updates.email =
                        values.email;
                    }

                    if (
                      values.password
                    ) {
                      updates.password =
                        values.password;
                    }

                    await updateUser(
                      user.id,
                      updates,
                    );
                  }}
                  onToggleStatus={async () => {
                    await setUserStatus(
                      user.id,

                      user.status ===
                        'Activo'
                        ? 'Inactivo'
                        : 'Activo',
                    );
                  }}
                />
              ),
            )}
          </div>

          {filtered.length ===
            0 &&
            !adding && (
              <div className="flex flex-col items-center justify-center rounded-[28px] bg-white p-14 text-center">
                <Users
                  className="text-black/20"
                  size={32}
                />

                <p className="mt-4 text-sm text-black/45">
                  No se
                  encontraron
                  usuarios con
                  esos filtros.
                </p>
              </div>
            )}
        </>
      )}
    </div>
  );
}