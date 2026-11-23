import { formatDecimal, formatInt } from '@/lib/dashboard/format';
import { SERVICE_CLOSE_HOUR, SERVICE_OPEN_HOUR } from '@/utils/orderRules';
import type { OrdersDashboard } from '@/lib/dashboard/types';

import { BarChart, Card, EmptyData, type BarDatum } from './ui';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function DemandPanel({ data }: { data: OrdersDashboard }) {
  const { byDay, byHour, byWeekday } = data.demand;
  const total = byDay.reduce((sum, day) => sum + day.orders, 0);

  if (total === 0) {
    return (
      <Card title="Demanda">
        <EmptyData />
      </Card>
    );
  }

  const serviceHours = byHour.filter(
    (hour) => hour.hour >= SERVICE_OPEN_HOUR && hour.hour < SERVICE_CLOSE_HOUR
  );
  const outsideHours = byHour
    .filter((hour) => hour.hour < SERVICE_OPEN_HOUR || hour.hour >= SERVICE_CLOSE_HOUR)
    .reduce((sum, hour) => sum + hour.orders, 0);

  const peak = byHour.reduce((best, hour) => (hour.orders > best.orders ? hour : best));

  const dayBars: BarDatum[] = byDay.map((day) => ({
    key: day.date,
    label: shortDate(day.date),
    value: day.orders,
    title: `${shortDate(day.date)}: ${day.orders} pedidos`,
  }));

  const hourBars: BarDatum[] = serviceHours.map((hour) => ({
    key: String(hour.hour),
    label: `${hour.hour}h`,
    value: hour.orders,
    title: `${String(hour.hour).padStart(2, '0')}:00 a ${String(hour.hour + 1).padStart(2, '0')}:00 · ${hour.orders} pedidos`,
  }));

  const weekdayBars: BarDatum[] = byWeekday.map((day) => ({
    key: String(day.weekday),
    label: WEEKDAY_LABELS[day.weekday - 1],
    value: day.orders,
    title:
      day.occurrences > 0
        ? `${WEEKDAY_LABELS[day.weekday - 1]}: ${day.orders} pedidos en ${day.occurrences} días (${formatDecimal(day.orders / day.occurrences)} por día)`
        : `${WEEKDAY_LABELS[day.weekday - 1]}: no hay días de este tipo en el rango`,
    muted: day.occurrences === 0,
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card
        title="Pedidos por día"
        subtitle={`${formatInt(total)} pedidos no cancelados en el período`}
        className="xl:col-span-2"
      >
        <BarChart
          data={dayBars}
          ariaLabel="Pedidos por día"
          labelEvery={Math.max(1, Math.ceil(dayBars.length / 12))}
        />
      </Card>

      <Card
        title="Pedidos por hora"
        subtitle={`Hora de Chile. Hora punta: ${String(peak.hour).padStart(2, '0')}:00 (${formatInt(peak.orders)} pedidos)`}
      >
        <BarChart data={hourBars} ariaLabel="Pedidos por hora" />
        {outsideHours > 0 && (
          <p className="mt-2 text-[11px] text-ink/65">
            {formatInt(outsideHours)} pedidos se hicieron fuera del horario de atención (pedidos de antes de
            que existiera la restricción horaria).
          </p>
        )}
      </Card>

      <Card
        title="Pedidos por día de la semana"
        subtitle="Total del período; al pasar el cursor se ve el promedio por día"
      >
        <BarChart data={weekdayBars} ariaLabel="Pedidos por día de la semana" />
      </Card>
    </div>
  );
}
