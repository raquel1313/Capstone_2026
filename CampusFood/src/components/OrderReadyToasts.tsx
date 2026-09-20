import { CheckCircle2, X } from 'lucide-react';
import type { OrderAlert } from '@/hooks/useOrderAlerts';

export function OrderReadyToasts({ alerts, dismiss }: { alerts: OrderAlert[]; dismiss: (id: string) => void }) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-5 lg:bottom-6">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex items-center gap-3 rounded-2xl bg-[#252525] px-4 py-3.5 text-white shadow-xl">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#4d7157]/25 text-[#8fc79c]">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Tu pedido está listo</p>
            <p className="text-xs text-white/60">{alert.orderId} · Retíralo en la cafetería</p>
          </div>
          <button onClick={() => dismiss(alert.id)} className="shrink-0 text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}