export type { Dish, LunchDay, Product } from '@/data';

export type View = 'home' | 'menu' | 'orders' | 'profile';

export type AdminView = 'dashboard' | 'menu' | 'products' | 'orders' | 'votes' | 'users';

export type OrderStatus = 'pendiente' | 'listo' | 'retirado' | 'cancelado';

// Quién canceló o modificó el pedido: el propio cliente o el personal del casino
export type CancelledBy = 'cliente' | 'personal';

export type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

// Registro de cada producto que se quitó de un pedido pendiente
export type OrderAdjustment = {
  at: string;
  by: CancelledBy;
  itemId: number;
  name: string;
  quantity: number;
  reason: string;
};

export type Order = {
  id: string;
  username: string;
  items: OrderItem[];
  subtotal: number;
  status: OrderStatus;
  createdAt: string;
  cancelledAt?: string;
  cancelledBy?: CancelledBy;
  cancelReason?: string;
  retiredAt?: string;
  retiredBy?: string;
  adjustments?: OrderAdjustment[];
};