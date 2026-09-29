'use client';

import { useEffect, useState } from 'react';

import { LogOut, ShoppingCart } from 'lucide-react';

import { useCart } from '@/hooks/useCart';

import type { CartItem } from '@/hooks/useCart';

import { useOrders } from '@/hooks/useOrders';

import { useOrderNotifications } from '@/hooks/useOrderNotifications';

import { useMenu } from '@/hooks/useMenu';

import { useProducts } from '@/hooks/useProducts';

import { useVotes } from '@/hooks/useVotes';

import { useReactions } from '@/hooks/useReactions';

import { useAuth } from '@/hooks/useAuth';

import type { View } from '@/types';

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
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<View>('home');
  const [showCart, setShowCart] = useState(false);
  const [orderCategory, setOrderCategory] = useState<string | null>(null);

  const { user, login, logout } = useAuth();

  const {
    cart,
    addToCart,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal,
  } = useCart();

  const { orders, addOrder, updateStatus } = useOrders();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useOrderNotifications(
    orders,
    user?.username ?? null
  );

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
    products,
    addProduct,
    updateProduct,
    removeProduct,
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

  useEffect(() => {
    const hideTimer = setTimeout(() => setSplashDone(true), 2500);

    const unmountTimer = setTimeout(
      () => setShowSplash(false),
      3400
    );

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (showSplash) {
    return <SplashScreen done={splashDone} />;
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  if (user.role === 'admin') {
    return (
      <AdminLayout
        user={user}
        onLogout={logout}
        orders={orders}
        updateOrderStatus={updateStatus}
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
        products={products}
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

  const handleAddOrder = (
    cartItems: CartItem[],
    subtotal: number
  ) => addOrder(cartItems, subtotal, user.username);

  // Productos que se agotaron (el carrito guarda copias, así que se consulta el catálogo actual)
  const soldOutIds = products
    .filter((product) => product.soldOut)
    .map((product) => product.id);

  // Cambia de vista; al entrar a Cafetería desde el menú se limpia el filtro
  const goTo = (next: View) => {
    if (next === 'orders') setOrderCategory(null);
    setView(next);
  };

  // Abre Cafetería, opcionalmente con una categoría ya filtrada
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
                addToCart={addToCart}
                lunchDays={menu}
                products={products}
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
                products={products}
                addToCart={addToCart}
                category={orderCategory}
                setCategory={setOrderCategory}
              />
            )}

            {view === 'profile' && <ProfileView user={user} orders={orders} logout={logout} />}
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
        />
      )}
    </main>
  );
}

export default App;