-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "imagen_path" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "productos_imagen_path_key" ON "productos"("imagen_path");
