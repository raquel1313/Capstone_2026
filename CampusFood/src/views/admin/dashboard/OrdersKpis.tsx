import { formatInt, formatMoney, formatPercent, ratio } from '@/lib/dashboard/format';
import type { DashboardSummary } from '@/lib/dashboard/types';

import { Card, Delta, EmptyData, Metric, NO_DATA_MESSAGE } from './ui';

export function OrdersKpis({ summary }: { summary: DashboardSummary }) {
  const { current, previous } = summary.orders;
  const { previousLabel } = summary.range;

  const currentRate = ratio(current.cancelled, current.total);
  const previousRate = ratio(previous.cancelled, previous.total);

  // Diferencia de la tasa en puntos porcentuales (nunca como "%" sobre "%").
  const points =
    currentRate !== null && previousRate !== null ? (currentRate - previousRate) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          dark
          label={`Pedidos · ${summary.range.label.toLowerCase()}`}
          value={formatInt(current.total)}
          caption="Pedidos creados en el período (incluye cancelados)"
          footer={
            <Delta
              tone="dark"
              current={current.total}
              previous={previous.total}
              previousLabel={previousLabel}
            />
          }
        />

        <Metric
          label="Completados"
          value={formatInt(current.completed)}
          caption="Retirados y pagados en el mesón"
          footer={
            <Delta current={current.completed} previous={previous.completed} previousLabel={previousLabel} />
          }
        />

        <Metric
          label="Cancelados"
          value={formatInt(current.cancelled)}
          caption="Cancelados por el cliente o el casino"
          footer={
            <Delta
              current={current.cancelled}
              previous={previous.cancelled}
              previousLabel={previousLabel}
              goodWhen="down"
            />
          }
        />

        <Metric
          label="Tasa de cancelación"
          value={currentRate === null ? '—' : formatPercent(currentRate)}
          caption={
            currentRate === null
              ? NO_DATA_MESSAGE
              : `${formatInt(current.cancelled)} de ${formatInt(current.total)} pedidos`
          }
          footer={
            points === null ? null : (
              <span
                className={`text-xs font-medium ${
                  points === 0 ? 'text-ink/65' : points < 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {points === 0
                  ? `Igual que ${previousLabel}`
                  : `${points > 0 ? '+' : '−'}${Math.abs(points).toLocaleString('es-CL', { maximumFractionDigits: 1 })} pp vs. ${previousLabel}`}
              </span>
            )
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric
          label="Pendientes ahora en el período"
          value={formatInt(current.pending)}
          caption="Pedidos hechos en el período que siguen pendientes"
        />

        <Metric
          label="Listos para retirar"
          value={formatInt(current.ready)}
          caption="Pedidos hechos en el período, listos y sin retirar"
        />
      </div>

      {summary.commercial && <CommercialPanel summary={summary} />}
    </div>
  );
}

function CommercialPanel({ summary }: { summary: DashboardSummary }) {
  const commercial = summary.commercial;

  if (!commercial) {
    return null;
  }

  const { previousLabel } = summary.range;
  const validNow = summary.orders.current.valid;
  const validBefore = summary.orders.previous.valid;

  const ticketOrders = ratio(commercial.orderValue.current, validNow);
  const ticketOrdersBefore = ratio(commercial.orderValue.previous, validBefore);
  const ticketPaid = ratio(commercial.registeredIncome.current, commercial.paidOrders.current);
  const ticketPaidBefore = ratio(commercial.registeredIncome.previous, commercial.paidOrders.previous);

  return (
    <Card
      title="Valor de pedidos e ingresos"
      subtitle="El valor de los pedidos no es ingreso: solo se considera ingreso un pago registrado en el mesón."
    >
      {validNow === 0 && commercial.paidOrders.current === 0 ? (
        <EmptyData />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Valor de pedidos"
            value={formatMoney(commercial.orderValue.current)}
            caption="Suma del total de los pedidos no cancelados creados en el período (incluye pendientes y listos)"
            footer={
              <Delta
                current={commercial.orderValue.current}
                previous={commercial.orderValue.previous}
                previousLabel={previousLabel}
              />
            }
          />

          <Metric
            label="Ingreso registrado"
            value={formatMoney(commercial.registeredIncome.current)}
            caption={`Suma de pagos registrados en el período (${formatInt(commercial.paidOrders.current)} pedidos pagados)`}
            footer={
              <Delta
                current={commercial.registeredIncome.current}
                previous={commercial.registeredIncome.previous}
                previousLabel={previousLabel}
              />
            }
          />

          <Metric
            label="Ticket promedio de pedidos"
            value={ticketOrders === null ? '—' : formatMoney(ticketOrders)}
            caption={
              ticketOrders === null
                ? NO_DATA_MESSAGE
                : `Valor de pedidos ÷ ${formatInt(validNow)} pedidos no cancelados`
            }
            footer={
              ticketOrders !== null && ticketOrdersBefore !== null ? (
                <Delta current={ticketOrders} previous={ticketOrdersBefore} previousLabel={previousLabel} />
              ) : null
            }
          />

          <Metric
            label="Ticket promedio cobrado"
            value={ticketPaid === null ? '—' : formatMoney(ticketPaid)}
            caption={
              ticketPaid === null
                ? NO_DATA_MESSAGE
                : `Ingreso registrado ÷ ${formatInt(commercial.paidOrders.current)} pedidos pagados`
            }
            footer={
              ticketPaid !== null && ticketPaidBefore !== null ? (
                <Delta current={ticketPaid} previous={ticketPaidBefore} previousLabel={previousLabel} />
              ) : null
            }
          />
        </div>
      )}
    </Card>
  );
}
