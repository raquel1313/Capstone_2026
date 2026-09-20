import { useState } from 'react';

import { LogOut } from 'lucide-react';

import type { AdminView, Dish, LunchDay, Order, OrderStatus } from '@/types';

import type { Product } from '@/data';

import type { VotePoll } from '@/hooks/useVotes';

import { AdminSidebar } from '@/components/admin/AdminSidebar';

import { AdminMobileNav } from '@/components/admin/AdminMobileNav';

import { AdminOrdersView } from '@/views/admin/AdminOrdersView';

import { AdminMenuView } from '@/views/admin/AdminMenuView';

import { AdminProductsView } from '@/views/admin/AdminProductsView';

import { AdminVotesView } from '@/views/admin/AdminVotesView';

import { AdminUsersView } from '@/views/admin/AdminUsersView';

const TITLES: Record<AdminView, string> = {
  orders: 'Pedidos',
  menu: 'Menú semanal',
  products: 'Productos de cafetería',
  votes: 'Votaciones',
  users: 'Usuarios y permisos',
};

export function AdminLayout({
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
  isPollOpen,
  createPoll,
  closePoll,
  reopenPoll,
  deletePoll,
}: {
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
  const [adminView, setAdminView] = useState<AdminView>('orders');

  return (
    <div className="flex min-h-screen bg-[#f8edef]">
      <AdminSidebar
        adminView={adminView}
        setAdminView={setAdminView}
        onExit={onLogout}
      />

      <div className="flex-1 pb-20 lg:pb-0">
        <header className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-5 sm:px-8 lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
              Panel administrativo
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {TITLES[adminView]}
            </h1>
          </div>

          <button
            onClick={onLogout}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#f8edef] text-black/45 transition hover:text-[#4e0611] lg:hidden"
          >
            <LogOut size={17} />
          </button>
        </header>

        <div className="p-5 sm:p-8 lg:p-10">
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

          {adminView === 'votes' && (
            <AdminVotesView
              poll={poll}
              isOpen={isPollOpen}
              createPoll={createPoll}
              closePoll={closePoll}
              reopenPoll={reopenPoll}
              deletePoll={deletePoll}
            />
          )}

          {adminView === 'users' && <AdminUsersView />}
        </div>
      </div>

      <AdminMobileNav
        adminView={adminView}
        setAdminView={setAdminView}
      />
    </div>
  );
}