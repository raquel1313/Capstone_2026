import { useEffect, useRef, useState } from 'react';

import { Bell, CheckCircle2 } from 'lucide-react';

import type { OrderNotification } from '@/hooks/useOrderNotifications';

import logo from '@/assets/images/logo2.png';

const DISMISS_THRESHOLD = 80; // px que hay que arrastrar para que se descarte

function NotificationRow({
  notification,
  onRead,
  onDismiss,
}: {
  notification: OrderNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const startX = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (event: React.PointerEvent) => {
    startX.current = event.clientX;
    setDragging(true);
    rowRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragging) return;
    setDragX(event.clientX - startX.current);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);

    if (Math.abs(dragX) > DISMISS_THRESHOLD) {
      // Termina de deslizar fuera de la pantalla antes de eliminarla del estado
      setDismissing(true);
      setDragX(dragX > 0 ? 400 : -400);
      setTimeout(() => onDismiss(notification.id), 200);
    } else {
      setDragX(0);
    }
  };

  return (
    <div className="relative overflow-hidden border-b border-black/5 last:border-b-0">
      {/* Fondo rojo que se revela detrás al arrastrar */}
      <div className="absolute inset-0 flex items-center justify-between bg-red-50 px-5 text-red-400">
        <span className="text-xs font-medium">Eliminar</span>
        <span className="text-xs font-medium">Eliminar</span>
      </div>

      <div
        ref={rowRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => {
          // Evita que un simple arrastre dispare el "marcar como leída"
          if (Math.abs(dragX) < 5) onRead(notification.id);
        }}
        className={`relative flex touch-pan-y items-start gap-3 bg-white px-5 py-3.5 text-left transition-colors hover:bg-black/[0.02] ${
          notification.read ? '' : 'bg-[#f8edef]'
        } ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{
          transform: `translateX(${dragX}px)`,
          opacity: dismissing ? 0 : 1,
          cursor: 'grab',
        }}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f8edef] text-[#4e0611]">
          <CheckCircle2 size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm ${notification.read ? 'text-black/60' : 'font-semibold text-black'}`}>
            {notification.message}
          </p>

          <p className="mt-1 text-[11px] text-black/35">
            {new Date(notification.createdAt).toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4e0611]" />}
      </div>
    </div>
  );
}

export function NotificationsBell({
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dark = false,
}: {
  notifications: OrderNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`relative grid h-11 w-11 place-items-center rounded-full transition ${
          dark ? 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white' : 'border border-black/5 bg-white text-black/65'
        }`}
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#4e0611] px-1 text-[9px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-[24px] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
            <p className="text-sm font-semibold text-black">Notificaciones</p>

            {notifications.some((n) => !n.read) && (
              <button onClick={markAllAsRead} className="text-xs font-medium text-[#4e0611]">
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <img src={logo} alt="" className="h-10 w-auto animate-bounce" />

                <p className="mt-3 text-xs text-black/40">No tienes notificaciones todavía.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onDismiss={dismissNotification}
                />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <p className="border-t border-black/5 px-5 py-2.5 text-center text-[10px] text-black/30">
              Desliza una notificación hacia un lado para eliminarla
            </p>
          )}
        </div>
      )}
    </div>
  );
}