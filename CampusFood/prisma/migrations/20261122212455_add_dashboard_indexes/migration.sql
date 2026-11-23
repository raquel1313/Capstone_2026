-- Índices para el dashboard administrativo.
-- Las consultas agregadas filtran un rango de fechas sin usuario ni estado:
--   pedidos:  WHERE fecha_creacion >= $inicio AND fecha_creacion < $fin   (todas las métricas de pedidos)
--   pagos:    WHERE estado = 'REGISTRADO' AND fecha_pago en el rango       (ingreso registrado)
-- Los índices existentes de pedidos empiezan por id_usuario o id_estado y no sirven para esa búsqueda.
-- No se agregan índices a historial_estado_pedido (ya existe (id_pedido, fecha_cambio)), pedido_detalle
-- (se recorre por id_pedido de los pedidos ya filtrados) ni penalizaciones (tabla pequeña).

-- CreateIndex
CREATE INDEX "pedidos_fecha_creacion_idx" ON "pedidos"("fecha_creacion");

-- CreateIndex
CREATE INDEX "pagos_fecha_pago_idx" ON "pagos"("fecha_pago");
