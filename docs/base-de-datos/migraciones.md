# Migraciones, datos iniciales y consultas

## Migraciones

En `prisma/migrations`, en orden. **Nunca se edita una publicada**: Prisma guarda
su suma de verificación.

| Migración | Qué hizo |
|---|---|
| `20260920160525_init` | Modelo inicial |
| `20260920213326_measure_outcomes` | Resultado esperado y mejoras aplicadas en las medidas |
| `20260921143640_tenant_foreign_keys` | Claves foráneas al proyecto |
| `20260921160000_single_indicator_measure_table` | Una sola tabla de medidas por KPI |
| `20260921190151_refresh_tokens` | Tokens de renovación |
| `20260921192346_risk_country_params` | Umbrales de riesgo por país |
| `20260928024129_add_manual_critical_flag` | Marca manual de KPI crítico |
| `20261116120000_organisation_creator` | Superadministrador dueño del proyecto |
| `20261117120000_indicator_code_kpi_prefix` | Códigos de KPI de `AZ-`, `NA-` y `VE-` a `KPI x.y` |
| `20261123120000_ai_response_cache` | Caché de respuestas de IA |
| `20261123130000_assessment_viewer_role` | Rol visualizador |

**Crear una:** editar el esquema y `npx prisma migrate dev --name <descripcion>`.
Heroku la aplica antes de arrancar la versión nueva, así que debe ser compatible
con la que está corriendo: primero se agrega, después se usa y al final se quita.

## Datos iniciales

| Comando | Qué crea |
|---|---|
| `npx prisma db seed` | Módulos, permisos, roles, proyecto demo, plantillas y dos cuentas. Se puede repetir |
| `npm run prisma:seed:demo` | Organizaciones «Demo —» con evaluaciones y medidas. Siempre los mismos datos (semilla fija) |
| `npm run prisma:seed:prod` | Entorno real: el proyecto y un superadministrador, sin cuentas de prueba |

## Consultas útiles

```sql
SELECT p.name, t.tool, e."globalScore", e."completedAt"
FROM "AssessmentEvaluation" e
JOIN "AssessmentOrganisationProfile" p ON p.id = e."profileId"
JOIN "AssessmentTemplate" t ON t.id = e."templateId"
WHERE e.organisation = '<proyecto>' AND e.status = 'COMPLETED' AND e."deletedAt" IS NULL
ORDER BY e."completedAt" DESC;

SELECT i.code, i.name, count(*)
FROM "AssessmentResponse" r
JOIN "AssessmentIndicator" i ON i.id = r."indicatorId"
JOIN "AssessmentEvaluation" e ON e.id = r."evaluationId"
WHERE e.organisation = '<proyecto>' AND r."isCritical"
GROUP BY 1, 2 ORDER BY 3 DESC;
```
