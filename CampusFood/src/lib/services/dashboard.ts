import { Prisma } from '../../../generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { DASHBOARD_TIME_ZONE } from '@/lib/dashboard/range';
import { listBlockedUsers } from '@/lib/services/penalties';
import type {
  CancellationSummary,
  CommercialSummary,
  DashboardSummary,
  DemandStats,
  DurationStats,
  OperationsStats,
  OrderCounts,
  OrdersDashboard,
  PenaltySummary,
  PeriodPair,
  PollParticipation,
  ProductsDashboard,
  ProductUsage,
  ResolvedRange,
} from '@/lib/dashboard/types';

/*
 * Todas las cifras salen de agregaciones SQL (COUNT/SUM/percentile) calculadas en la
 * base de datos: al navegador solo llegan totales, nunca la lista de pedidos.
 *
 * Criterios (los mismos que muestra la pantalla):
 *  - Un pedido pertenece al período en que se CREÓ (pedidos.fecha_creacion, hora de Chile).
 *  - "Válido" = no cancelado. La demanda y el valor de pedidos usan solo pedidos válidos.
 *  - "Ingreso registrado" = pagos en estado REGISTRADO según su fecha de pago.
 *    Un pedido pendiente o listo NUNCA cuenta como ingreso.
 */

const TZ = DASHBOARD_TIME_ZONE;
const MIN_REASON_LENGTH = 80;

// Límites del período [inicio, fin) como instantes con zona horaria de Chile.
const startOf = (date: string) => Prisma.sql`((${date}::date)::timestamp AT TIME ZONE ${TZ})`;
const endOf = (date: string) => Prisma.sql`(((${date}::date + 1))::timestamp AT TIME ZONE ${TZ})`;

const within = (column: Prisma.Sql, from: string, to: string) =>
  Prisma.sql`(${column} >= ${startOf(from)} AND ${column} < ${endOf(to)})`;

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));
const numOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

/* ------------------------------ Resumen ------------------------------ */

const EMPTY_COUNTS: OrderCounts = {
  total: 0,
  completed: 0,
  pending: 0,
  ready: 0,
  cancelled: 0,
  valid: 0,
};

async function getOrderCounts(range: ResolvedRange): Promise<PeriodPair<OrderCounts>> {
  const rows = await prisma.$queryRaw<{ periodo: 'cur' | 'prev'; estado: string; pedidos: number }[]>`
    SELECT CASE WHEN ${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)} THEN 'cur' ELSE 'prev' END AS periodo,
           e.nombre AS estado,
           count(*)::int AS pedidos
    FROM pedidos o
    JOIN estados_pedido e ON e.id_estado = o.id_estado
    WHERE ${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)}
       OR ${within(Prisma.sql`o.fecha_creacion`, range.previous.from, range.previous.to)}
    GROUP BY 1, 2
  `;

  const result: PeriodPair<OrderCounts> = { current: { ...EMPTY_COUNTS }, previous: { ...EMPTY_COUNTS } };

  for (const row of rows) {
    const target = row.periodo === 'cur' ? result.current : result.previous;
    const count = num(row.pedidos);

    target.total += count;

    switch (row.estado) {
      case 'RETIRADO':
        target.completed += count;
        break;
      case 'PENDIENTE':
        target.pending += count;
        break;
      case 'LISTO':
        target.ready += count;
        break;
      case 'CANCELADO':
        target.cancelled += count;
        break;
    }
  }

  result.current.valid = result.current.total - result.current.cancelled;
  result.previous.valid = result.previous.total - result.previous.cancelled;

  return result;
}

async function getCommercial(range: ResolvedRange): Promise<CommercialSummary> {
  const [orders, payments, missed] = await Promise.all([
    prisma.$queryRaw<{ periodo: 'cur' | 'prev'; valor: number }[]>`
      SELECT CASE WHEN ${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)} THEN 'cur' ELSE 'prev' END AS periodo,
             COALESCE(SUM(o.total), 0)::float8 AS valor
      FROM pedidos o
      JOIN estados_pedido e ON e.id_estado = o.id_estado
      WHERE e.nombre <> 'CANCELADO'
        AND (${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)}
          OR ${within(Prisma.sql`o.fecha_creacion`, range.previous.from, range.previous.to)})
      GROUP BY 1
    `,
    prisma.$queryRaw<{ periodo: 'cur' | 'prev'; ingreso: number; pagados: number }[]>`
      SELECT CASE WHEN ${within(Prisma.sql`p.fecha_pago`, range.from, range.to)} THEN 'cur' ELSE 'prev' END AS periodo,
             COALESCE(SUM(p.monto), 0)::float8 AS ingreso,
             count(*)::int AS pagados
      FROM pagos p
      WHERE p.estado = 'REGISTRADO'
        AND (${within(Prisma.sql`p.fecha_pago`, range.from, range.to)}
          OR ${within(Prisma.sql`p.fecha_pago`, range.previous.from, range.previous.to)})
      GROUP BY 1
    `,
    // Dinero "en el aire": valor de los pedidos que quedaron listos y nunca se retiraron
    // (faltas por no retiro vigentes, es decir, sin anular por amnistía).
    prisma.$queryRaw<{ valor: number }[]>`
      SELECT COALESCE(SUM(o.total), 0)::float8 AS valor
      FROM penalizaciones p
      JOIN pedidos o ON o.id_pedido = p.id_pedido
      WHERE p.tipo::text = 'NO_RETIRO'
        AND NOT p.anulada
        AND ${within(Prisma.sql`p.fecha_falta`, range.from, range.to)}
    `,
  ]);

  const pick = <T extends { periodo: string }>(rows: T[], periodo: 'cur' | 'prev') =>
    rows.find((row) => row.periodo === periodo);

  return {
    orderValue: {
      current: num(pick(orders, 'cur')?.valor),
      previous: num(pick(orders, 'prev')?.valor),
    },
    registeredIncome: {
      current: num(pick(payments, 'cur')?.ingreso),
      previous: num(pick(payments, 'prev')?.ingreso),
    },
    paidOrders: {
      current: num(pick(payments, 'cur')?.pagados),
      previous: num(pick(payments, 'prev')?.pagados),
    },
    missedPickupValue: num(missed[0]?.valor),
  };
}

// Clientes distintos que pidieron (pedidos no cancelados), en el período y en el anterior.
async function getCustomers(range: ResolvedRange): Promise<PeriodPair<number>> {
  const rows = await prisma.$queryRaw<{ periodo: 'cur' | 'prev'; clientes: number }[]>`
    SELECT CASE WHEN ${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)} THEN 'cur' ELSE 'prev' END AS periodo,
           count(DISTINCT o.id_usuario)::int AS clientes
    FROM pedidos o
    JOIN estados_pedido e ON e.id_estado = o.id_estado
    WHERE e.nombre <> 'CANCELADO'
      AND (${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)}
        OR ${within(Prisma.sql`o.fecha_creacion`, range.previous.from, range.previous.to)})
    GROUP BY 1
  `;

  return {
    current: num(rows.find((row) => row.periodo === 'cur')?.clientes),
    previous: num(rows.find((row) => row.periodo === 'prev')?.clientes),
  };
}

// Votos de la encuesta vigente (o de la más reciente si todas están archivadas) contra
// los estudiantes activos que podrían votar.
async function getPollParticipation(): Promise<PollParticipation | null> {
  const rows = await prisma.$queryRaw<
    { titulo: string; estado: PollParticipation['status']; votos: number; habilitados: number }[]
  >`
    SELECT e.titulo,
           e.estado::text AS estado,
           (SELECT count(*) FROM votos v WHERE v.id_encuesta = e.id_encuesta)::int AS votos,
           (SELECT count(DISTINCT u.id_usuario)
              FROM usuarios u
              JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
              JOIN roles r ON r.id_rol = ur.id_rol
             WHERE u.activo AND r.nombre = 'student')::int AS habilitados
    FROM encuestas e
    ORDER BY (e.estado::text <> 'ARCHIVADA') DESC, e.fecha_creacion DESC
    LIMIT 1
  `;

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    title: row.titulo,
    status: row.estado,
    votes: num(row.votos),
    eligible: num(row.habilitados),
  };
}

async function getCancellations(range: ResolvedRange): Promise<CancellationSummary> {
  const created = within(Prisma.sql`o.fecha_creacion`, range.from, range.to);

  const [byDay, byOrigin, reasons, timing] = await Promise.all([
    // Evolución: pedidos creados cada día y cuántos terminaron cancelados.
    prisma.$queryRaw<{ dia: string; cancelados: number; total: number }[]>`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS dia,
             COALESCE(c.cancelados, 0)::int AS cancelados,
             COALESCE(c.total, 0)::int AS total
      FROM generate_series(${range.from}::date, ${range.to}::date, interval '1 day') AS d
      LEFT JOIN (
        SELECT (o.fecha_creacion AT TIME ZONE ${TZ})::date AS dia,
               count(*) AS total,
               count(*) FILTER (WHERE e.nombre = 'CANCELADO') AS cancelados
        FROM pedidos o
        JOIN estados_pedido e ON e.id_estado = o.id_estado
        WHERE ${created}
        GROUP BY 1
      ) c ON c.dia = d::date
      ORDER BY d
    `,
    prisma.$queryRaw<{ origen: string | null; cantidad: number }[]>`
      SELECT o.origen_cancelacion::text AS origen, count(*)::int AS cantidad
      FROM pedidos o
      JOIN estados_pedido e ON e.id_estado = o.id_estado
      WHERE e.nombre = 'CANCELADO' AND ${created}
      GROUP BY 1
    `,
    // Motivos agrupados sin distinguir mayúsculas ni espacios sobrantes.
    prisma.$queryRaw<{ motivo: string; cantidad: number }[]>`
      SELECT MIN(btrim(o.motivo_cancelacion)) AS motivo, count(*)::int AS cantidad
      FROM pedidos o
      JOIN estados_pedido e ON e.id_estado = o.id_estado
      WHERE e.nombre = 'CANCELADO' AND o.motivo_cancelacion IS NOT NULL
        AND btrim(o.motivo_cancelacion) <> '' AND ${created}
      GROUP BY lower(btrim(o.motivo_cancelacion))
      ORDER BY count(*) DESC, 1
      LIMIT 5
    `,
    prisma.$queryRaw<{ muestras: number; promedio: number | null; mediana: number | null }[]>`
      SELECT count(*)::int AS muestras,
             avg(m)::float8 AS promedio,
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY m))::float8 AS mediana
      FROM (
        SELECT EXTRACT(EPOCH FROM (o.fecha_cancelacion - o.fecha_creacion)) / 60 AS m
        FROM pedidos o
        JOIN estados_pedido e ON e.id_estado = o.id_estado
        WHERE e.nombre = 'CANCELADO' AND o.fecha_cancelacion IS NOT NULL
          AND o.fecha_cancelacion >= o.fecha_creacion AND ${created}
      ) t
    `,
  ]);

  const ORIGINS = ['CLIENTE', 'PERSONAL'] as const;

  return {
    byDay: byDay.map((row) => ({ date: row.dia, cancelled: num(row.cancelados), total: num(row.total) })),
    byOrigin: byOrigin.map((row) => ({
      origin: ORIGINS.find((origin) => origin === row.origen) ?? 'SIN_DATO',
      count: num(row.cantidad),
    })),
    topReasons: reasons.map((row) => ({
      reason: row.motivo.slice(0, MIN_REASON_LENGTH),
      count: num(row.cantidad),
    })),
    minutesToCancel: {
      samples: num(timing[0]?.muestras),
      average: numOrNull(timing[0]?.promedio),
      median: numOrNull(timing[0]?.mediana),
    },
  };
}

async function getPenalties(range: ResolvedRange): Promise<PenaltySummary> {
  const [rows, blocked] = await Promise.all([
    prisma.$queryRaw<{ tipo: string; anulada: boolean; cantidad: number }[]>`
      SELECT p.tipo::text AS tipo, p.anulada, count(*)::int AS cantidad
      FROM penalizaciones p
      WHERE ${within(Prisma.sql`p.fecha_falta`, range.from, range.to)}
      GROUP BY 1, 2
    `,
    listBlockedUsers(),
  ]);

  let missedPickups = 0;
  let annulled = 0;
  let legacyLateCancellations = 0;

  for (const row of rows) {
    const count = num(row.cantidad);

    if (row.tipo === 'CANCELACION_TARDIA') {
      legacyLateCancellations += count;
    } else if (row.anulada) {
      annulled += count;
    } else {
      missedPickups += count;
    }
  }

  return { missedPickups, annulled, legacyLateCancellations, blockedUsers: blocked.length };
}

export async function getDashboardSummary(
  range: ResolvedRange,
  options: { includeCommercial: boolean },
): Promise<DashboardSummary> {
  const [orders, commercial, cancellations, penalties, customers, pollParticipation] = await Promise.all([
    getOrderCounts(range),
    options.includeCommercial ? getCommercial(range) : Promise.resolve(null),
    getCancellations(range),
    getPenalties(range),
    getCustomers(range),
    getPollParticipation(),
  ]);

  return { range, orders, customers, pollParticipation, commercial, cancellations, penalties };
}

/* ---------------------- Demanda y tiempos operativos ---------------------- */

async function getDemand(range: ResolvedRange): Promise<DemandStats> {
  const valid = Prisma.sql`${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)} AND e.nombre <> 'CANCELADO'`;

  const [byDay, byHour, byWeekday, occurrences] = await Promise.all([
    prisma.$queryRaw<{ dia: string; pedidos: number }[]>`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS dia, COALESCE(c.pedidos, 0)::int AS pedidos
      FROM generate_series(${range.from}::date, ${range.to}::date, interval '1 day') AS d
      LEFT JOIN (
        SELECT (o.fecha_creacion AT TIME ZONE ${TZ})::date AS dia, count(*) AS pedidos
        FROM pedidos o JOIN estados_pedido e ON e.id_estado = o.id_estado
        WHERE ${valid}
        GROUP BY 1
      ) c ON c.dia = d::date
      ORDER BY d
    `,
    prisma.$queryRaw<{ hora: number; pedidos: number }[]>`
      SELECT EXTRACT(HOUR FROM o.fecha_creacion AT TIME ZONE ${TZ})::int AS hora, count(*)::int AS pedidos
      FROM pedidos o JOIN estados_pedido e ON e.id_estado = o.id_estado
      WHERE ${valid}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ dia: number; pedidos: number }[]>`
      SELECT EXTRACT(ISODOW FROM o.fecha_creacion AT TIME ZONE ${TZ})::int AS dia, count(*)::int AS pedidos
      FROM pedidos o JOIN estados_pedido e ON e.id_estado = o.id_estado
      WHERE ${valid}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ dia: number; veces: number }[]>`
      SELECT EXTRACT(ISODOW FROM d)::int AS dia, count(*)::int AS veces
      FROM generate_series(${range.from}::date, ${range.to}::date, interval '1 day') AS d
      GROUP BY 1
    `,
  ]);

  const hours = new Map(byHour.map((row) => [row.hora, num(row.pedidos)]));
  const weekdays = new Map(byWeekday.map((row) => [row.dia, num(row.pedidos)]));
  const times = new Map(occurrences.map((row) => [row.dia, num(row.veces)]));

  return {
    byDay: byDay.map((row) => ({ date: row.dia, orders: num(row.pedidos) })),
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, orders: hours.get(hour) ?? 0 })),
    byWeekday: Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      orders: weekdays.get(index + 1) ?? 0,
      occurrences: times.get(index + 1) ?? 0,
    })),
  };
}

// Una fila por pedido válido con los tiempos que realmente se pueden calcular.
// "Listo" = la primera vez que el pedido pasó a LISTO en el historial de estados.
function timingsCte(range: ResolvedRange) {
  return Prisma.sql`
    WITH base AS (
      SELECT o.id_pedido, o.fecha_creacion, o.fecha_retiro,
             EXTRACT(HOUR FROM o.fecha_creacion AT TIME ZONE ${TZ})::int AS hora
      FROM pedidos o JOIN estados_pedido e ON e.id_estado = o.id_estado
      WHERE ${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)} AND e.nombre <> 'CANCELADO'
    ), listo AS (
      SELECT h.id_pedido, MIN(h.fecha_cambio) AS listo_en
      FROM historial_estado_pedido h
      JOIN estados_pedido e ON e.id_estado = h.id_estado
      WHERE e.nombre = 'LISTO' AND h.id_pedido IN (SELECT id_pedido FROM base)
      GROUP BY h.id_pedido
    ), t AS (
      SELECT b.hora,
             CASE WHEN l.listo_en >= b.fecha_creacion
                  THEN EXTRACT(EPOCH FROM (l.listo_en - b.fecha_creacion)) / 60 END AS prep_min,
             CASE WHEN b.fecha_retiro >= b.fecha_creacion
                  THEN EXTRACT(EPOCH FROM (b.fecha_retiro - b.fecha_creacion)) / 60 END AS total_min,
             CASE WHEN b.fecha_retiro >= l.listo_en
                  THEN EXTRACT(EPOCH FROM (b.fecha_retiro - l.listo_en)) / 60 END AS espera_min,
             (l.listo_en IS NOT NULL) AS tiene_listo
      FROM base b LEFT JOIN listo l ON l.id_pedido = b.id_pedido
    )`;
}

const duration = (samples: unknown, average: unknown, median: unknown, p90: unknown): DurationStats => ({
  samples: num(samples),
  averageMin: numOrNull(average),
  medianMin: numOrNull(median),
  p90Min: numOrNull(p90),
});

async function getOperations(range: ResolvedRange): Promise<OperationsStats> {
  const cte = timingsCte(range);

  const [summary, buckets, byHour] = await Promise.all([
    prisma.$queryRaw<
      {
        considerados: number;
        con_listo: number;
        prep_n: number; prep_avg: number | null; prep_med: number | null; prep_p90: number | null;
        total_n: number; total_avg: number | null; total_med: number | null; total_p90: number | null;
        espera_n: number; espera_avg: number | null; espera_med: number | null; espera_p90: number | null;
      }[]
    >`
      ${cte}
      SELECT count(*)::int AS considerados,
             count(*) FILTER (WHERE tiene_listo)::int AS con_listo,
             count(prep_min)::int AS prep_n, avg(prep_min)::float8 AS prep_avg,
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY prep_min))::float8 AS prep_med,
             (percentile_cont(0.9) WITHIN GROUP (ORDER BY prep_min))::float8 AS prep_p90,
             count(total_min)::int AS total_n, avg(total_min)::float8 AS total_avg,
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY total_min))::float8 AS total_med,
             (percentile_cont(0.9) WITHIN GROUP (ORDER BY total_min))::float8 AS total_p90,
             count(espera_min)::int AS espera_n, avg(espera_min)::float8 AS espera_avg,
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY espera_min))::float8 AS espera_med,
             (percentile_cont(0.9) WITHIN GROUP (ORDER BY espera_min))::float8 AS espera_p90
      FROM t
    `,
    prisma.$queryRaw<Record<string, number>[]>`
      ${cte}
      SELECT count(*) FILTER (WHERE prep_min < 5)::int AS p1,
             count(*) FILTER (WHERE prep_min >= 5 AND prep_min < 10)::int AS p2,
             count(*) FILTER (WHERE prep_min >= 10 AND prep_min < 20)::int AS p3,
             count(*) FILTER (WHERE prep_min >= 20 AND prep_min < 40)::int AS p4,
             count(*) FILTER (WHERE prep_min >= 40)::int AS p5,
             count(*) FILTER (WHERE espera_min < 15)::int AS e1,
             count(*) FILTER (WHERE espera_min >= 15 AND espera_min < 30)::int AS e2,
             count(*) FILTER (WHERE espera_min >= 30 AND espera_min < 60)::int AS e3,
             count(*) FILTER (WHERE espera_min >= 60 AND espera_min < 180)::int AS e4,
             count(*) FILTER (WHERE espera_min >= 180)::int AS e5
      FROM t
    `,
    prisma.$queryRaw<{ hora: number; muestras: number; promedio: number }[]>`
      ${cte}
      SELECT hora, count(prep_min)::int AS muestras, avg(prep_min)::float8 AS promedio
      FROM t
      WHERE prep_min IS NOT NULL
      GROUP BY hora
      ORDER BY hora
    `,
  ]);

  const s = summary[0];
  const b = buckets[0] ?? {};

  return {
    preparation: duration(s?.prep_n, s?.prep_avg, s?.prep_med, s?.prep_p90),
    creationToPickup: duration(s?.total_n, s?.total_avg, s?.total_med, s?.total_p90),
    readyToPickup: duration(s?.espera_n, s?.espera_avg, s?.espera_med, s?.espera_p90),
    preparationBuckets: [
      { label: 'Menos de 5 min', count: num(b.p1) },
      { label: '5 a 10 min', count: num(b.p2) },
      { label: '10 a 20 min', count: num(b.p3) },
      { label: '20 a 40 min', count: num(b.p4) },
      { label: '40 min o más', count: num(b.p5) },
    ],
    readyToPickupBuckets: [
      { label: 'Menos de 15 min', count: num(b.e1) },
      { label: '15 a 30 min', count: num(b.e2) },
      { label: '30 a 60 min', count: num(b.e3) },
      { label: '1 a 3 h', count: num(b.e4) },
      { label: '3 h o más', count: num(b.e5) },
    ],
    preparationByHour: byHour.map((row) => ({
      hour: num(row.hora),
      samples: num(row.muestras),
      averageMin: num(row.promedio),
    })),
    ordersWithReadyTime: num(s?.con_listo),
    ordersConsidered: num(s?.considerados),
  };
}

export async function getOrdersDashboard(range: ResolvedRange): Promise<OrdersDashboard> {
  const [demand, operations] = await Promise.all([getDemand(range), getOperations(range)]);

  return { range, demand, operations };
}

/* ------------------------------- Productos ------------------------------- */

const LIST_SIZE = 10;
// Un producto activo con esta cantidad de unidades o menos se considera con stock bajo.
const LOW_STOCK_THRESHOLD = 5;

export async function getProductsDashboard(range: ResolvedRange): Promise<ProductsDashboard> {
  const [rows, lowStockRows] = await Promise.all([
    // Un solo recorrido: unidades por producto desde PedidoDetalle (pedidos no cancelados del
    // período) unidas al catálogo. Los productos activos sin ventas salen con 0 unidades.
    prisma.$queryRaw<
      { id: number; nombre: string; categoria: string; activo: boolean; unidades: number; pedidos: number }[]
    >`
      SELECT p.id_producto AS id, p.nombre, c.nombre AS categoria, p.activo,
             COALESCE(u.unidades, 0)::int AS unidades,
             COALESCE(u.pedidos, 0)::int AS pedidos
      FROM productos p
      JOIN categorias_producto c ON c.id_categoria = p.id_categoria
      LEFT JOIN (
        SELECT d.id_producto, SUM(d.cantidad) AS unidades, count(DISTINCT d.id_pedido) AS pedidos
        FROM pedido_detalle d
        JOIN pedidos o ON o.id_pedido = d.id_pedido
        JOIN estados_pedido e ON e.id_estado = o.id_estado
        WHERE e.nombre <> 'CANCELADO' AND ${within(Prisma.sql`o.fecha_creacion`, range.from, range.to)}
        GROUP BY d.id_producto
      ) u ON u.id_producto = p.id_producto
      WHERE p.activo OR u.unidades > 0
    `,
    // Stock de hoy (no depende del rango): los más críticos primero.
    prisma.$queryRaw<{ id: number; nombre: string; categoria: string; stock: number; total: number }[]>`
      SELECT p.id_producto AS id, p.nombre, c.nombre AS categoria, p.stock,
             count(*) OVER ()::int AS total
      FROM productos p
      JOIN categorias_producto c ON c.id_categoria = p.id_categoria
      WHERE p.activo AND p.stock <= ${LOW_STOCK_THRESHOLD}
      ORDER BY p.stock ASC, p.nombre
      LIMIT ${LIST_SIZE}
    `,
  ]);

  const products: ProductUsage[] = rows.map((row) => ({
    productId: num(row.id),
    name: row.nombre,
    category: row.categoria,
    active: row.activo,
    units: num(row.unidades),
    orders: num(row.pedidos),
  }));

  const totalUnits = products.reduce((sum, product) => sum + product.units, 0);

  const byUnits = (a: ProductUsage, b: ProductUsage) =>
    b.units - a.units || a.name.localeCompare(b.name, 'es');

  const top = products.filter((product) => product.units > 0).sort(byUnits).slice(0, LIST_SIZE);

  const bottom = products
    .filter((product) => product.active)
    .sort((a, b) => -byUnits(a, b))
    .slice(0, LIST_SIZE);

  const perCategory = new Map<string, number>();

  for (const product of products) {
    perCategory.set(product.category, (perCategory.get(product.category) ?? 0) + product.units);
  }

  const categories = [...perCategory.entries()]
    .filter(([, units]) => units > 0)
    .map(([category, units]) => ({ category, units, share: totalUnits > 0 ? units / totalUnits : 0 }))
    .sort((a, b) => b.units - a.units);

  const lowStock = {
    threshold: LOW_STOCK_THRESHOLD,
    total: num(lowStockRows[0]?.total),
    items: lowStockRows.map((row) => ({
      productId: num(row.id),
      name: row.nombre,
      category: row.categoria,
      stock: num(row.stock),
    })),
  };

  return { range, totalUnits, top, bottom, categories, lowStock };
}