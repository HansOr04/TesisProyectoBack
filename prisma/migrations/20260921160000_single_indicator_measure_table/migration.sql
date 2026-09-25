-- Tabla única de medidas por KPI: OrganizationalToolMeasure pasa a llamarse
-- AssessmentIndicatorMeasure y absorbe las filas de CapacityToolMeasure
-- (mismo esquema). La herramienta se deriva de evaluation.template.tool.
ALTER TABLE "OrganizationalToolMeasure" RENAME TO "AssessmentIndicatorMeasure";
ALTER TABLE "AssessmentIndicatorMeasure" RENAME CONSTRAINT "OrganizationalToolMeasure_pkey" TO "AssessmentIndicatorMeasure_pkey";
ALTER TABLE "AssessmentIndicatorMeasure" RENAME CONSTRAINT "OrganizationalToolMeasure_evaluationId_fkey" TO "AssessmentIndicatorMeasure_evaluationId_fkey";
ALTER TABLE "AssessmentIndicatorMeasure" RENAME CONSTRAINT "OrganizationalToolMeasure_indicatorId_fkey" TO "AssessmentIndicatorMeasure_indicatorId_fkey";
ALTER TABLE "AssessmentIndicatorMeasure" RENAME CONSTRAINT "OrganizationalToolMeasure_organisation_fkey" TO "AssessmentIndicatorMeasure_organisation_fkey";
ALTER INDEX "OrganizationalToolMeasure_evaluationId_idx" RENAME TO "AssessmentIndicatorMeasure_evaluationId_idx";
ALTER INDEX "OrganizationalToolMeasure_indicatorId_idx" RENAME TO "AssessmentIndicatorMeasure_indicatorId_idx";

INSERT INTO "AssessmentIndicatorMeasure" (
  "id", "createdAt", "updatedAt", "deletedAt", "organisation", "evaluationId", "indicatorId",
  "name", "description", "responsible", "support", "startDate", "endDate", "budgetUsd",
  "verificationLink", "progressPct", "status", "expectedResult", "appliedImprovements", "updatedBy"
)
SELECT
  "id", "createdAt", "updatedAt", "deletedAt", "organisation", "evaluationId", "indicatorId",
  "name", "description", "responsible", "support", "startDate", "endDate", "budgetUsd",
  "verificationLink", "progressPct", "status", "expectedResult", "appliedImprovements", "updatedBy"
FROM "CapacityToolMeasure";

DROP TABLE "CapacityToolMeasure";
