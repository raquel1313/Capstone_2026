import { formatInt, formatMoney, formatPercent, ratio } from '@/lib/dashboard/format';
import type { DashboardSummary } from '@/lib/dashboard/types';

import { BarChart, Card, EmptyData, HorizontalBars, Metric, type BarDatum } from './ui';

const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function CancellationsPanel({ summary }: { summary: DashboardSummary }) {
  const { cancellations, orders } = summary;
  const cancelled = orders.current.cancelled;

  if (orders.current.total === 0) {
    return (
      <Card title="Cancelaciones">
        <EmptyData />
      </Card>
    );
  }

  const days: BarDatum[] = cancellations.byDay.map((day) => ({
    key: day.date,
    label: shortDate(day.date),
    value: day.cancelled,
    title: `${shortDate(day.date)}: ${day.cancelled} cancelados de ${day.total} pedidos`,
  }));

  return (
    <Card
      title="Cancelaciones"
      subtitle="Pedidos creados en el período que terminaron cancelados, según el día en que se hicieron"
    >
      {cancelled === 0 ? (
        <p className="py-4 text-center text-sm text-ink/65">No hubo cancelaciones en el período.</p>
      ) : (
        <div className="space-y-6">
          <BarChart
            data={days}
            ariaLabel="Cancelaciones por día"
            height={110}
            labelEvery={Math.max(1, Math.ceil(days.length / 12))}
          />

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/65">Motivos más frecuentes</h4>
            <div className="mt-3">
              {cancellations.topReasons.length === 0 ? (
                <EmptyData message="Los pedidos cancelados no tienen motivo registrado." />
              ) : (
                <HorizontalBars
                  unit="pedidos"
                  rows={cancellations.topReasons.map((reason) => ({
                    key: reason.reason,
                    label: reason.reason,
                    value: reason.count,
                  }))}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function PenaltiesPanel({ summary }: { summary: DashboardSummary }) {
  const { penalties, commercial } = summary;

  // De los pedidos que quedaron listos y se resolvieron, cuántos no se retiraron.
  const missedRate = ratio(penalties.missedPickups, summary.orders.current.completed + penalties.missedPickups);

  return (
    <Card
      title="Faltas y bloqueos"
      subtitle="Es falta dejar un pedido listo sin retirar hasta el fin del día. Con 3 faltas en 7 días el cliente queda bloqueado 3 días."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="Pedidos no retirados"
          value={formatInt(penalties.missedPickups)}
          caption="Faltas del período (sin las anuladas)"
        />
        <Metric
          label="Tasa de no retiro"
          value={missedRate === null ? '—' : formatPercent(missedRate)}
          caption="No retirados ÷ (retirados + no retirados) del período"
        />
        {commercial && (
          <Metric
            label="Valor no retirado"
            value={formatMoney(commercial.missedPickupValue)}
            caption="Suma de los pedidos listos que nadie retiró: inventario preparado y no vendido"
          />
        )}
        <Metric
          label="Clientes bloqueados hoy"
          value={formatInt(penalties.blockedUsers)}
          caption="Solo se muestra la cantidad, no quiénes son"
        />
        <Metric
          label="Faltas anuladas"
          value={formatInt(penalties.annulled)}
          caption="Levantadas por el personal (amnistía)"
        />
      </div>

      {penalties.legacyLateCancellations > 0 && (
        <p className="mt-3 text-[11px] text-ink/65">
          Además hay {formatInt(penalties.legacyLateCancellations)} faltas por cancelación tardía de la regla anterior.
          Ya no se generan ni cuentan para el bloqueo.
        </p>
      )}
    </Card>
  );
}