-- Rol de sistema "assessment_viewer" (visualizador): solo lectura en los
-- cuatro módulos de evaluación. Hasta ahora lo creaba solo el seed; con esta
-- migración existe en producción al desplegar, sin correr el seed (que
-- también toca al usuario administrador). Si ya existe, no cambia nada.
INSERT INTO "AuthRole" ("id", "organisation", "createdAt", "updatedAt", "code", "name", "description", "isSystem", "sortOrder")
SELECT gen_random_uuid()::text, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
       'assessment_viewer', 'Assessment Viewer',
       'Consulta, sin modificar, las organizaciones evaluadas que un administrador le habilita.',
       true, 0
WHERE NOT EXISTS (
  SELECT 1 FROM "AuthRole" WHERE "organisation" IS NULL AND "code" = 'assessment_viewer'
);

-- Permiso de lectura de cada módulo de evaluación (en una base nueva los
-- módulos aún no existen: el seed asigna los permisos después).
INSERT INTO "AuthRolePermission" ("id", "createdAt", "roleId", "permissionId")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, r."id", p."id"
FROM "AuthRole" r
CROSS JOIN "AppModulePermission" p
JOIN "AppModule" m ON m."id" = p."moduleId"
WHERE r."organisation" IS NULL
  AND r."code" = 'assessment_viewer'
  AND p."code" = 'read'
  AND m."code" IN ('assessment-core', 'organizational-tool', 'capacity-tool', 'risk-tool')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
