-- AddForeignKey
ALTER TABLE "AssessmentOrganisationProfile" ADD CONSTRAINT "AssessmentOrganisationProfile_organisation_fkey" FOREIGN KEY ("organisation") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_organisation_fkey" FOREIGN KEY ("organisation") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvaluation" ADD CONSTRAINT "AssessmentEvaluation_organisation_fkey" FOREIGN KEY ("organisation") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalToolMeasure" ADD CONSTRAINT "OrganizationalToolMeasure_organisation_fkey" FOREIGN KEY ("organisation") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityToolMeasure" ADD CONSTRAINT "CapacityToolMeasure_organisation_fkey" FOREIGN KEY ("organisation") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Solo una evaluación en curso (DRAFT/IN_PROGRESS) por perfil y plantilla:
-- el servicio ya reutiliza la activa; la BD lo garantiza ante concurrencia.
CREATE UNIQUE INDEX "AssessmentEvaluation_active_per_profile_template"
  ON "AssessmentEvaluation" ("profileId", "templateId")
  WHERE "status" IN ('DRAFT', 'IN_PROGRESS') AND "deletedAt" IS NULL;

-- Consultas de auditoría y purga por antigüedad.
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog" ("createdAt");
