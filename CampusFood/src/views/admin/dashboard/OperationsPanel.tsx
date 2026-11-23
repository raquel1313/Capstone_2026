import { formatInt, formatMinutes } from '@/lib/dashboard/format';
import type { DurationStats, OrdersDashboard } from '@/lib/dashboard/types';

import { BarChart, Card, EmptyData, HorizontalBars, Metric, NO_DATA_MESSAGE, type BarDatum } from './ui';

function DurationMetric({ label, caption, stats }: { label: string; caption: string; stats: DurationStats }) {
  if (stats.samples === 0 || stats.averageMin === null) {
    return <Metric label={label} value="—" caption={NO_DATA_MESSAGE} />;
  }

  return (
    <Metric
      label={label}
      value={formatMinutes(stats.averageMin)}
      caption={`${caption} · mediana ${formatMinutes(stats.medianMin)} · el 90 % tardó hasta ${formatMinutes(stats.p90Min)} · ${formatInt(stats.samples)} pedidos`}
    />
  );
}

export function OperationsPanel({ data }: { data: OrdersDashboard }) {
  const ops = data.operations;

  if (ops.ordersConsidered === 0) {
    return (
      <Card title="Tiempos de operación">
        <EmptyData />
      </Card>
    );
  }

  const hourBars: BarDatum[] = ops.preparationByHour.map((hour) => ({
    key: String(hour.hour),
    label: `${hour.hour}h`,
    value: Math.round(hour.averageMin * 10) / 10,
    title: `${String(hour.hour).padStart(2, '0')}:00 · ${formatMinutes(hour.averageMin)} en promedio (${hour.samples} pedidos)`,
  }));

  const prepAvg = ops.preparation.averageMin;
  const waitAvg = ops.readyToPickup.averageMin;

  return (
    <Card
      title="Tiempos de operación"
      subtitle="Calculados con el historial de estados. 'Listo' es el momento en que el personal marcó el pedido como listo en el sistema."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <DurationMetric label="Preparación" caption="Desde que se pide hasta que queda listo" stats={ops.preparation} />
        <DurationMetric
          label="Espera en el mesón"
          caption="Desde que queda listo hasta el retiro"
          stats={ops.readyToPickup}
        />
        <DurationMetric label="Pedido completo" caption="Desde que se pide hasta el retiro" stats={ops.creationToPickup} />
      </div>

      {ops.ordersWithReadyTime < ops.ordersConsidered && (
        <p className="mt-3 text-[11px] text-ink/65">
          {formatInt(ops.ordersWithReadyTime)} de {formatInt(ops.ordersConsidered)} pedidos no cancelados tienen
          hora de &quot;listo&quot;; los demás todavía están pendientes y no se les estima ningún tiempo.
        </p>
      )}

      {prepAvg !== null && waitAvg !== null && (
        <p className="mt-3 rounded-xl bg-brand-soft px-4 py-3 text-xs text-ink/75">
          Tramo más largo en promedio:{' '}
          <strong>
            {prepAvg >= waitAvg
              ? `preparación (${formatMinutes(prepAvg)})`
              : `espera en el mesón (${formatMinutes(waitAvg)})`}
          </strong>
          . La espera en el mesón depende también de cuándo llega el cliente.
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/65">
            Distribución del tiempo de preparación
          </h4>
          {ops.preparation.samples === 0 ? (
            <EmptyData />
          ) : (
            <div className="mt-3">
              <HorizontalBars
                unit="pedidos"
                rows={ops.preparationBuckets.map((bucket) => ({
                  key: bucket.label,
                  label: bucket.label,
                  value: bucket.count,
                }))}
              />
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/65">
            Distribución de la espera en el mesón
          </h4>
          {ops.readyToPickup.samples === 0 ? (
            <EmptyData />
          ) : (
            <div className="mt-3">
              <HorizontalBars
                unit="pedidos"
                rows={ops.readyToPickupBuckets.map((bucket) => ({
                  key: bucket.label,
                  label: bucket.label,
                  value: bucket.count,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/65">
          Preparación promedio según la hora del pedido (minutos)
        </h4>
        {hourBars.length === 0 ? (
          <EmptyData />
        ) : (
          <div className="mt-3">
            <BarChart data={hourBars} ariaLabel="Preparación promedio por hora" height={120} />
          </div>
        )}
      </div>
    </Card>
  );
}
