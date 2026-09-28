import { LayoutDashboard, LayoutGrid, Package, UtensilsCrossed, Users, Vote } from 'lucide-react';

import type { AdminView } from '@/types';

const NAV_ITEMS: { id: AdminView; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: LayoutGrid },
  { id: 'menu', label: 'Menú', icon: UtensilsCrossed },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'votes', label: 'Votos', icon: Vote },
  { id: 'users', label: 'Usuarios', icon: Users },
];

export function AdminMobileNav({
  adminView,
  setAdminView,
}: {
  adminView: AdminView;
  setAdminView: (view: AdminView) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-between overflow-x-auto border-t border-black/5 bg-white px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = adminView === id;

        return (
          <button
            key={id}
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