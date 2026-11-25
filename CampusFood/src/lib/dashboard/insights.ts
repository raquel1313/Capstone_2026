import { compare, formatDecimal, formatInt, formatMinutes, formatPercent, ratio } from '@/lib/dashboard/format';
import type {
  DashboardSummary,
  Insight,
  OrdersDashboard,
  ProductsDashboard,
} from '@/lib/dashboard/types';

/*
 * Observaciones automáticas: consulta + cálculo + regla. No hay IA ni texto libre:
 * cada observación sale de una regla con un umbral explícito y un mínimo de datos, de
 * modo que los mismos datos siempre producen las mismas observaciones.
 */

export const INSIGHT_RULES = {
  // Mínimo de pedidos (en cada período) para hablar de tendencia.
  minOrdersForTrend: 10,
  // Variación mínima de pedidos para comentarla (en %).
  minTrendPct: 5,
  // Mínimo de unidades solicitadas para destacar un producto.
  minUnitsForTopProduct: 5,
  // Mínimo de pedidos válidos para analizar horas y días.
  minOrdersForDemand: 10,
  // Una hora "concentra" la demanda si reúne al menos esta fracción de los pedidos.
  peakHourShare: 0.25,
  // Mínimo de pedidos en cada período para comparar la tasa de cancelación.
  minOrdersForCancellationRate: 20,
  // Cambio mínimo de la tasa de cancelación, en puntos porcentuales.
  minCancellationPoints: 2,
  // Rango mínimo (días) y pedidos para comparar días de la semana.
  minDaysForWeekday: 14,
  minOrdersForWeekday: 20,
  // Muestras mínimas para hablar de tiempos y de cuellos de botella.
  minSamplesForTiming: 10,
  minSamplesPerHour: 5,
  // Una hora es cuello de botella si su preparación supera el promedio general por este factor.
  bottleneckFactor: 1.5,
  // Espera mediana (min) en el mesón a partir de la cual se destaca.
  longPickupWaitMin: 60,
  minCancelledForReason: 5,
} as const;

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const hourSpan = (hour: number) =>
  `${String(hour).padStart(2, '0')}:00 y las ${String((hour + 1) % 24).padStart(2, '0')}:00`;

export function buildInsights(input: {
  summary: DashboardSummary;
  orders: OrdersDashboard;
  products: ProductsDashboard;
}): Insight[] {
  const { summary, orders, products } = input;
  const rules = INSIGHT_RULES;
  const { range } = summary;
  const insights: Insight[] = [];
  const current = summary.orders.current;
  const previous = summary.orders.previous;
  const periodText = range.preset === 'today' ? 'de hoy' : 'del período';

  // 1) Tendencia de pedidos contra el período anterior.
  if (current.total >= rules.minOrdersForTrend && previous.total >= rules.minOrdersForTrend) {
    const change = compare(current.total, previous.total);

    if (change.kind === 'change' && Math.abs(change.pct) >= rules.minTrendPct) {
      insights.push({
        id: 'orders-trend',
        tone: change.direction === 'up' ? 'positive' : 'negative',
        text: `Los pedidos ${change.direction === 'up' ? 'aumentaron' : 'disminuyeron'} un ${formatDecimal(Math.abs(change.pct))} % respecto de ${range.previousLabel} (${formatInt(previous.total)} → ${formatInt(current.total)}).`,
      });
    }
  }

  // 2) Producto más solicitado.
  const top = products.top[0];

  if (top && products.totalUnits >= rules.minUnitsForTopProduct) {
    insights.push({
      id: 'top-product',
      tone: 'neutral',
      text: `"${top.name}" concentró el mayor número de solicitudes ${periodText}: ${formatInt(top.units)} unidades (${formatPercent(top.units / products.totalUnits)} del total).`,
    });
  }

  // 3) Concentración de la demanda en una hora.
  const validOrders = orders.demand.byHour.reduce((sum, hour) => sum + hour.orders, 0);

  if (validOrders >= rules.minOrdersForDemand) {
    const peak = orders.demand.byHour.reduce((best, hour) => (hour.orders > best.orders ? hour : best));
    const share = peak.orders / validOrders;

    if (share >= rules.peakHourShare) {
      insights.push({
        id: 'peak-hour',
        tone: 'neutral',
        text: `El ${formatPercent(share)} de los pedidos ${periodText} se concentró entre las ${hourSpan(peak.hour)}.`,
      });
    }
  }

  // 4) Cambio en la tasa de cancelación (en puntos porcentuales).
  if (
    current.total >= rules.minOrdersForCancellationRate &&
    previous.total >= rules.minOrdersForCancellationRate
  ) {
    const currentRate = ratio(current.cancelled, current.total) ?? 0;
    const previousRate = ratio(previous.cancelled, previous.total) ?? 0;
    const points = (currentRate - previousRate) * 100;

    if (Math.abs(points) >= rules.minCancellationPoints) {
      insights.push({
        id: 'cancellation-rate',
        tone: points < 0 ? 'positive' : 'negative',
        text: `La tasa de cancelación ${points < 0 ? 'disminuyó' : 'aumentó'} ${formatDecimal(Math.abs(points))} puntos porcentuales (de ${formatPercent(previousRate)} a ${formatPercent(currentRate)}).`,
      });
    }
  }

  // 5) Día de la semana con más demanda (promedio por día, para no favorecer a los que
  //    aparecen más veces en el rango).
  if (range.days >= rules.minDaysForWeekday && validOrders >= rules.minOrdersForWeekday) {
    const ranked = orders.demand.byWeekday
      .filter((day) => day.occurrences > 0)
      .map((day) => ({ ...day, average: day.orders / day.occurrences }))
      .sort((a, b) => b.average - a.average || a.weekday - b.weekday);

    if (ranked[0] && ranked[0].orders > 0) {
      insights.push({
        id: 'busiest-weekday',
        tone: 'neutral',
        text: `Los ${WEEKDAYS[ranked[0].weekday - 1]} son el día de mayor demanda: ${formatDecimal(ranked[0].average)} pedidos en promedio por día.`,
      });
    }
  }

  // 6) Tiempos: cuello de botella en la preparación y espera en el mesón.
  const operations = orders.operations;

  if (
    operations.preparation.samples >= rules.minSamplesForTiming &&
    operations.preparation.averageMin !== null
  ) {
    const overall = operations.preparation.averageMin;
    const slowest = operations.preparationByHour
      .filter((hour) => hour.samples >= rules.minSamplesPerHour)
      .reduce<{ hour: number; averageMin: number } | null>(
        (best, hour) => (!best || hour.averageMin > best.averageMin ? hour : best),
        null,
      );

    if (slowest && overall > 0 && slowest.averageMin >= overall * rules.bottleneckFactor) {
      insights.push({
        id: 'prep-bottleneck',
        tone: 'negative',
        text: `Los pedidos hechos entre las ${hourSpan(slowest.hour)} tardaron en promedio ${formatMinutes(slowest.averageMin)} en quedar listos, ${formatDecimal(slowest.averageMin / overall)} veces el promedio general (${formatMinutes(overall)}).`,
      });
    }
  }

  if (
    operations.readyToPickup.samples >= rules.minSamplesForTiming &&
    operations.readyToPickup.medianMin !== null &&
    operations.readyToPickup.medianMin >= rules.longPickupWaitMin
  ) {
    insights.push({
      id: 'pickup-wait',
      tone: 'negative',
      text: `La mitad de los pedidos esperó ${formatMinutes(operations.readyToPickup.medianMin)} o más en el mesón antes de ser retirada.`,
    });
  }

  // 7) Motivo de cancelación más frecuente.
  const reason = summary.cancellations.topReasons[0];

  if (reason && current.cancelled >= rules.minCancelledForReason) {
    insights.push({
      id: 'top-cancel-reason',
      tone: 'neutral',
      text: `El motivo de cancelación más frecuente fue "${reason.reason}" (${formatInt(reason.count)} de ${formatInt(current.cancelled)} cancelaciones).`,
    });
  }

  // 8) Stock bajo o agotado (foto de hoy: no depende del período elegido).
  if (products.lowStock.total > 0) {
    const count = products.lowStock.total;

    insights.push({
      id: 'low-stock',
      tone: 'negative',
      text: `${formatInt(count)} ${count === 1 ? 'producto activo tiene' : 'productos activos tienen'} stock bajo o agotado (${formatInt(products.lowStock.threshold)} unidades o menos): conviene reponer pronto para no cancelar pedidos por falta de stock.`,
    });
  }

  // 9) Clientes bloqueados por faltas.
  if (summary.penalties.blockedUsers > 0) {
    const count = summary.penalties.blockedUsers;

    insights.push({
      id: 'blocked-users',
      tone: 'negative',
      text: `${formatInt(count)} ${count === 1 ? 'cliente está bloqueado' : 'clientes están bloqueados'} por acumular faltas de retiro.`,
    });
  }

  return insights;
}