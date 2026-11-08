-- CreateEnum
CREATE TYPE "NivelReaccion" AS ENUM ('EXCELENTE', 'BUENO', 'REGULAR', 'MALO');

-- CreateEnum
CREATE TYPE "EstadoEncuesta" AS ENUM ('ACTIVA', 'CERRADA', 'ARCHIVADA');

-- CreateTable
CREATE TABLE "reacciones" (
    "id_reaccion" SERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_oferta" INTEGER NOT NULL,
    "nivel" "NivelReaccion" NOT NULL,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reacciones_pkey" PRIMARY KEY ("id_reaccion")
);

-- CreateTable
CREATE TABLE "encuestas" (
    "id_encuesta" SERIAL NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" "EstadoEncuesta" NOT NULL DEFAULT 'ACTIVA',
    "creado_por" UUID NOT NULL,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encuestas_pkey" PRIMARY KEY ("id_encuesta")
);

-- CreateTable
CREATE TABLE "opciones_encuesta" (
    "id_opcion" SERIAL NOT NULL,
    "id_encuesta" INTEGER NOT NULL,
    "etiqueta" VARCHAR(150) NOT NULL,
    "id_plato" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "opciones_encuesta_pkey" PRIMARY KEY ("id_opcion")
);

-- CreateTable
CREATE TABLE "votos" (
    "id_voto" SERIAL NOT NULL,
    "id_encuesta" INTEGER NOT NULL,
    "id_opcion" INTEGER NOT NULL,
    "id_usuario" UUID NOT NULL,
    "fecha_voto" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_pkey" PRIMARY KEY ("id_voto")
);

-- CreateIndex
CREATE INDEX "reacciones_id_oferta_idx" ON "reacciones"("id_oferta");

-- CreateIndex
CREATE INDEX "reacciones_fecha_creacion_idx" ON "reacciones"("fecha_creacion");

-- CreateIndex
CREATE UNIQUE INDEX "reacciones_id_usuario_id_oferta_key" ON "reacciones"("id_usuario", "id_oferta");

-- CreateIndex
CREATE INDEX "encuestas_estado_fecha_creacion_idx" ON "encuestas"("estado", "fecha_creacion");

-- CreateIndex
CREATE INDEX "opciones_encuesta_id_encuesta_idx" ON "opciones_encuesta"("id_encuesta");

-- CreateIndex
CREATE INDEX "opciones_encuesta_id_plato_idx" ON "opciones_encuesta"("id_plato");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_encuesta_id_opcion_id_encuesta_key" ON "opciones_encuesta"("id_opcion", "id_encuesta");

-- CreateIndex
CREATE INDEX "votos_id_opcion_idx" ON "votos"("id_opcion");

-- CreateIndex
CREATE UNIQUE INDEX "votos_id_encuesta_id_usuario_key" ON "votos"("id_encuesta", "id_usuario");

-- AddForeignKey
ALTER TABLE "reacciones" ADD CONSTRAINT "reacciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reacciones" ADD CONSTRAINT "reacciones_id_oferta_fkey" FOREIGN KEY ("id_oferta") REFERENCES "ofertas_menu"("id_oferta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encuestas" ADD CONSTRAINT "encuestas_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_encuesta" ADD CONSTRAINT "opciones_encuesta_id_encuesta_fkey" FOREIGN KEY ("id_encuesta") REFERENCES "encuestas"("id_encuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_encuesta" ADD CONSTRAINT "opciones_encuesta_id_plato_fkey" FOREIGN KEY ("id_plato") REFERENCES "platos"("id_plato") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_id_encuesta_fkey" FOREIGN KEY ("id_encuesta") REFERENCES "encuestas"("id_encuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_id_opcion_id_encuesta_fkey" FOREIGN KEY ("id_opcion", "id_encuesta") REFERENCES "opciones_encuesta"("id_opcion", "id_encuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seguridad: tablas expuestas por Supabase sin acceso directo (Prisma usa rol propietario)
ALTER TABLE "public"."reacciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."encuestas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."opciones_encuesta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."votos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."encuestas" ADD CONSTRAINT "encuestas_rango_fechas" CHECK ("fecha_fin" >= "fecha_inicio");
ALTER TABLE "public"."ofertas_menu" ADD CONSTRAINT "ofertas_menu_precio_no_negativo" CHECK ("precio" >= 0);