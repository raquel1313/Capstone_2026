export type { Dish, LunchDay, Product } from '@/data';

export type View = 'home' | 'menu' | 'orders' | 'profile';

export type AdminView = 'menu' | 'products' | 'orders' | 'votes' | 'users';

export type OrderStatus = 'pendiente' | 'listo';

export type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  username: string;
  items: OrderItem[];
  subtotal: number;
  status: OrderStatus;
  createdAt: string;
};