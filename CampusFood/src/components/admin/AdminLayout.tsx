import { useEffect, useState } from 'react';

import { LogOut } from 'lucide-react';

import type { AdminView, Dish, LunchDay, Order, OrderStatus } from '@/types';

import type { Product } from '@/data';

import type { User } from '@/hooks/useAuth';

import type { VotePoll } from '@/hooks/useVotes';

import { AdminSidebar } from '@/components/admin/AdminSidebar';

import { AdminMobileNav } from '@/components/admin/AdminMobileNav';

import { AdminDashboardView } from '@/views/admin/AdminDashboardView';

import { AdminOrdersView } from '@/views/admin/AdminOrdersView';

import { AdminMenuView } from '@/views/admin/AdminMenuView';

import { AdminProductsView } from '@/views/admin/AdminProductsView';

import { AdminVotesView } from '@/views/admin/AdminVotesView';

import { AdminUsersView } from '@/views/admin/AdminUsersView';

const TITLES: Record<AdminView, string> = {
  dashboard: 'Dashboard',
  orders: 'Pedidos',
  menu: 'Menú semanal',
  products: 'Productos de cafetería',
  votes: 'Votaciones',
  users: 'Usuarios y permisos',
};

// Secciones que solo puede ver el rol admin. El resto (dashboard, orders,
// menu, products) lo comparten admin y worker.
const ADMIN_ONLY_VIEWS: AdminView[] = ['votes', 'users'];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function roleLabel(role: User['role']) {
  return role === 'worker' ? 'Colaborador' : 'Administrador';
}

export function AdminLayout({
  user,
  onLogout,
  orders,
  updateOrderStatus,
  menu,
  addMenuDay,
  updateMenuDayDate,
  removeMenuDay,
  addMenuDish,
  updateMenuDish,
  removeMenuDish,
  toggleMenuDishSoldOut,
  resetMenu,
  getReactionCounts,
  products,
  addProduct,
  updateProduct,
  removeProduct,
  resetProducts,
  poll,
  pollHistory,
  isPollOpen,
  createPoll,
  closePoll,
  reopenPoll,
  deletePoll,
}: {
  user: User;
  onLogout: () => void;
  orders: Order[];
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  menu: LunchDay[];
  addMenuDay: (date: string) => void;
  updateMenuDayDate: (dayId: string, date: string) => void;
  removeMenuDay: (dayId: string) => void;
  addMenuDish: (dayId: string, dish: Omit<Dish, 'id'>) => void;
  updateMenuDish: (
    dayId: string,
    dishId: string,
    updates: Partial<Dish>
  ) => void;
  removeMenuDish: (dayId: string, dishId: string) => void;
  toggleMenuDishSoldOut: (dayId: string, dishId: string) => void;
  resetMenu: () => void;
  getReactionCounts: (dayId: string) => Record<string, number>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  removeProduct: (id: number) => void;
  resetProducts: () => void;
  poll: VotePoll | null;
  pollHistory: VotePoll[];
  isPollOpen: boolean;
  createPoll: (
    question: string,
    options: string[],
    start: string,
    end: string
  ) => void;
  closePoll: () => void;
  reopenPoll: () => void;
  deletePoll: () => void;
}) {
  const [adminView, setAdminView] = useState<AdminView>('dashboard');

  const canSeeView = (view: AdminView) =>
    user.role === 'admin' || !ADMIN_ONLY_VIEWS.includes(view);

  // Si el rol cambia (o alguien queda en una sección que ya no le corresponde),
  // lo devuelve al dashboard en vez de dejarlo en una vista restringida.
  useEffect(() => {
    if (!canSeeView(adminView)) {
      setAdminView('dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role, adminView]);

  return (
    <div className="flex min-h-screen bg-[#f8edef]">
      <AdminSidebar
        adminView={adminView}
        setAdminView={setAdminView}
        role={user.role}
        onExit={onLogout}
      />

      <div className="flex-1 pb-20 lg:pb-0">
        <header className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-5 sm:px-8 lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
              {user.role === 'worker' ? 'Panel de colaborador' : 'Panel administrativo'}
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {TITLES[adminView]}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-medium leading-tight text-black/80">{user.name}</p>
                <p className="text-xs leading-tight text-black/40">{roleLabel(user.role)}</p>
              </div>

              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#4e0611] text-sm font-semibold text-white">
                {getInitials(user.name)}
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="grid h-10 w-10 place-items-center rounded-full bg-[#f8edef] text-black/45 transition hover:text-[#4e0611] lg:hidden"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <div className="p-5 sm:p-8 lg:p-10">
          {adminView === 'dashboard' && (
            <AdminDashboardView
              menu={menu}
              getReactionCounts={getReactionCounts}
              poll={poll}
              isPollOpen={isPollOpen}
              pollHistory={pollHistory}
              orders={orders}
              adminName={user.name}
            />
          )}

          {adminView === 'orders' && (
            <AdminOrdersView
              orders={orders}
              updateStatus={updateOrderStatus}
            />
          )}

          {adminView === 'menu' && (
            <AdminMenuView
              menu={menu}
              addDay={addMenuDay}
              updateDayDate={updateMenuDayDate}
              removeDay={removeMenuDay}
              addDish={addMenuDish}
              updateDish={updateMenuDish}
              removeDish={removeMenuDish}
              toggleSoldOut={toggleMenuDishSoldOut}
              resetMenu={resetMenu}
              getReactionCounts={getReactionCounts}
            />
          )}

          {adminView === 'products' && (
            <AdminProductsView
              products={products}
              addProduct={addProduct}
              updateProduct={updateProduct}
              removeProduct={removeProduct}
              resetProducts={resetProducts}
            />
          )}

          {adminView === 'votes' && user.role === 'admin' && (
            <AdminVotesView
              poll={poll}
              isOpen={isPollOpen}
              createPoll={createPoll}
              closePoll={closePoll}
              reopenPoll={reopenPoll}
              deletePoll={deletePoll}
            />
          )}

          {adminView === 'users' && user.role === 'admin' && <AdminUsersView />}
        </div>
      </div>

      <AdminMobileNav
        adminView={adminView}
        setAdminView={setAdminView}
        role={user.role}
      />
    </div>
  );
}