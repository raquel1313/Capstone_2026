import type { StaticImageData } from 'next/image';

export type ProductTheme =
  | 'amber'
  | 'yellow'
  | 'rose'
  | 'sky'
  | 'lime';

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  category: string;
  theme: ProductTheme;
  tone: string;
  image?: string;
  active: boolean;
  // Calculados en App (stock menos lo comprometido en pedidos). No se guardan.
  available?: number;
  soldOut?: boolean;
  // Unidades en pedidos pendientes o listos (de todos los clientes).
  committed?: number;
};

export type Dish = {
  id: string;
  name: string;
  detail: string;
  color: string;
  image?: string | StaticImageData;
  soldOut?: boolean;
};

export type LunchDay = {
  id: string;
  date: string;
  dishes: Dish[];
};

export const formatPrice = (
  value: number,
) =>
  `$${value.toLocaleString('es-CL')}`;

export const getDayLabel = (
  isoDate: string,
) => {
  const date = new Date(
    `${isoDate}T00:00:00`,
  );

  const label =
    date.toLocaleDateString(
      'es-CL',
      {
        weekday: 'short',
      },
    );

  return (
    label.charAt(0).toUpperCase() +
    label.slice(1, 3)
  );
};

export const getDayNumber = (
  isoDate: string,
) => {
  const date = new Date(
    `${isoDate}T00:00:00`,
  );

  return String(date.getDate());
};

export const getFullDateLabel = (
  isoDate: string,
) => {
  const date = new Date(
    `${isoDate}T00:00:00`,
  );

  return date.toLocaleDateString(
    'es-CL',
    {
      day: 'numeric',
      month: 'long',
    },
  );
};