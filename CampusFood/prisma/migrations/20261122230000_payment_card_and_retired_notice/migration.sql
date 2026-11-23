-- Pago presencial: nuevo medio "Tarjeta de alimentación" y aviso persistente de retiro.
ALTER TYPE "MedioPago" ADD VALUE IF NOT EXISTS 'TARJETA_ALIMENTACION';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'PEDIDO_RETIRADO';
