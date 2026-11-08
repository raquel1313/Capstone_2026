-- CreateEnum
CREATE TYPE "EstadoCarrito" AS ENUM ('ACTIVO', 'CONVERTIDO');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('PEDIDO_LISTO', 'PEDIDO_CANCELADO', 'PRODUCTO_RETIRADO');

-- CreateTable
CREATE TABLE "carritos" (
    "id_carrito" SERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "estado" "EstadoCarrito" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "carritos_pkey" PRIMARY KEY ("id_carrito")
);

-- CreateTable
CREATE TABLE "carrito_detalle" (
    "id_carrito" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "carrito_detalle_pkey" PRIMARY KEY ("id_carrito","id_producto")
);

-- CreateTable
CREATE TABLE "notificaciones_pedido" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_pedido" INTEGER,
    "tipo" "TipoNotificacion" NOT NULL,
    "clave" VARCHAR(60) NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "mensaje" VARCHAR(500) NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_lectura" TIMESTAMPTZ(6),
    "fecha_descarte" TIMESTAMPTZ(6),

    CONSTRAINT "notificaciones_pedido_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateIndex
CREATE INDEX "carritos_id_usuario_estado_idx" ON "carritos"("id_usuario", "estado");

-- CreateIndex
CREATE INDEX "carrito_detalle_id_producto_idx" ON "carrito_detalle"("id_producto");

-- CreateIndex
CREATE INDEX "notificaciones_pedido_id_usuario_fecha_descarte_fecha_creac_idx" ON "notificaciones_pedido"("id_usuario", "fecha_descarte", "fecha_creacion");

-- CreateIndex
CREATE UNIQUE INDEX "notificaciones_pedido_id_usuario_clave_key" ON "notificaciones_pedido"("id_usuario", "clave");

-- AddForeignKey
ALTER TABLE "carritos" ADD CONSTRAINT "carritos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_detalle" ADD CONSTRAINT "carrito_detalle_id_carrito_fkey" FOREIGN KEY ("id_carrito") REFERENCES "carritos"("id_carrito") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_detalle" ADD CONSTRAINT "carrito_detalle_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones_pedido" ADD CONSTRAINT "notificaciones_pedido_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones_pedido" ADD CONSTRAINT "notificaciones_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seguridad: tablas expuestas por Supabase sin acceso directo (Prisma usa rol propietario)
ALTER TABLE "public"."carritos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."carrito_detalle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notificaciones_pedido" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX "carritos_un_activo_por_usuario" ON "public"."carritos"("id_usuario") WHERE "estado" = 'ACTIVO';
ALTER TABLE "public"."carrito_detalle" ADD CONSTRAINT "carrito_detalle_cantidad_positiva" CHECK ("cantidad" > 0);