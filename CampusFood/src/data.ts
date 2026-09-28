import foto1 from '@/assets/images/foto1.jpg';
import foto2 from '@/assets/images/foto2.jpg';
import foto3 from '@/assets/images/foto3.jpg';
import foto4 from '@/assets/images/foto4.jpg';
import foto5 from '@/assets/images/foto5.jpg';
import foto6 from '@/assets/images/foto6.jpg';
import foto7 from '@/assets/images/foto7.jpg';
import foto8 from '@/assets/images/foto8.jpg';
import foto9 from '@/assets/images/foto9.jpg';
import type { StaticImageData } from 'next/image';

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  tone: string;
  image?: string | StaticImageData;
};

export const products: Product[] = [
  { id: 1, name: 'Queque de zanahoria', description: 'Suave, casero y con nueces', price: 2990, category: 'Dulce', tone: 'from-amber-100 to-orange-200', image: foto1 },
  { id: 2, name: 'Galleta con chips', description: 'Recién horneada, 80 g', price: 1990, category: 'Dulce', tone: 'from-yellow-100 to-amber-200', image: foto2 },
  { id: 3, name: 'Coca-Cola Zero', description: 'Lata 350 ml', price: 2490, category: 'Bebidas', tone: 'from-rose-100 to-red-200', image: foto3 },
  { id: 4, name: 'Agua mineral', description: 'Botella 500 ml', price: 1290, category: 'Bebidas', tone: 'from-sky-100 to-cyan-200', image: foto4 },
  { id: 5, name: 'Barra de cereal', description: 'Avena, miel y frutos secos', price: 1690, category: 'Snacks', tone: 'from-lime-100 to-green-200', image: foto5 },
];

// Un plato individual dentro de un día
export type Dish = {
  id: string;
  name: string;
  detail: string;
  color: string;
  image?: string | StaticImageData;
  soldOut?: boolean;
};

// Un día del menú ahora contiene una lista de platos, no uno solo
export type LunchDay = {
  id: string;
  date: string; // fecha ISO, ej. "2026-10-14"
  dishes: Dish[];
};

export const lunchDays: LunchDay[] = [
  {
    id: 'day-1',
    date: '2026-10-14',
    dishes: [
      { id: 'day-1-dish-1', name: 'Pollo al horno', detail: 'Arroz primavera · Ensalada fresca', color: 'bg-amber-100', image: foto6, soldOut: false },
      { id: 'day-1-dish-2', name: 'Sopa de verduras', detail: 'Con crutones y queso rallado', color: 'bg-lime-100', soldOut: false },
      { id: 'day-1-dish-3', name: 'Lasaña de verduras', detail: 'Pan integral · Jugo natural', color: 'bg-emerald-100', image: foto7, soldOut: false },
    ],
  },
  {
    id: 'day-2',
    date: '2026-10-15',
    dishes: [
      { id: 'day-2-dish-1', name: 'Bowl mediterráneo', detail: 'Falafel · Cous cous · Hummus', color: 'bg-sky-100', image: foto8, soldOut: false },
    ],
  },
  {
    id: 'day-3',
    date: '2026-10-16',
    dishes: [
      { id: 'day-3-dish-1', name: 'Pasta bolognesa', detail: 'Parmesano · Ensalada verde', color: 'bg-rose-100', image: foto9, soldOut: false },
    ],
  },
  {
    id: 'day-4',
    date: '2026-10-17',
    dishes: [
      { id: 'day-4-dish-1', name: 'Empanadas de pino', detail: '2 unidades · Ensalada chilena', color: 'bg-orange-100', soldOut: false },
      { id: 'day-4-dish-2', name: 'Cazuela de vacuno', detail: 'Con zapallo, papa y choclo', color: 'bg-yellow-100', soldOut: false },
    ],
  },
];

export const formatPrice = (value: number) => `$${value.toLocaleString('es-CL')}`;

export const getDayLabel = (isoDate: string) => {
  const date = new Date(isoDate + 'T00:00:00');
  const label = date.toLocaleDateString('es-CL', { weekday: 'short' });
  return label.charAt(0).toUpperCase() + label.slice(1, 3);
};

export const getDayNumber = (isoDate: string) => {
  const date = new Date(isoDate + 'T00:00:00');
  return String(date.getDate());
};

export const getFullDateLabel = (isoDate: string) => {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
};