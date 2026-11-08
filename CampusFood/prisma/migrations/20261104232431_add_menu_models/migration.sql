-- CreateEnum
CREATE TYPE "EstadoMenuSemanal" AS ENUM ('BORRADOR', 'PUBLICADO', 'CERRADO');

-- CreateTable
CREATE TABLE "platos" (
    "id_plato" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" VARCHAR(500),
    "imagen_url" TEXT,
    "tema_visual" VARCHAR(20) NOT NULL DEFAULT 'amber',
    "calorias" INTEGER,
    "proteinas_gr" DECIMAL(6,2),
    "carbohidratos_gr" DECIMAL(6,2),
    "grasas_gr" DECIMAL(6,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platos_pkey" PRIMARY KEY ("id_plato")
);

-- CreateTable
CREATE TABLE "menus_semanales" (
    "id_menu" SERIAL NOT NULL,
    "id_creador" UUID NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" "EstadoMenuSemanal" NOT NULL DEFAULT 'BORRADOR',
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menus_semanales_pkey" PRIMARY KEY ("id_menu")
);

-- CreateTable
CREATE TABLE "ofertas_menu" (
    "id_oferta" SERIAL NOT NULL,
    "id_menu" INTEGER NOT NULL,
    "id_plato" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "precio" INTEGER NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ofertas_menu_pkey" PRIMARY KEY ("id_oferta")
);

-- CreateTable
CREATE TABLE "acompanamientos" (
    "id_acompanamiento" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "acompanamientos_pkey" PRIMARY KEY ("id_acompanamiento")
);

-- CreateTable
CREATE TABLE "ofertas_acompanamientos" (
    "id_oferta_menu" INTEGER NOT NULL,
    "id_acompanamiento" INTEGER NOT NULL,

    CONSTRAINT "ofertas_acompanamientos_pkey" PRIMARY KEY ("id_oferta_menu","id_acompanamiento")
);

-- CreateIndex
CREATE INDEX "platos_activo_idx" ON "platos"("activo");

-- CreateIndex
CREATE INDEX "platos_nombre_idx" ON "platos"("nombre");

-- CreateIndex
CREATE INDEX "menus_semanales_id_creador_idx" ON "menus_semanales"("id_creador");

-- CreateIndex
CREATE INDEX "menus_semanales_estado_idx" ON "menus_semanales"("estado");

-- CreateIndex
CREATE INDEX "menus_semanales_fecha_inicio_fecha_fin_idx" ON "menus_semanales"("fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE UNIQUE INDEX "menus_semanales_fecha_inicio_fecha_fin_key" ON "menus_semanales"("fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "ofertas_menu_id_menu_idx" ON "ofertas_menu"("id_menu");

-- CreateIndex
CREATE INDEX "ofertas_menu_id_plato_idx" ON "ofertas_menu"("id_plato");

-- CreateIndex
CREATE INDEX "ofertas_menu_fecha_idx" ON "ofertas_menu"("fecha");

-- CreateIndex
CREATE INDEX "ofertas_menu_disponible_idx" ON "ofertas_menu"("disponible");

-- CreateIndex
CREATE UNIQUE INDEX "ofertas_menu_id_menu_id_plato_fecha_key" ON "ofertas_menu"("id_menu", "id_plato", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "acompanamientos_nombre_key" ON "acompanamientos"("nombre");

-- CreateIndex
CREATE INDEX "acompanamientos_activo_idx" ON "acompanamientos"("activo");

-- CreateIndex
CREATE INDEX "ofertas_acompanamientos_id_acompanamiento_idx" ON "ofertas_acompanamientos"("id_acompanamiento");

-- AddForeignKey
ALTER TABLE "menus_semanales" ADD CONSTRAINT "menus_semanales_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_menu" ADD CONSTRAINT "ofertas_menu_id_menu_fkey" FOREIGN KEY ("id_menu") REFERENCES "menus_semanales"("id_menu") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_menu" ADD CONSTRAINT "ofertas_menu_id_plato_fkey" FOREIGN KEY ("id_plato") REFERENCES "platos"("id_plato") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_acompanamientos" ADD CONSTRAINT "ofertas_acompanamientos_id_oferta_menu_fkey" FOREIGN KEY ("id_oferta_menu") REFERENCES "ofertas_menu"("id_oferta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_acompanamientos" ADD CONSTRAINT "ofertas_acompanamientos_id_acompanamiento_fkey" FOREIGN KEY ("id_acompanamiento") REFERENCES "acompanamientos"("id_acompanamiento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seguridad: tablas expuestas por Supabase sin acceso directo (Prisma usa rol propietario)
ALTER TABLE "public"."platos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."menus_semanales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ofertas_menu" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."acompanamientos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ofertas_acompanamientos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."categorias_producto" ENABLE ROW LEVEL SECURITY;