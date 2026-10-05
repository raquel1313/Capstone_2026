import { LayoutDashboard, LayoutGrid, LogOut, Package, UtensilsCrossed, Users, Vote } from 'lucide-react';

import type { Role } from '@/hooks/useAuth';
import type { AdminView } from '@/types';

const NAV_ITEMS: { id: AdminView; label: string; icon: typeof LayoutGrid; adminOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: LayoutGrid },
  { id: 'menu', label: 'Menú semanal', icon: UtensilsCrossed },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'votes', label: 'Votaciones', icon: Vote, adminOnly: true },
  { id: 'users', label: 'Usuarios', icon: Users, adminOnly: true },
];

export function AdminSidebar({
  adminView,
  setAdminView,
  role,
  onExit,
}: {
  adminView: AdminView;
  setAdminView: (view: AdminView) => void;
  role: Role;
  onExit: () => void;
}) {
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin');
  const panelLabel = role === 'worker' ? 'Panel de colaborador' : 'Panel administrativo';

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-white px-5 py-8 lg:flex">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
          Casino CampusFood
        </p>

        <h2 className="mt-1 text-lg font-semibold">
          {panelLabel}
        </h2>
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = adminView === id;

          return (
            <button
              key={id}
              onClick={() => setAdminView(id)}
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
        })}
      </nav>

      <button
        onClick={onExit}
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-black/45 transition hover:bg-[#f8edef] hover:text-[#4e0611]"
      >
        <LogOut size={17} />
        Cerrar sesión
      </button>
    </aside>
  );
}