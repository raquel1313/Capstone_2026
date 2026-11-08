'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  LogOut,
  ShoppingCart,
} from 'lucide-react';

import {
  useCart,
  type CartItem,
} from '@/hooks/useCart';

import { useOrders } from '@/hooks/useOrders';
import { usePenalties } from '@/hooks/usePenalties';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { useMenu } from '@/hooks/useMenu';
import { useProducts } from '@/hooks/useProducts';
import { useVotes } from '@/hooks/useVotes';
import { useReactions } from '@/hooks/useReactions';
import { useAuth } from '@/hooks/useAuth';

import type { Product } from '@/data';
import type { View } from '@/types';

import { withAvailability } from '@/utils/orderRules';

import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { CartDrawer } from '@/components/CartDrawer';
import { NotificationsBell } from '@/components/NotificationsBell';
import { SplashScreen } from '@/components/SplashScreen';
import { Login } from '@/components/Login';
import { ErrorToast } from '@/components/ErrorToast';
import { AdminLayout } from '@/components/admin/AdminLayout';

import { HomeView } from '@/views/HomeView';
import { MenuView } from '@/views/MenuView';
import { OrdersView } from '@/views/OrdersView';
import { ProfileView } from '@/views/ProfileView';

function getTodayLabel(): string {
  return new Date().toLocaleDateString(
    'es-CL',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
  );
}

function App() {
  const [
    splashDone,
    setSplashDone,
  ] = useState(false);

  const [
    showSplash,
    setShowSplash,
  ] = useState(false);

  const [
    splashChecked,
    setSplashChecked,
  ] = useState(false);

  const [
    view,
    setView,
  ] = useState<View>('home');

  const [
    showCart,
    setShowCart,
  ] = useState(false);

  const [
    orderCategory,
    setOrderCategory,
  ] = useState<
    string | null
  >(null);

  const {
    user,
    login,
    logout,
    loading,
  } = useAuth();

  const {
    products,
  } = useProducts();

  const {
    cart,
    addToCart,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal,
  } = useCart(
    products,
    user?.id ?? null,
  );

  const {
    orders,
    error: ordersError,
    clearError: clearOrdersError,
    addOrder,
    updateStatus,
    cancelOrder,
    retireOrder,
    removeOrderItem,
  } = useOrders(
    Boolean(user),
  );

  const {
    getStatus,
    blockedUsers,
    liftBlock,
  } = usePenalties(
    user?.id ?? null,
    orders,
  );

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } =
    useOrderNotifications(
      user?.id ?? null,
    );

  const {
    menu,
    error: menuError,
    clearError: clearMenuError,
    addDay,
    updateDayDate,
    removeDay,
    addDish,
    updateDish,
    removeDish,
    toggleSoldOut,
    resetMenu,
  } = useMenu(
    user?.id ?? null,
  );

  const {
    poll,
    history:
      pollHistory,
    isOpen:
      isPollOpen,
    hasVoted,
    error: votesError,
    clearError: clearVotesError,
    createPoll,
    closePoll,
    reopenPoll,
    deletePoll,
    castVote,
  } = useVotes(
    user?.id ?? null,
  );

  const {
    getCounts:
      getReactionCounts,
    getUserReaction,
    react,
  } = useReactions(
    user?.id ?? null,
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // La decisión se difiere un ciclo para no llamar setState de forma
    // síncrona dentro del efecto (sessionStorage solo existe en el cliente).
    timers.push(
      setTimeout(() => {
        let alreadyShown = false;

        try {
          alreadyShown =
            sessionStorage.getItem('campusfood-splash-shown') === 'true';

          if (!alreadyShown) {
            sessionStorage.setItem('campusfood-splash-shown', 'true');
          }
        } catch {
          alreadyShown = false;
        }

        setSplashChecked(true);

        if (alreadyShown) {
          return;
        }

        setShowSplash(true);
        timers.push(setTimeout(() => setSplashDone(true), 2500));
        timers.push(setTimeout(() => setShowSplash(false), 2900));
      }, 0),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const toastMessage =
    ordersError ??
    menuError ??
    votesError;

  const clearToast = () => {
    clearOrdersError();
    clearMenuError();
    clearVotesError();
  };

  if (
    !splashChecked
  ) {
    return null;
  }

  if (showSplash) {
    return (
      <SplashScreen
        done={
          splashDone
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#4e0611]">
        <p className="text-sm text-white/80">
          Cargando...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <Login
        onLogin={
          login
        }
      />
    );
  }

  // Unidades comprometidas de todos los clientes (las entrega el servidor).
  // Un estudiante solo ve sus propios pedidos, así que no se calculan desde `orders`.
  const committed: Record<number, number> = {};

  products.forEach((product) => {
    committed[product.id] =
      product.committed ?? 0;
  });

  const catalog =
    withAvailability(
      products,
      committed,
    );

  const limits: Record<
    number,
    number
  > = {};

  products.forEach(
    (product) => {
      const committedUnits =
        committed[
          product.id
        ] ?? 0;

      limits[
        product.id
      ] = Math.max(
        0,
        product.stock -
          committedUnits,
      );
    },
  );

  const soldOutIds =
    catalog
      .filter(
        (product) =>
          product.soldOut,
      )
      .map(
        (product) =>
          product.id,
      );

  const addToCartChecked =
    (
      product: Product,
    ) => {
      const available =
        limits[
          product.id
        ];

      const inCart =
        cart.find(
          (item) =>
            item.id ===
            product.id,
        )?.quantity ??
        0;

      if (
        available !==
          undefined &&
        inCart >=
          available
      ) {
        return;
      }

      addToCart(
        product,
      );
    };

  const penalty =
    getStatus();

  const handleRetireOrder =
    (
      id: string,
    ): void => {
      const order =
        orders.find(
          (
            candidate,
          ) =>
            candidate.id ===
            id,
        );

      if (
        !order ||
        order.status !==
          'listo'
      ) {
        return;
      }

      void retireOrder(id);
    };

  if (
    user.role ===
      'admin' ||
    user.role ===
      'worker'
  ) {
    return (
      <>
      <AdminLayout
        role={
          user.role
        }
        user={user}
        onLogout={
          logout
        }
        orders={
          orders
        }
        updateOrderStatus={
          updateStatus
        }
        cancelOrder={
          cancelOrder
        }
        retireOrder={
          handleRetireOrder
        }
        removeOrderItem={
          removeOrderItem
        }
        blockedUsers={
          blockedUsers
        }
        liftBlock={
          liftBlock
        }
        menu={menu}
        addMenuDay={
          addDay
        }
        updateMenuDayDate={
          updateDayDate
        }
        removeMenuDay={
          removeDay
        }
        addMenuDish={
          addDish
        }
        updateMenuDish={
          updateDish
        }
        removeMenuDish={
          removeDish
        }
        toggleMenuDishSoldOut={
          toggleSoldOut
        }
        resetMenu={
          resetMenu
        }
        getReactionCounts={
          getReactionCounts
        }
        products={
          products
        }
        poll={poll}
        pollHistory={
          pollHistory
        }
        isPollOpen={
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
      <ErrorToast
        message={toastMessage}
        onClose={clearToast}
      />
      </>
    );
  }

  const handleAddOrder =
    (
      cartItems:
        CartItem[],
    ) =>
      addOrder(
        cartItems,
      );

  const goTo = (
    next: View,
  ) => {
    if (
      next ===
      'orders'
    ) {
      setOrderCategory(
        null,
      );
    }

    setView(next);
  };

  const openOrders =
    (
      category:
        | string
        | null = null,
    ) => {
      setOrderCategory(
        category,
      );

      setView(
        'orders',
      );
    };

  return (
    <main className="min-h-screen bg-[#f5f5f3] text-[#252525]">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <Sidebar
          view={view}
          setView={
            goTo
          }
        />

        <section className="relative min-w-0 flex-1 pb-24 lg:pb-8">
          <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/40">
                {getTodayLabel()}
              </p>

              <h1
                className="mt-1 text-3xl tracking-tight sm:text-4xl"
                style={{
                  fontFamily:
                    "'Fraunces', serif",
                }}
              >
                Hola,{' '}
                {
                  user.name
                }{' '}

                <span className="text-[#4e0611]">
                  .
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={
                  logout
                }
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="grid h-11 w-11 place-items-center rounded-full border border-black/5 bg-white text-black/40 transition hover:border-[#4e0611]/20 hover:text-[#4e0611]"
              >
                <LogOut
                  size={
                    17
                  }
                />
              </button>

              <NotificationsBell
                notifications={
                  notifications
                }
                unreadCount={
                  unreadCount
                }
                markAsRead={
                  markAsRead
                }
                markAllAsRead={
                  markAllAsRead
                }
                dismissNotification={
                  dismissNotification
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowCart(
                    true,
                  )
                }
                aria-label="Abrir carrito"
                className="relative grid h-11 w-11 place-items-center rounded-full bg-[#4e0611] text-white transition hover:bg-[#36040c]"
              >
                <ShoppingCart
                  size={
                    18
                  }
                />

                {cartCount >
                  0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-[#4e0611]">
                    {
                      cartCount
                    }
                  </span>
                )}
              </button>
            </div>
          </header>

          <div className="px-5 sm:px-8 lg:px-12">
            {view ===
              'home' && (
              <HomeView
                setView={
                  goTo
                }
                openOrders={
                  openOrders
                }
                addToCart={
                  addToCartChecked
                }
                lunchDays={
                  menu
                }
                products={
                  catalog
                }
                poll={
                  poll
                }
                isPollOpen={
                  isPollOpen
                }
                hasVoted={
                  hasVoted
                }
                castVote={
                  castVote
                }
                getUserReaction={
                  getUserReaction
                }
                react={
                  react
                }
              />
            )}

            {view ===
              'menu' && (
              <MenuView
                lunchDays={
                  menu
                }
                getReactionCounts={
                  getReactionCounts
                }
                getUserReaction={
                  getUserReaction
                }
                react={
                  react
                }
              />
            )}

            {view ===
              'orders' && (
              <OrdersView
                products={
                  catalog
                }
                addToCart={
                  addToCartChecked
                }
                category={
                  orderCategory
                }
                setCategory={
                  setOrderCategory
                }
              />
            )}

            {view ===
              'profile' && (
              <ProfileView
                user={
                  user
                }
                orders={
                  orders
                }
                logout={
                  logout
                }
                cancelOrder={
                  cancelOrder
                }
                removeOrderItem={(
                  orderId,
                  itemId,
                  quantity,
                ) =>
                  removeOrderItem(
                    orderId,
                    itemId,
                    quantity,
                    'cliente',
                    'Solicitud del cliente',
                  )
                }
                penalty={
                  penalty
                }
              />
            )}
          </div>

          <BottomNav
            view={view}
            setView={
              goTo
            }
          />
        </section>
      </div>

      <ErrorToast
        message={toastMessage}
        onClose={clearToast}
      />

      {showCart && (
        <CartDrawer
          cart={cart}
          subtotal={
            subtotal
          }
          close={() =>
            setShowCart(
              false,
            )
          }
          updateQuantity={
            updateQuantity
          }
          clearCart={
            clearCart
          }
          goToOrders={() => {
            setShowCart(
              false,
            );

            goTo(
              'orders',
            );
          }}
          addOrder={
            handleAddOrder
          }
          soldOutIds={
            soldOutIds
          }
          limits={
            limits
          }
          blockedUntil={
            penalty.isBlocked
              ? penalty.blockedUntil
              : null
          }
        />
      )}
    </main>
  );
}

export default App;