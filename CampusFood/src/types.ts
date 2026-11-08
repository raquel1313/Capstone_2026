export type {
  Dish,
  LunchDay,
  Product,
} from '@/data';

export type View =
  | 'home'
  | 'menu'
  | 'orders'
  | 'profile';

export type AdminView =
  | 'dashboard'
  | 'orders'
  | 'menu'
  | 'products'
  | 'stock'
  | 'votes'
  | 'users';

export type OrderStatus =
  | 'pendiente'
  | 'listo'
  | 'retirado'
  | 'cancelado';

/*
 * Indica quién realizó una
 * cancelación o modificación
 * sobre un pedido.
 */
export type CancelledBy =
  | 'cliente'
  | 'personal';

export type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

/*
 * Registro de productos retirados
 * de un pedido pendiente.
 */
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

  // Pago presencial registrado al retirar.
  payment?: {
    amount: number;
    method: string;
    at: string;
  };
};

export type OrderNotification = {
  id: string;
  // Código de retiro del pedido al que se refiere el aviso.
  orderId: string;
  kind: 'ready' | 'cancelled' | 'adjusted';
  message: string;
  read: boolean;
  createdAt: string;
};
