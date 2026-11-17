-- Los KPI se identifican como "KPI 1.1" en las tres herramientas, igual que
-- las plantillas actuales. Las aprovisionadas antes conservaban los prefijos
-- del Excel original (AZ- Organizativa, NA- Capacidades, VE- Riesgos).

-- 1. Volver a sembrar una plantilla con prefijo antiguo creó, en la misma
--    sección, una copia "KPI x.y" del mismo KPI. Si esa copia nunca se usó
--    (sin calificaciones, riesgos, medidas ni exclusiones), se elimina para
--    que el KPI original, que sí tiene historial, tome su código.
DELETE FROM "AssessmentIndicator" AS dup
WHERE dup."code" ~ '^KPI [0-9]'
  AND EXISTS (
    SELECT 1 FROM "AssessmentIndicator" AS old
    WHERE old."sectionId" = dup."sectionId"
      AND old."code" ~ '^(AZ|NA|VE)-'
      AND 'KPI ' || substring(old."code" FROM 4) = dup."code"
  )
  AND NOT EXISTS (SELECT 1 FROM "AssessmentResponse" r WHERE r."indicatorId" = dup."id")
  AND NOT EXISTS (SELECT 1 FROM "AssessmentRisk" k WHERE k."indicatorId" = dup."id")
  AND NOT EXISTS (SELECT 1 FROM "AssessmentIndicatorMeasure" m WHERE m."indicatorId" = dup."id")
  AND NOT EXISTS (SELECT 1 FROM "AssessmentProfileIndicatorExclusion" x WHERE x."indicatorId" = dup."id");

-- 2. Renombrar conservando la numeración, salvo que la sección ya tenga ese
--    código en uso.
UPDATE "AssessmentIndicator" AS i
SET "code" = 'KPI ' || substring(i."code" FROM 4)
WHERE i."code" ~ '^(AZ|NA|VE)-'
  AND NOT EXISTS (
    SELECT 1 FROM "AssessmentIndicator" AS other
    WHERE other."sectionId" = i."sectionId"
      AND other."code" = 'KPI ' || substring(i."code" FROM 4)
  );
