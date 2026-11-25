import { formatInt, formatPercent } from '@/lib/dashboard/format';
import type { ProductsDashboard } from '@/lib/dashboard/types';

import { Card, EmptyData, HorizontalBars } from './ui';

export function ProductsPanel({ data }: { data: ProductsDashboard }) {
  const { lowStock } = data;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card
        title="10 productos más solicitados"
        subtitle={`Unidades en pedidos no cancelados del período (${formatInt(data.totalUnits)} en total)`}
      >
        {data.totalUnits === 0 ? (
          <EmptyData />
        ) : (
          <HorizontalBars
            unit="u."
            rows={data.top.map((product) => ({
              key: String(product.productId),
              label: product.name,
              value: product.units,
              detail: `${formatPercent(product.units / data.totalUnits)} · ${formatInt(product.orders)} pedidos`,
            }))}
          />
        )}
      </Card>

      <Card
        title="Stock bajo o agotado"
        subtitle={`Productos activos con ${formatInt(lowStock.threshold)} unidades o menos. Es el stock de hoy, no depende del período.`}
      >
        {lowStock.items.length === 0 ? (
          <EmptyData message="Ningún producto activo tiene stock bajo." />
        ) : (
          <>
            <ul className="space-y-2">
              {lowStock.items.map((product) => (
                <li
                  key={product.productId}
                  className="flex items-baseline justify-between gap-3 border-b border-ink/10 pb-2 text-sm"
                >
                  <span className="truncate">
                    {product.name}
                    <span className="ml-2 text-[11px] text-ink/65">{product.category}</span>
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium ${product.stock === 0 ? 'text-red-700' : 'text-amber-700'}`}
                  >
                    {product.stock === 0 ? 'Agotado' : `${formatInt(product.stock)} u.`}
                  </span>
                </li>
              ))}
            </ul>

            {lowStock.total > lowStock.items.length && (
              <p className="mt-3 text-[11px] text-ink/65">
                Se muestran los {formatInt(lowStock.items.length)} más críticos de {formatInt(lowStock.total)}.
              </p>
            )}
          </>
        )}
      </Card>

      <Card
        title="Productos menos solicitados"
        subtitle="Productos activos con menos unidades en el período (0 = sin solicitudes)"
        className="xl:col-span-2"
      >
        {data.bottom.length === 0 ? (
          <EmptyData />
        ) : (
          <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {data.bottom.map((product) => (
              <li
                key={product.productId}
                className="flex items-baseline justify-between gap-3 border-b border-ink/10 pb-2 text-sm"
              >
                <span className="truncate">
                  {product.name}
                  <span className="ml-2 text-[11px] text-ink/65">{product.category}</span>
                </span>
                <span className={`shrink-0 text-xs ${product.units === 0 ? 'text-red-700' : 'text-ink/65'}`}>
                  {product.units === 0 ? 'Sin solicitudes' : `${formatInt(product.units)} u.`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}