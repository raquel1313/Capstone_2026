import { useState } from 'react';

import { LogOut } from 'lucide-react';

import type {
  AdminView,
  CancelledBy,
  Dish,
  LunchDay,
  Order,
  OrderStatus,
} from '@/types';

import type { Product } from '@/data';

import type { User } from '@/hooks/useAuth';
import type { BlockedUser } from '@/hooks/usePenalties';
import type { VotePoll } from '@/hooks/useVotes';

import {
  getCommittedByProduct,
  getShortageIds,
} from '@/utils/orderRules';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';

import { AdminDashboardView } from '@/views/admin/AdminDashboardView';
import { AdminOrdersView } from '@/views/admin/AdminOrdersView';
import { AdminMenuView } from '@/views/admin/AdminMenuView';
import { AdminProductsView } from '@/views/admin/AdminProductsView';
import { AdminStockView } from '@/views/admin/AdminStockView';
import { AdminVotesView } from '@/views/admin/AdminVotesView';
import { AdminUsersView } from '@/views/admin/AdminUsersView';

type PanelRole = Extract<
  User['role'],
  'admin' | 'worker'
>;

type PanelUser = Pick<
  User,
  'id' | 'username' | 'name'
>;

const TITLES: Record<
  AdminView,
  string
> = {
  dashboard: 'Dashboard',
  orders: 'Pedidos',
  menu: 'Menú semanal',
  products:
    'Productos de cafetería',
  stock: 'Inventario',
  votes: 'Votaciones',
  users:
    'Usuarios y permisos',
};

const VIEWS_BY_ROLE: Record<
  PanelRole,
  readonly AdminView[]
> = {
  admin: [
    'dashboard',
    'orders',
    'menu',
    'products',
    'stock',
    'votes',
    'users',
  ],

  worker: [
    'orders',
    'menu',
    'stock',
  ],
};

type AdminLayoutProps = {
  role: PanelRole;
  user: PanelUser;

  onLogout: () => void;

  orders: Order[];

  updateOrderStatus: (
    id: string,
    status: OrderStatus,
  ) => void;

  cancelOrder: (
    id: string,
    by: CancelledBy,
    reason: string,
  ) => void;

  retireOrder: (
    id: string,
  ) => void;

  removeOrderItem: (
    orderId: string,
    itemId: number,
    quantity: number,
    by: CancelledBy,
    reason: string,
  ) => void;

  blockedUsers: BlockedUser[];

  liftBlock: (
    username: string,
  ) => void;

  menu: LunchDay[];

  addMenuDay: (
    date: string,
  ) => void;

  updateMenuDayDate: (
    dayId: string,
    date: string,
  ) => void;

  removeMenuDay: (
    dayId: string,
  ) => void;

  addMenuDish: (
    dayId: string,
    dish: Omit<
      Dish,
      'id'
    >,
  ) => void;

  updateMenuDish: (
    dayId: string,
    dishId: string,
    updates: Partial<Dish>,
  ) => void;

  removeMenuDish: (
    dayId: string,
    dishId: string,
  ) => void;

  toggleMenuDishSoldOut: (
    dayId: string,
    dishId: string,
  ) => void;

  resetMenu: () => void;

  getReactionCounts: (
    dayId: string,
  ) => Record<
    string,
    number
  >;

  /*
   * Products se mantiene aquí porque
   * las reglas de pedidos de main
   * calculan productos con stock
   * insuficiente.
   *
   * AdminProductsView ya administra
   * productos mediante su propia API.
   */
  products: Product[];

  poll: VotePoll | null;

  pollHistory: VotePoll[];

  isPollOpen: boolean;

  createPoll: (
    question: string,
    options: string[],
    start: string,
    end: string,
  ) => void;

  closePoll: () => void;

  reopenPoll: () => void;

  deletePoll: () => void;
};

function getInitials(
  name: string,
): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
          ?.toUpperCase() ??
        '',
    )
    .join('');
}

function roleLabel(
  role: PanelRole,
): string {
  return role === 'admin'
    ? 'Administrador'
    : 'Personal Casino';
}

export function AdminLayout({
  role,
  user,
  onLogout,

  orders,
  updateOrderStatus,
  cancelOrder,
  retireOrder,
  removeOrderItem,
  blockedUsers,
  liftBlock,

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

  poll,
  pollHistory,
  isPollOpen,
  createPoll,
  closePoll,
  reopenPoll,
  deletePoll,
}: AdminLayoutProps) {
  /*
   * Admin inicia en Dashboard.
   * Worker inicia directamente
   * en Pedidos.
   */
  const [
    adminView,
    setAdminView,
  ] =
    useState<AdminView>(
      role === 'admin'
        ? 'dashboard'
        : 'orders',
    );

  const allowedViews =
    VIEWS_BY_ROLE[role];

  /*
   * Defensa adicional de UI:
   *
   * aunque se intente establecer
   * manualmente una vista que no
   * corresponde al rol, no se
   * renderizará.
   *
   * La autorización definitiva
   * sigue estando en el backend.
   */
  const currentView =
    allowedViews.includes(
      adminView,
    )
      ? adminView
      : role === 'admin'
        ? 'dashboard'
        : 'orders';

  /*
   * Funcionalidad incorporada desde
   * main para detectar unidades
   * comprometidas en pedidos todavía
   * no retirados.
   */
  const committedByProduct =
    getCommittedByProduct(
      orders,
    );

  const shortageProductIds =
    getShortageIds(
      products,
      committedByProduct,
    );

  return (
    <div className="flex min-h-screen bg-[#f8edef]">
      <AdminSidebar
        role={role}
        adminView={
          currentView
        }
        setAdminView={
          setAdminView
        }
        onExit={onLogout}
      />

      <div className="flex-1 pb-20 lg:pb-0">
        <header className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-5 sm:px-8 lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
              {role ===
              'admin'
                ? 'Panel administrativo'
                : 'Panel operativo'}
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {
                TITLES[
                  currentView
                ]
              }
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-medium leading-tight text-black/80">
                  {user.name}
                </p>

                <p className="text-xs leading-tight text-black/40">
                  {roleLabel(
                    role,
                  )}
                </p>
              </div>

              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#4e0611] text-sm font-semibold text-white">
                {getInitials(
                  user.name,
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={
                onLogout
              }
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="grid h-10 w-10 place-items-center rounded-full bg-[#f8edef] text-black/45 transition hover:text-[#4e0611] lg:hidden"
            >
              <LogOut
                size={17}
              />
            </button>
          </div>
        </header>

        <div className="p-5 sm:p-8 lg:p-10">
          {role ===
            'admin' &&
            currentView ===
              'dashboard' && (
              <AdminDashboardView
                menu={
                  menu
                }
                getReactionCounts={
                  getReactionCounts
                }
                poll={
                  poll
                }
                isPollOpen={
                  isPollOpen
                }
                pollHistory={
                  pollHistory
                }
                orders={
                  orders
                }
                adminName={
                  user.name
                }
              />
            )}

          {currentView ===
            'orders' && (
            <AdminOrdersView
              orders={
                orders
              }
              updateStatus={
                updateOrderStatus
              }
              cancelOrder={
                cancelOrder
              }
              retireOrder={
                retireOrder
              }
              removeOrderItem={
                removeOrderItem
              }
              shortageProductIds={
                shortageProductIds
              }
              blockedUsers={
                blockedUsers
              }
              liftBlock={
                liftBlock
              }
            />
          )}

          {currentView ===
            'menu' && (
            <AdminMenuView
              menu={menu}
              addDay={
                addMenuDay
              }
              updateDayDate={
                updateMenuDayDate
              }
              removeDay={
                removeMenuDay
              }
              addDish={
                addMenuDish
              }
              updateDish={
                updateMenuDish
              }
              removeDish={
                removeMenuDish
              }
              toggleSoldOut={
                toggleMenuDishSoldOut
              }
              resetMenu={
                resetMenu
              }
              getReactionCounts={
                getReactionCounts
              }
            />
          )}

          {role ===
            'admin' &&
            currentView ===
              'products' && (
              <AdminProductsView />
            )}

          {currentView ===
            'stock' && (
            <AdminStockView />
          )}

          {role ===
            'admin' &&
            currentView ===
              'votes' && (
              <AdminVotesView
                poll={
                  poll
                }
                pollHistory={
                  pollHistory
                }
                isOpen={
                  isPollOpen
                }
                createPoll={
                  createPoll
                }
                closePoll={
                  closePoll
                }
                reopenPoll={
                  reopenPoll
                }
                deletePoll={
                  deletePoll
                }
              />
            )}

          {role ===
            'admin' &&
            currentView ===
              'users' && (
              <AdminUsersView />
            )}
        </div>
      </div>

      <AdminMobileNav
        role={role}
        adminView={
          currentView
        }
        setAdminView={
          setAdminView
        }
      />
    </div>
  );
}