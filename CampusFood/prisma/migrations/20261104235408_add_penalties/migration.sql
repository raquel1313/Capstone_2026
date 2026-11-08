-- CreateEnum
CREATE TYPE "TipoPenalizacion" AS ENUM ('CANCELACION_TARDIA', 'NO_RETIRO');

-- CreateTable
CREATE TABLE "penalizaciones" (
    "id_penalizacion" SERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "tipo" "TipoPenalizacion" NOT NULL,
    "fecha_falta" TIMESTAMPTZ(6) NOT NULL,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_anulacion" TIMESTAMPTZ(6),
    "anulada_por" UUID,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penalizaciones_pkey" PRIMARY KEY ("id_penalizacion")
);

-- CreateIndex
CREATE INDEX "penalizaciones_id_usuario_anulada_fecha_falta_idx" ON "penalizaciones"("id_usuario", "anulada", "fecha_falta");

-- CreateIndex
CREATE UNIQUE INDEX "penalizaciones_id_pedido_tipo_key" ON "penalizaciones"("id_pedido", "tipo");

-- AddForeignKey
ALTER TABLE "penalizaciones" ADD CONSTRAINT "penalizaciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalizaciones" ADD CONSTRAINT "penalizaciones_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalizaciones" ADD CONSTRAINT "penalizaciones_anulada_por_fkey" FOREIGN KEY ("anulada_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seguridad: tablas expuestas por Supabase sin acceso directo (Prisma usa rol propietario)
ALTER TABLE "public"."penalizaciones" ENABLE ROW LEVEL SECURITY;