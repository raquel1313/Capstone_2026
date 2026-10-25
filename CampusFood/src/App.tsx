'use client';

import { useEffect, useRef, useState } from 'react';

import { LogOut, ShoppingCart } from 'lucide-react';

import { useCart } from '@/hooks/useCart';
import type { CartItem } from '@/hooks/useCart';
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

import { getCommittedByProduct, withAvailability } from '@/utils/orderRules';

import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { HomeView } from '@/views/HomeView';
import { MenuView } from '@/views/MenuView';
import { OrdersView } from '@/views/OrdersView';
import { ProfileView } from '@/views/ProfileView';
import { CartDrawer } from '@/components/CartDrawer';
import { NotificationsBell } from '@/components/NotificationsBell';
import { SplashScreen } from '@/components/SplashScreen';
import { Login } from '@/components/Login';
import { AdminLayout } from '@/components/admin/AdminLayout';

function getTodayLabel() {
  return new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashChecked, setSplashChecked] = useState(false);

  const [view, setView] = useState<View>('home');
  const [showCart, setShowCart] = useState(false);
  const [orderCategory, setOrderCategory] = useState<string | null>(null);

  // Evita descontar dos veces el stock si se hace doble clic en "retirado".
  const retiredOrdersRef = useRef<Set<string>>(new Set());

  const { user, login, logout, error: authError } = useAuth();

  const {
    cart,
    addToCart,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal,
  } = useCart();

  const {
    orders,
    addOrder,
    updateStatus,
    cancelOrder,
    retireOrder,
    removeOrderItem,
  } = useOrders();

  const { getStatus, blockedUsers, liftBlock } = usePenalties(orders);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useOrderNotifications(orders, user?.username ?? null);

  const {
    menu,
    addDay,
    updateDayDate,
    removeDay,
    addDish,
    updateDish,
    removeDish,
    toggleSoldOut,
    resetMenu,
  } = useMenu();

  const {
    products: rawProducts,
    addProduct,
    updateProduct,
    removeProduct,
    adjustStock,
    resetProducts,
  } = useProducts();

  const {
    poll,
    history: pollHistory,
    isOpen: isPollOpen,
    hasVoted,
    createPoll,
    closePoll,
    reopenPoll,
    deletePoll,
    castVote,
  } = useVotes(user?.username ?? null);

  const {
    getCounts: getReactionCounts,
    getUserReaction,
    react,
  } = useReactions();

  // El splash se muestra solo una vez por sesión de pestaña.
  useEffect(() => {
    const splashKey = 'campusfood-splash-shown';

    try {
      const alreadyShown = sessionStorage.getItem(splashKey);

      if (alreadyShown === 'true') {
        setSplashDone(true);
        setShowSplash(false);
        setSplashChecked(true);
        return;
      }

      // Guardar la marca inmediatamente evita que reaparezca al recargar
      // incluso si el usuario recarga antes de terminar la animación.
      sessionStorage.setItem(splashKey, 'true');
      setShowSplash(true);
      setSplashChecked(true);

      const hideTimer = window.setTimeout(() => {
        setSplashDone(true);
      }, 2500);

      const unmountTimer = window.setTimeout(() => {
        setShowSplash(false);
      }, 2900);

      return () => {
        window.clearTimeout(hideTimer);
        window.clearTimeout(unmountTimer);
      };
    } catch {
      // Si sessionStorage no está disponible, la app sigue funcionando
      // y se muestra el splash una vez en esta carga.
      setShowSplash(true);
      setSplashChecked(true);

      const hideTimer = window.setTimeout(() => {
        setSplashDone(true);
      }, 2500);

      const unmountTimer = window.setTimeout(() => {
        setShowSplash(false);
      }, 2900);

      return () => {
        window.clearTimeout(hideTimer);
        window.clearTimeout(unmountTimer);
      };
    }
  }, []);

  if (!splashChecked) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen done={splashDone} />;
  }

  if (!user) {
    return <Login onLogin={login} error={authError} />;
  }

  // Marca el pedido como retirado y recién ahí descuenta el stock.
  const handleRetireOrder = (id: string) => {
    const order = orders.find((candidate) => candidate.id === id);

    if (
      !order ||
      order.status !== 'listo' ||
      retiredOrdersRef.current.has(id)
    ) {
      return;
    }

    retiredOrdersRef.current.add(id);

    retireOrder(id, user.name);

    order.items.forEach((item) => adjustStock(item.id, -item.quantity));
  };

  // Admin y worker comparten el panel; AdminLayout decide qué secciones
  // puede ver cada uno según user.role.
  if (user.role === 'admin' || user.role === 'worker') {
    return (
      <AdminLayout
        user={user}
        onLogout={logout}
        orders={orders}
        updateOrderStatus={updateStatus}
        cancelOrder={cancelOrder}
        retireOrder={handleRetireOrder}
        removeOrderItem={removeOrderItem}
        blockedUsers={blockedUsers}
        liftBlock={liftBlock}
        menu={menu}
        addMenuDay={addDay}
        updateMenuDayDate={updateDayDate}
        removeMenuDay={removeDay}
        addMenuDish={addDish}
        updateMenuDish={updateDish}
        removeMenuDish={removeDish}
        toggleMenuDishSoldOut={toggleSoldOut}
        resetMenu={resetMenu}
        getReactionCounts={getReactionCounts}
        products={rawProducts}
        addProduct={addProduct}
        updateProduct={updateProduct}
        removeProduct={removeProduct}
        resetProducts={resetProducts}
        poll={poll}
        pollHistory={pollHistory}
        isPollOpen={isPollOpen}
        createPoll={createPoll}
        closePoll={closePoll}
        reopenPoll={reopenPoll}
        deletePoll={deletePoll}
      />
    );
  }

  const handleAddOrder = (cartItems: CartItem[], subtotal: number) =>
    addOrder(cartItems, subtotal, user.username);

  // Catálogo que ven los clientes: un producto queda agotado si lo marcaron
  // a mano o si todo su stock ya está comprometido en pedidos sin retirar.
  const committed = getCommittedByProduct(orders);
  const catalog = withAvailability(rawProducts, committed);

  // Unidades disponibles por producto (solo los que llevan control de stock).
  const limits: Record<number, number> = {};

  catalog.forEach((product) => {
    if (typeof product.available === 'number') {
      limits[product.id] = product.available;
    }
  });

  // Productos agotados (el carrito guarda copias, así que se consulta el catálogo actual).
  const soldOutIds = catalog
    .filter((product) => product.soldOut)
    .map((product) => product.id);

  // No deja agregar más unidades de las que hay disponibles.
  const addToCartChecked = (product: Product) => {
    const available = limits[product.id];
    const inCart =
      cart.find((item) => item.id === product.id)?.quantity ?? 0;

    if (available !== undefined && inCart >= available) {
      return;
    }

    addToCart(product);
  };

  const penalty = getStatus(user.username);

  // Cambia de vista; al entrar a Cafetería desde el menú se limpia el filtro.
  const goTo = (next: View) => {
    if (next === 'orders') setOrderCategory(null);
    setView(next);
  };

  // Abre Cafetería, opcionalmente con una categoría ya filtrada.
  const openOrders = (category: string | null = null) => {
    setOrderCategory(category);
    setView('orders');
  };

  return (
    <main className="min-h-screen bg-[#f5f5f3] text-[#252525]">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <Sidebar view={view} setView={goTo} />

        <section className="relative min-w-0 flex-1 pb-24 lg:pb-8">
          <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/40">
                {getTodayLabel()}
              </p>

              <h1
                className="mt-1 text-3xl tracking-tight sm:text-4xl"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Hola, {user.name}{' '}
                <span className="text-[#4e0611]">.</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="grid h-11 w-11 place-items-center rounded-full border border-black/5 bg-white text-black/40 transition hover:border-[#4e0611]/20 hover:text-[#4e0611]"
              >
                <LogOut size={17} />
              </button>

              <NotificationsBell
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                dismissNotification={dismissNotification}
              />

              <button
                onClick={() => setShowCart(true)}
                className="relative grid h-11 w-11 place-items-center rounded-full bg-[#4e0611] text-white transition hover:bg-[#36040c]"
              >
                <ShoppingCart size={18} />

                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-[#4e0611]">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          <div className="px-5 sm:px-8 lg:px-12">
            {view === 'home' && (
              <HomeView
                setView={goTo}
                openOrders={openOrders}
                addToCart={addToCartChecked}
                lunchDays={menu}
                products={catalog}
                poll={poll}
                isPollOpen={isPollOpen}
                hasVoted={hasVoted}
                castVote={castVote}
                getUserReaction={getUserReaction}
                react={react}
              />
            )}

            {view === 'menu' && (
              <MenuView
                lunchDays={menu}
                getReactionCounts={getReactionCounts}
                getUserReaction={getUserReaction}
                react={react}
              />
            )}

            {view === 'orders' && (
              <OrdersView
                products={catalog}
                addToCart={addToCartChecked}
                category={orderCategory}
                setCategory={setOrderCategory}
              />
            )}

            {view === 'profile' && (
              <ProfileView
                user={user}
                orders={orders}
                logout={logout}
                cancelOrder={cancelOrder}
                removeOrderItem={(orderId, itemId, quantity) =>
                  removeOrderItem(
                    orderId,
                    itemId,
                    quantity,
                    'cliente',
                    'Solicitud del cliente'
                  )
                }
                penalty={penalty}
              />
            )}
          </div>

          <BottomNav view={view} setView={goTo} />
        </section>
      </div>

      {showCart && (
        <CartDrawer
          cart={cart}
          subtotal={subtotal}
          close={() => setShowCart(false)}
          updateQuantity={updateQuantity}
          clearCart={clearCart}
          goToOrders={() => {
            setShowCart(false);
            goTo('orders');
          }}
          addOrder={handleAddOrder}
          soldOutIds={soldOutIds}
          limits={limits}
          blockedUntil={penalty.isBlocked ? penalty.blockedUntil : null}
        />
      )}
    </main>
  );
}

export default App;
