-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE INDEX "Organisation_createdById_idx" ON "Organisation"("createdById");

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Los proyectos que ya existían quedan a cargo del primer superadministrador
-- (el administrador inicial de la plataforma). Desde ahora cada proyecto
-- guarda quién lo creó y solo ese superadministrador tiene acceso total.
UPDATE "Organisation"
SET "createdById" = (
  SELECT "id" FROM "User"
  WHERE "isSuperAdmin" = true AND "deletedAt" IS NULL
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "createdById" IS NULL;
