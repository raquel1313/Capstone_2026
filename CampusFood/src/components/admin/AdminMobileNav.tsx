import {
  Boxes,
  LayoutDashboard,
  LayoutGrid,
  Package,
  UtensilsCrossed,
  Users,
  Vote,
} from 'lucide-react';

import type { AdminView } from '@/types';

type PanelRole = 'admin' | 'worker';

type NavItem = {
  id: AdminView;
  label: string;
  icon: typeof LayoutGrid;
  roles: readonly PanelRole[];
};

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard, roles: ['admin', 'worker'] },
  { id: 'orders', label: 'Pedidos', icon: LayoutGrid, roles: ['admin', 'worker'] },
  { id: 'menu', label: 'Menú', icon: UtensilsCrossed, roles: ['admin', 'worker'] },
  { id: 'products', label: 'Productos', icon: Package, roles: ['admin'] },
  { id: 'stock', label: 'Stock', icon: Boxes, roles: ['admin', 'worker'] },
  { id: 'votes', label: 'Votos', icon: Vote, roles: ['admin'] },
  { id: 'users', label: 'Usuarios', icon: Users, roles: ['admin'] },
];

export function AdminMobileNav({
  role,
  adminView,
  setAdminView,
}: {
  role: PanelRole;
  adminView: AdminView;
  setAdminView: (view: AdminView) => void;
}) {
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-between overflow-x-auto border-t border-black/5 bg-white px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
      {visibleItems.map(({ id, label, icon: Icon }) => {
        const isActive = adminView === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => setAdminView(id)}
            className={`flex flex-1 shrink-0 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
              isActive ? 'text-[#4e0611]' : 'text-black/40'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}