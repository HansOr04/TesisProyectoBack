# Cómo expandir el sistema

Cada receta dice qué archivos tocar, en orden. Al terminar, siempre:

```bash
npm run lint && npx tsc --noEmit && npm test && npm run test:e2e && npm run comentarios
```

En la web: `npm run lint && npm run typecheck && npm test && npm run build && npm run comentarios`.
Actualiza también el documento que corresponda.

## Cambiar el contenido, sin programar

| Qué | Dónde |
|---|---|
| Secciones, KPI, pesos, ayudas y rúbricas | La herramienta › Administrar Estructura |
| KPI que no aplican a una organización | Organizaciones › KPI aplicables |
| Umbral de riesgo por país | Riesgos › Administrar Estructura |
| Usuarios, roles y proyectos | Usuarios y permisos, Gestión de proyectos |
| Proveedor y modelo de IA, límites de exportes | Variables en Heroku |

La plantilla con la que nace un **proyecto nuevo** sí está en el código:
`assessment-core/domain/tool-templates/`. Para llevarla a uno existente está
«Reaplicar plantillas base».

## Agregar una ruta

1. DTO en `presentation/dto`, con sus validaciones.
2. Método en el servicio de `application`.
3. Método en el controlador, con su acceso:

   ```ts
   @Get(':org/assessments/mi-recurso/:id')
   @RequireAssessmentPermission('assessment-core', 'read')
   @ScopedTo('profile')
   async obtener(@Param('org') org: string, @Param('id') id: string) {
     return this.servicio.obtener(org, id);
   }
   ```

   El controlador lleva `@RequireAuthenticated()` y
   `@UseGuards(AssessmentPermissionGuard, AssessmentScopeGuard)`.
4. Filtra siempre por `organisation` y `deletedAt: null`.
5. Prueba de integración. `security-routes.e2e-spec.ts` ya comprueba que no quede
   abierta.
6. Agrega la fila en `api.md`.

Si el recurso es nuevo, suma su tipo a `AssessmentScopedResource` y su búsqueda en
`assessment-access-scope.service.ts`.

## Agregar una columna o una tabla

1. Edita `prisma/schema.prisma`. Las tablas de datos llevan `organisation` y, si se
   pueden borrar, `deletedAt`.
2. `npx prisma migrate dev --name <descripcion>`.
3. Que sea compatible con la versión en producción: columnas nuevas opcionales o con
   valor por defecto.
4. Documenta la tabla en `base-de-datos.md`.

## Agregar una herramienta por KPI

Ejemplo, `sustainability`. El motor ya trae plantillas, calificación, resumen,
medidas, reportes, IA y panel.

**Servidor**

1. Enumeración `AssessmentTool` en el esquema, con su migración.
2. `assessment.constants.ts`: `ASSESSMENT_TOOLS` y `ASSESSMENT_MODULE_CODES`.
3. Plantilla en `tool-templates/sustainability.template.ts`, exportada en `index.ts`.
4. Módulo de permisos: `ASSESSMENT_MODULES` en `prisma/seeds/assessment.seed.ts` **y**
   una migración que lo inserte en producción (modelo:
   `20261123130000_assessment_viewer_role`).
5. `organisation-provisioning.service.ts` y el seed: sumarla a las plantillas que
   recibe un proyecto.
6. Carpeta `src/modules/sustainability-tool`, copiando `organizational-tool`:
   definición, contexto de IA, servicio de IA, servicio, módulo y controlador.

   ```ts
   export const SUSTAINABILITY_TOOL_DEFINITION: EvaluationToolDefinition = {
     code: 'SUSTAINABILITY',
     slug: 'sustainability',
     displayName: 'Herramienta de Sostenibilidad',
     section: { singular: 'Eje', plural: 'Ejes', singularEn: 'Axis' },
     report: {
       subtitle: 'Diagnóstico de sostenibilidad',
       scoreLevelPrefix: 'Desempeño',
       accentColor: '7A3FA0',
     },
     strategy: new OrganizationalStrategy(),
   };
   ```

7. Impórtalo en `app.module.ts`.
8. Súmala donde se listan las tres: `assessment-dashboard.service.ts`,
   `dashboard-filter.dto.ts`, `assessment-profiles.service.ts`,
   `consolidated-plan.service.ts`, `assessment-narrative.util.ts`,
   `tool-templates/types.ts` y `assessment-analytics.service.ts`.

**Web**: ver [su guía](https://github.com/HansOr04/TesisFrontend/blob/main/docs/como-expandir.md).

Si las medidas no cuelgan de un KPI, usa de modelo `risk-tool`, que redefine
`persistResponses`, `countCriticalByEvaluation` y `countMeasuresByEvaluation`.

## Cambiar el cálculo

Implementa `ToolScoringStrategy` en `scoring.engine.ts` y asígnala en la definición de
la herramienta. Cambia igual `section-average.ts` y `simulator.ts` en la web, que
repiten la fórmula. Las evaluaciones completadas conservan su puntaje.

## Agregar un rol

1. `ASSESSMENT_ROLE_CODES` en `assessment.constants.ts`.
2. Permisos en `ASSESSMENT_ROLE_DEFS` del seed, y migración para producción.
3. Si recorta datos, una rama en `resolveProfileScope`.
4. Web: `users-api.ts`, `roles.ts`, `auth-context.tsx` y los textos.

## Agregar un proveedor de IA

1. Clase en `assessment-ai/infrastructure/providers` que cumpla `AiProvider`.
2. Caso en `ai-provider.factory.ts`.
3. Su nombre en `AI_PROVIDER` de `env.validation.ts` y sus variables en `.env.example`.

Las instrucciones, la caché y el corte no cambian.

## Agregar una capacidad de IA

1. Instrucción y método en `evaluation-tool-ai.service.ts`, con
   `ANTI_HALLUCINATION_RULE`.
2. Lectura que descarte lo que no se envió, en `evaluation-tool-ai.types.ts`, con
   pruebas.
3. Ruta con `AssessmentAiThrottlerGuard` y `@Throttle` de 10 por minuto.
4. Si va en el reporte: `completeReportJson`, dentro de los 8 segundos.

## Agregar una lámina

Función en `pptx-report.util.ts` con formas nativas y el tema del reporte, y su llamada
en `evaluation-report.builders.ts` y `risk-report.builders.ts`.

## Agregar un proveedor de acceso

Implementa `OAuthVerifierPort`, regístralo en `identity.module.ts` y agrega su ruta en
`auth.controller.ts`. Las cuentas no se crean solas: deben existir.

## Agregar un país

`contact-phone.ts` en el servidor y `LATAM_COUNTRIES` en `new.page.tsx` de la web. Si
tiene umbral propio, desde la administración de Riesgos.

## Agregar una acción auditable

Nombre en `AssessmentAuditAction` y `auditService.record(...)` después de la operación.

## Crecer en usuarios

| Límite de hoy | Qué hacer |
|---|---|
| Un solo servidor | Los límites, el cupo de exportes, el contador de errores y el corte de IA viven en memoria: antes de usar dos, moverlos a Redis |
| Tiempo real en un proceso | Adaptador de Redis para Socket.IO |
| Reportes dentro de la petición | Cola de trabajos con aviso al terminar |
| Registros cortos en Heroku | Drenaje a un servicio externo |
| PostgreSQL básico | Subir el plan; los índices ya cubren panel y críticos |
