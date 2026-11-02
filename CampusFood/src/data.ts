import foto6 from '@/assets/images/foto6.jpg';
import foto7 from '@/assets/images/foto7.jpg';
import foto8 from '@/assets/images/foto8.jpg';
import foto9 from '@/assets/images/foto9.jpg';

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

export const lunchDays: LunchDay[] = [
  {
    id: 'day-1',
    date: '2026-10-14',
    dishes: [
      {
        id: 'day-1-dish-1',
        name: 'Pollo al horno',
        detail:
          'Arroz primavera · Ensalada fresca',
        color: 'bg-amber-100',
        image: foto6,
        soldOut: false,
      },
      {
        id: 'day-1-dish-2',
        name: 'Sopa de verduras',
        detail:
          'Con crutones y queso rallado',
        color: 'bg-lime-100',
        soldOut: false,
      },
      {
        id: 'day-1-dish-3',
        name: 'Lasaña de verduras',
        detail:
          'Pan integral · Jugo natural',
        color: 'bg-emerald-100',
        image: foto7,
        soldOut: false,
      },
    ],
  },
  {
    id: 'day-2',
    date: '2026-10-15',
    dishes: [
      {
        id: 'day-2-dish-1',
        name: 'Bowl mediterráneo',
        detail:
          'Falafel · Cous cous · Hummus',
        color: 'bg-sky-100',
        image: foto8,
        soldOut: false,
      },
    ],
  },
  {
    id: 'day-3',
    date: '2026-10-16',
    dishes: [
      {
        id: 'day-3-dish-1',
        name: 'Pasta bolognesa',
        detail:
          'Parmesano · Ensalada verde',
        color: 'bg-rose-100',
        image: foto9,
        soldOut: false,
      },
    ],
  },
  {
    id: 'day-4',
    date: '2026-10-17',
    dishes: [
      {
        id: 'day-4-dish-1',
        name: 'Empanadas de pino',
        detail:
          '2 unidades · Ensalada chilena',
        color: 'bg-orange-100',
        soldOut: false,
      },
      {
        id: 'day-4-dish-2',
        name: 'Cazuela de vacuno',
        detail:
          'Con zapallo, papa y choclo',
        color: 'bg-yellow-100',
        soldOut: false,
      },
    ],
  },
];

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