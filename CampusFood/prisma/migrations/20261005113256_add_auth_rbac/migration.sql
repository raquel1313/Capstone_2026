-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "roles" (
    "id_rol" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id_permiso" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id_permiso")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "id_usuario" UUID NOT NULL,
    "id_rol" INTEGER NOT NULL,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id_usuario","id_rol")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "id_rol" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("id_rol","id_permiso")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_nombre_key" ON "permisos"("nombre");

-- CreateIndex
CREATE INDEX "usuario_rol_id_rol_idx" ON "usuario_rol"("id_rol");

-- CreateIndex
CREATE INDEX "rol_permiso_id_permiso_idx" ON "rol_permiso"("id_permiso");

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_id_permiso_fkey" FOREIGN KEY ("id_permiso") REFERENCES "permisos"("id_permiso") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."permisos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."usuario_rol" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rol_permiso" ENABLE ROW LEVEL SECURITY;

-- Do not expose RBAC tables through the Supabase Data API
REVOKE ALL PRIVILEGES ON TABLE "public"."usuarios" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "public"."roles" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "public"."permisos" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "public"."usuario_rol" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "public"."rol_permiso" FROM anon, authenticated;