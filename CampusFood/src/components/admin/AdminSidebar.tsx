import {
  Boxes,
  LayoutGrid,
  LogOut,
  Package,
  UtensilsCrossed,
  Users,
  Vote,
} from 'lucide-react';

import type { AdminView } from '@/types';

type PanelRole =
  | 'admin'
  | 'worker';

type NavItem = {
  id: AdminView;
  label: string;
  icon: typeof LayoutGrid;
  roles: readonly PanelRole[];
};

const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'orders',
    label: 'Pedidos',
    icon: LayoutGrid,
    roles: ['admin', 'worker'],
  },
  {
    id: 'menu',
    label: 'Menú semanal',
    icon: UtensilsCrossed,
    roles: ['admin', 'worker'],
  },
  {
    id: 'products',
    label: 'Productos',
    icon: Package,
    roles: ['admin'],
  },
  {
    id: 'stock',
    label: 'Inventario',
    icon: Boxes,
    roles: [
      'admin',
      'worker',
    ],
  },
  {
    id: 'votes',
    label: 'Votaciones',
    icon: Vote,
    roles: ['admin'],
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: Users,
    roles: ['admin'],
  },
];

export function AdminSidebar({
  role,
  adminView,
  setAdminView,
  onExit,
}: {
  role: PanelRole;
  adminView: AdminView;
  setAdminView: (
    view: AdminView,
  ) => void;
  onExit: () => void;
}) {
  const visibleItems =
    NAV_ITEMS.filter((item) =>
      item.roles.includes(role),
    );

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-white px-5 py-8 lg:flex">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
          Casino CampusFood
        </p>

        <h2 className="mt-1 text-lg font-semibold">
          {role === 'admin'
            ? 'Panel administrativo'
            : 'Panel operativo'}
        </h2>
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {visibleItems.map(
          ({
            id,
            label,
            icon: Icon,
          }) => {
            const isActive =
              adminView === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setAdminView(id)
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#4e0611] text-white'
                    : 'text-black/55 hover:bg-black/5'
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            );
          },
        )}
      </nav>

      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-black/45 transition hover:bg-[#f8edef] hover:text-[#4e0611]"
      >
        <LogOut size={17} />
        Cerrar sesión
      </button>
    </aside>
  );
}