/*
 * Contratos del dashboard administrativo. Los comparten el servidor (agregaciones SQL)
 * y la pantalla. Todos los montos están en pesos chilenos (enteros) y todas las fechas
 * en formato AAAA-MM-DD según la hora de Chile.
 */

export type RangePreset = 'today' | '7d' | '30d' | 'month' | 'prev_month' | 'custom';

export type DateRange = { from: string; to: string };

export type ResolvedRange = {
  preset: RangePreset;
  from: string;
  to: string;
  days: number;
  label: string;
  previous: DateRange;
  previousDays: number;
  // Texto para comparar: "vs. 7 días anteriores".
  previousLabel: string;
};

export type PeriodPair<T> = { current: T; previous: T };

export type OrderCounts = {
  total: number;
  completed: number;
  pending: number;
  ready: number;
  cancelled: number;
  // total - cancelados: pedidos que representan demanda real.
  valid: number;
};

export type CommercialSummary = {
  // SUM(Pedido.total) de pedidos no cancelados creados en el período.
  orderValue: PeriodPair<number>;
  // SUM(Pago.monto) con pago REGISTRADO cuya fecha de pago cae en el período.
  registeredIncome: PeriodPair<number>;
  paidOrders: PeriodPair<number>;
  // SUM(Pedido.total) de los pedidos con falta por no retiro (no anulada) con fecha en el período.
  missedPickupValue: number;
};

export type CancellationSummary = {
  // Cancelados por día (según el día en que se creó el pedido), para ver la evolución.
  byDay: { date: string; cancelled: number; total: number }[];
  byOrigin: { origin: 'CLIENTE' | 'PERSONAL' | 'SIN_DATO'; count: number }[];
  topReasons: { reason: string; count: number }[];
  // Minutos entre la creación y la cancelación (campo fecha_cancelacion).
  minutesToCancel: { samples: number; average: number | null; median: number | null };
};

export type PenaltySummary = {
  // Faltas por no retirar con fecha en el período (sin las anuladas por amnistía).
  missedPickups: number;
  annulled: number;
  // Faltas de la regla anterior (cancelación tardía): solo histórico.
  legacyLateCancellations: number;
  // Cantidad de clientes bloqueados hoy; no se exponen datos personales.
  blockedUsers: number;
};

export type PollParticipation = {
  title: string;
  status: 'ACTIVA' | 'CERRADA' | 'ARCHIVADA';
  votes: number;
  // Estudiantes activos (rol student) que podrían votar.
  eligible: number;
};

export type DashboardSummary = {
  range: ResolvedRange;
  orders: PeriodPair<OrderCounts>;
  // Clientes distintos con al menos un pedido no cancelado creado en el período.
  customers: PeriodPair<number>;
  // Encuesta vigente (o la más reciente si no hay ninguna vigente); null si nunca hubo.
  pollParticipation: PollParticipation | null;
  // null cuando el usuario no tiene el permiso VIEW_FINANCIALS.
  commercial: CommercialSummary | null;
  cancellations: CancellationSummary;
  penalties: PenaltySummary;
};

export type DemandStats = {
  byDay: { date: string; orders: number }[];
  // Horas 0-23 (hora de Chile). La pantalla muestra el horario de atención.
  byHour: { hour: number; orders: number }[];
  // 1 = lunes ... 7 = domingo; "occurrences" = veces que ese día cae en el rango.
  byWeekday: { weekday: number; orders: number; occurrences: number }[];
};

export type DurationStats = {
  samples: number;
  averageMin: number | null;
  medianMin: number | null;
  p90Min: number | null;
};

export type OperationsStats = {
  // Creación -> primera vez en LISTO (historial de estados).
  preparation: DurationStats;
  // Creación -> retiro (fecha_retiro).
  creationToPickup: DurationStats;
  // Primera vez en LISTO -> retiro.
  readyToPickup: DurationStats;
  preparationBuckets: { label: string; count: number }[];
  readyToPickupBuckets: { label: string; count: number }[];
  // Preparación promedio según la hora (Chile) en que se creó el pedido.
  preparationByHour: { hour: number; samples: number; averageMin: number }[];
  // Pedidos del período con y sin hora de "listo": no se estiman tiempos que no existen.
  ordersWithReadyTime: number;
  ordersConsidered: number;
};

export type OrdersDashboard = {
  range: ResolvedRange;
  demand: DemandStats;
  operations: OperationsStats;
};

export type ProductUsage = {
  productId: number;
  name: string;
  category: string;
  active: boolean;
  units: number;
  orders: number;
};

export type LowStockProduct = {
  productId: number;
  name: string;
  category: string;
  stock: number;
};

export type ProductsDashboard = {
  range: ResolvedRange;
  totalUnits: number;
  top: ProductUsage[];
  // Productos activos con menos solicitudes (incluye los que no tuvieron ninguna).
  bottom: ProductUsage[];
  categories: { category: string; units: number; share: number }[];
  // Productos activos con stock <= threshold (foto de hoy, no depende del rango).
  lowStock: { threshold: number; total: number; items: LowStockProduct[] };
};

export type Insight = {
  id: string;
  tone: 'positive' | 'negative' | 'neutral';
  text: string;
};