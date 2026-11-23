import { Lightbulb } from 'lucide-react';

import type { Insight } from '@/lib/dashboard/types';

import { Card, EmptyData } from './ui';

const TONE_STYLE: Record<Insight['tone'], string> = {
  positive: 'border-emerald-600',
  negative: 'border-red-600',
  neutral: 'border-brand',
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card
      title="Observaciones del período"
      subtitle="Se generan con reglas fijas sobre los datos del rango elegido; los mismos datos siempre dan las mismas observaciones."
      className="bg-brand-soft"
    >
      {insights.length === 0 ? (
        <EmptyData message="Todavía no hay datos suficientes para generar observaciones en este período." />
      ) : (
        <ul className="space-y-2.5">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={`flex gap-3 rounded-xl border-l-4 bg-white px-4 py-3 text-sm ${TONE_STYLE[insight.tone]}`}
            >
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
              <span>{insight.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
