import { useEffect, useState } from 'react';

import { isServiceOpen } from '@/utils/orderRules';

const CHECK_INTERVAL_MS = 30000;

/**
 * Indica si el casino está atendiendo ahora (hora de Chile) y se actualiza solo
 * al abrir o cerrar. El servidor vuelve a validarlo al crear el pedido.
 */
export function useServiceOpen(): boolean {
  const [open, setOpen] = useState(() => isServiceOpen());

  useEffect(() => {
    const interval = setInterval(() => setOpen(isServiceOpen()), CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return open;
}
