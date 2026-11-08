import { Prisma } from '../../../generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ServiceError } from '@/lib/services/errors';
import type { Dish, LunchDay } from '@/data';

/*
 * El menú se guarda como: Plato (catálogo reutilizable) + OfertaMenu (el plato
 * ofrecido un día concreto, dentro de un MenuSemanal lunes-domingo).
 * La interfaz sigue trabajando con LunchDay/Dish: el id del plato en pantalla
 * es el id de la oferta y el id del día es "day-YYYY-MM-DD".
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_PATTERN = /^bg-[a-z]+-\d{2,3}$/;
const DEFAULT_COLOR = 'bg-amber-100';
const DAY_MS = 24 * 60 * 60 * 1000;
const MENU_LIMIT = 800;

export type DishInput = {
  date: string;
  name: string;
  detail: string;
  color: string;
  image?: string;
  soldOut?: boolean;
};

export type DishUpdate = {
  name?: string;
  detail?: string;
  color?: string;
  image?: string;
  soldOut?: boolean;
};

export function parseDate(value: unknown): Date {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new ServiceError(400, 'INVALID_DATE', 'La fecha debe tener formato AAAA-MM-DD.');
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ServiceError(400, 'INVALID_DATE', 'La fecha no es válida.');
  }

  return date;
}

const toIso = (date: Date) => date.toISOString().slice(0, 10);

function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';

  if (name.length === 0 || name.length > 150) {
    throw new ServiceError(400, 'INVALID_NAME', 'El nombre del plato es obligatorio (máximo 150 caracteres).');
  }

  return name;
}

function cleanDetail(value: unknown): string {
  const detail = typeof value === 'string' ? value.trim() : '';

  if (detail.length > 500) {
    throw new ServiceError(400, 'INVALID_DETAIL', 'El detalle es demasiado largo.');
  }

  return detail;
}

function cleanColor(value: unknown): string {
  return typeof value === 'string' && COLOR_PATTERN.test(value) ? value : DEFAULT_COLOR;
}

function cleanImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const image = value.trim();

  if (image.length > 2000 || !(/^https?:\/\//i.test(image) || image.startsWith('/'))) {
    throw new ServiceError(400, 'INVALID_IMAGE', 'La imagen debe ser una URL http(s) o una ruta del sitio.');
  }

  return image;
}

/** Lunes a domingo (UTC, las fechas de menú no llevan hora) de la semana de `date`. */
function weekRange(date: Date): { start: Date; end: Date } {
  const offset = (date.getUTCDay() + 6) % 7;
  const start = new Date(date.getTime() - offset * DAY_MS);

  return { start, end: new Date(start.getTime() + 6 * DAY_MS) };
}

async function ensureWeeklyMenu(tx: Prisma.TransactionClient, date: Date, userId: string) {
  const { start, end } = weekRange(date);

  const menu = await tx.menuSemanal.upsert({
    where: { fechaInicio_fechaFin: { fechaInicio: start, fechaFin: end } },
    update: {},
    create: {
      idCreador: userId,
      fechaInicio: start,
      fechaFin: end,
      estado: 'PUBLICADO',
    },
    select: { idMenu: true },
  });

  return menu.idMenu;
}

async function findOrCreatePlato(
  tx: Prisma.TransactionClient,
  data: { name: string; detail: string; color: string; image: string | null },
) {
  const existing = await tx.plato.findFirst({
    where: { nombre: { equals: data.name, mode: 'insensitive' }, activo: true },
    select: { idPlato: true },
  });

  const values = {
    descripcion: data.detail || null,
    temaVisual: data.color,
    imagenUrl: data.image,
  };

  if (existing) {
    await tx.plato.update({ where: { idPlato: existing.idPlato }, data: values });

    return existing.idPlato;
  }

  const created = await tx.plato.create({
    data: { nombre: data.name, ...values },
    select: { idPlato: true },
  });

  return created.idPlato;
}

const offerSelect = {
  idOferta: true,
  fecha: true,
  disponible: true,
  plato: {
    select: { nombre: true, descripcion: true, temaVisual: true, imagenUrl: true },
  },
} satisfies Prisma.OfertaMenuSelect;

type OfferRow = Prisma.OfertaMenuGetPayload<{ select: typeof offerSelect }>;

function toDish(row: OfferRow): Dish {
  return {
    id: String(row.idOferta),
    name: row.plato.nombre,
    detail: row.plato.descripcion ?? '',
    color: COLOR_PATTERN.test(row.plato.temaVisual) ? row.plato.temaVisual : DEFAULT_COLOR,
    image: row.plato.imagenUrl ?? undefined,
    soldOut: !row.disponible,
  };
}

export async function getMenu(): Promise<LunchDay[]> {
  const rows = await prisma.ofertaMenu.findMany({
    select: offerSelect,
    orderBy: [{ fecha: 'asc' }, { orden: 'asc' }, { idOferta: 'asc' }],
    take: MENU_LIMIT,
  });

  const days = new Map<string, LunchDay>();

  for (const row of rows) {
    const date = toIso(row.fecha);
    const day = days.get(date) ?? { id: `day-${date}`, date, dishes: [] };

    day.dishes.push(toDish(row));
    days.set(date, day);
  }

  return [...days.values()];
}

function parseOfferId(value: unknown): number {
  const id = typeof value === 'string' ? Number(value) : value;

  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new ServiceError(400, 'INVALID_ID', 'Identificador de plato inválido.');
  }

  return id;
}

export async function addDish(userId: string, input: DishInput): Promise<void> {
  const date = parseDate(input.date);
  const name = cleanName(input.name);
  const detail = cleanDetail(input.detail);
  const color = cleanColor(input.color);
  const image = cleanImage(input.image);

  try {
    await prisma.$transaction(async (tx) => {
      const idMenu = await ensureWeeklyMenu(tx, date, userId);
      const idPlato = await findOrCreatePlato(tx, { name, detail, color, image });
      const last = await tx.ofertaMenu.aggregate({
        where: { idMenu, fecha: date },
        _max: { orden: true },
      });

      await tx.ofertaMenu.create({
        data: {
          idMenu,
          idPlato,
          fecha: date,
          // El menú es de consulta: el precio no se muestra ni se cobra.
          precio: 0,
          disponible: !input.soldOut,
          orden: (last._max.orden ?? -1) + 1,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ServiceError(409, 'DUPLICATE_DISH', 'Ese plato ya está en el menú de ese día.');
    }

    throw error;
  }
}

export async function updateDish(userId: string, rawId: unknown, updates: DishUpdate): Promise<void> {
  const id = parseOfferId(rawId);

  try {
    await prisma.$transaction(async (tx) => {
      const offer = await tx.ofertaMenu.findUnique({
        where: { idOferta: id },
        select: {
          idPlato: true,
          plato: { select: { nombre: true, descripcion: true, temaVisual: true, imagenUrl: true } },
        },
      });

      if (!offer) {
        throw new ServiceError(404, 'DISH_NOT_FOUND', 'El plato no existe.');
      }

      const name = updates.name === undefined ? offer.plato.nombre : cleanName(updates.name);
      const detail =
        updates.detail === undefined ? offer.plato.descripcion ?? '' : cleanDetail(updates.detail);
      const color = updates.color === undefined ? offer.plato.temaVisual : cleanColor(updates.color);
      const image =
        updates.image === undefined ? offer.plato.imagenUrl : cleanImage(updates.image);

      // Si cambia el nombre, la oferta pasa a otro plato del catálogo (no se duplica).
      const idPlato = await findOrCreatePlato(tx, { name, detail, color, image });

      await tx.ofertaMenu.update({
        where: { idOferta: id },
        data: {
          idPlato,
          ...(updates.soldOut === undefined ? {} : { disponible: !updates.soldOut }),
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ServiceError(409, 'DUPLICATE_DISH', 'Ese plato ya está en el menú de ese día.');
    }

    throw error;
  }
}

export async function removeDish(rawId: unknown): Promise<void> {
  const id = parseOfferId(rawId);

  await prisma.ofertaMenu.deleteMany({ where: { idOferta: id } });
}

export async function removeDay(rawDate: unknown): Promise<void> {
  const date = parseDate(rawDate);

  await prisma.ofertaMenu.deleteMany({ where: { fecha: date } });
}

export async function moveDay(userId: string, rawFrom: unknown, rawTo: unknown): Promise<void> {
  const from = parseDate(rawFrom);
  const to = parseDate(rawTo);

  if (from.getTime() === to.getTime()) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.ofertaMenu.count({ where: { fecha: to } });

      if (target > 0) {
        throw new ServiceError(409, 'DAY_EXISTS', 'Ya existe un menú para esa fecha.');
      }

      const idMenu = await ensureWeeklyMenu(tx, to, userId);

      await tx.ofertaMenu.updateMany({ where: { fecha: from }, data: { fecha: to, idMenu } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ServiceError(409, 'DAY_EXISTS', 'Ya existe un menú para esa fecha.');
    }

    throw error;
  }
}
