-- CreateEnum
CREATE TYPE "OrigenAccion" AS ENUM ('CLIENTE', 'PERSONAL');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'DEBITO', 'CREDITO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('REGISTRADO', 'ANULADO');

-- CreateTable
CREATE TABLE "estados_pedido" (
    "id_estado" SERIAL NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "estados_pedido_pkey" PRIMARY KEY ("id_estado")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id_pedido" SERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_estado" INTEGER NOT NULL,
    "codigo_retiro" VARCHAR(12) NOT NULL,
    "cliente_email" VARCHAR(255) NOT NULL,
    "total" INTEGER NOT NULL,
    "origen_cancelacion" "OrigenAccion",
    "motivo_cancelacion" VARCHAR(255),
    "fecha_cancelacion" TIMESTAMPTZ(6),
    "fecha_confirmacion" TIMESTAMPTZ(6),
    "fecha_retiro" TIMESTAMPTZ(6),
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id_pedido")
);

-- CreateTable
CREATE TABLE "pedido_detalle" (
    "id_detalle" SERIAL NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "nombre_producto" VARCHAR(150) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "pedido_detalle_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "ajustes_pedido" (
    "id_ajuste" SERIAL NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "nombre_producto" VARCHAR(150) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "origen" "OrigenAccion" NOT NULL,
    "motivo" VARCHAR(255) NOT NULL,
    "realizado_por" UUID,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajustes_pedido_pkey" PRIMARY KEY ("id_ajuste")
);

-- CreateTable
CREATE TABLE "historial_estado_pedido" (
    "id_historial" SERIAL NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "id_estado" INTEGER NOT NULL,
    "cambiado_por" UUID,
    "motivo" VARCHAR(255),
    "fecha_cambio" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estado_pedido_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id_pago" SERIAL NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL,
    "medio_pago" "MedioPago" NOT NULL DEFAULT 'EFECTIVO',
    "estado" "EstadoPago" NOT NULL DEFAULT 'REGISTRADO',
    "registrado_por" UUID,
    "fecha_pago" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id_pago")
);

-- CreateIndex
CREATE UNIQUE INDEX "estados_pedido_nombre_key" ON "estados_pedido"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_codigo_retiro_key" ON "pedidos"("codigo_retiro");

-- CreateIndex
CREATE INDEX "pedidos_id_usuario_fecha_creacion_idx" ON "pedidos"("id_usuario", "fecha_creacion");

-- CreateIndex
CREATE INDEX "pedidos_id_estado_fecha_creacion_idx" ON "pedidos"("id_estado", "fecha_creacion");

-- CreateIndex
CREATE INDEX "pedido_detalle_id_producto_idx" ON "pedido_detalle"("id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_detalle_id_pedido_id_producto_key" ON "pedido_detalle"("id_pedido", "id_producto");

-- CreateIndex
CREATE INDEX "ajustes_pedido_id_pedido_idx" ON "ajustes_pedido"("id_pedido");

-- CreateIndex
CREATE INDEX "historial_estado_pedido_id_pedido_fecha_cambio_idx" ON "historial_estado_pedido"("id_pedido", "fecha_cambio");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_id_pedido_key" ON "pagos"("id_pedido");

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "estados_pedido"("id_estado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_pedido" ADD CONSTRAINT "ajustes_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_pedido" ADD CONSTRAINT "ajustes_pedido_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_pedido" ADD CONSTRAINT "ajustes_pedido_realizado_por_fkey" FOREIGN KEY ("realizado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_pedido" ADD CONSTRAINT "historial_estado_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_pedido" ADD CONSTRAINT "historial_estado_pedido_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "estados_pedido"("id_estado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_pedido" ADD CONSTRAINT "historial_estado_pedido_cambiado_por_fkey" FOREIGN KEY ("cambiado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seguridad: tablas expuestas por Supabase sin acceso directo (Prisma usa rol propietario)
ALTER TABLE "public"."estados_pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pedidos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pedido_detalle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ajustes_pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."historial_estado_pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pagos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."productos" ADD CONSTRAINT "productos_stock_no_negativo" CHECK ("stock" >= 0);
ALTER TABLE "public"."productos" ADD CONSTRAINT "productos_precio_no_negativo" CHECK ("precio" >= 0);
ALTER TABLE "public"."pedido_detalle" ADD CONSTRAINT "pedido_detalle_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "public"."ajustes_pedido" ADD CONSTRAINT "ajustes_pedido_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "public"."pedidos" ADD CONSTRAINT "pedidos_total_no_negativo" CHECK ("total" >= 0);

-- Estados iniciales del pedido (el seed los mantiene sincronizados)
INSERT INTO "estados_pedido" ("nombre", "descripcion") VALUES
  ('PENDIENTE', 'Pedido recibido, aun no esta listo.'),
  ('LISTO', 'Pedido preparado y disponible para retirar.'),
  ('RETIRADO', 'Pedido entregado y pagado en el meson.'),
  ('CANCELADO', 'Pedido cancelado por el cliente o por el casino.')
ON CONFLICT ("nombre") DO NOTHING;