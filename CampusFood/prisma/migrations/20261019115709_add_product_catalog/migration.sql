-- CreateTable
CREATE TABLE "categorias_producto" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_producto_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "productos" (
    "id_producto" SERIAL NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" VARCHAR(500),
    "precio" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "imagen_url" TEXT,
    "tema_visual" VARCHAR(20) NOT NULL DEFAULT 'amber',
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id_producto")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_producto_nombre_key" ON "categorias_producto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE INDEX "productos_id_categoria_idx" ON "productos"("id_categoria");

-- CreateIndex
CREATE INDEX "productos_activo_idx" ON "productos"("activo");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias_producto"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "productos"
ADD CONSTRAINT "productos_precio_check"
CHECK ("precio" > 0);

-- AddCheckConstraint
ALTER TABLE "productos"
ADD CONSTRAINT "productos_stock_check"
CHECK ("stock" >= 0);