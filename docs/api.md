# API

126 rutas. Todas menos seis exigen `Authorization: Bearer <token>`. En local hay una
versión interactiva en `/api/docs`.

- **Acceso**: `módulo:acción` es el permiso que debe tener el rol en ese proyecto.
  «Superadministrador» y «sesión» no dependen de un proyecto.
- **Recurso comprobado**: además del permiso, el recurso debe pertenecer a una
  organización que el usuario puede ver; si no, 404.
- `:org` es el identificador del proyecto.

## Reglas comunes

| Tema | Cómo funciona |
|---|---|
| Paginación | `?page=1&limit=50` (máximo 200) devuelve `{ items, total, page, limit, pages }`; sin `page`, la lista simple, hasta 500 filas |
| Confirmación | Las acciones delicadas responden 409 y se repiten con `?confirm=true` |
| Límites | 300 por minuto por usuario; IA, 10; inicio de sesión, 10 por cuenta y 120 por IP; renovación, 30 por sesión |
| Campos desconocidos | Se rechazan (400) en las rutas de proyecto |
| Identificador | `X-Request-Id` en cada respuesta |

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos |
| 401 | Sin sesión o vencida |
| 403 | Sin permiso o no es miembro |
| 404 | No existe o está fuera de su alcance |
| 409 | Conflicto o falta confirmar |
| 422 | No cumple una regla (por ejemplo, completar con KPI pendientes) |
| 429 | Demasiados intentos |
| 503 | IA no configurada, o base caída en `/health` |

## Sesión

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| POST | `/auth/login` | pública |  | Correo y contraseña |
| POST | `/auth/google` | pública |  | Google |
| POST | `/auth/refresh` | pública |  | Renueva el token de acceso |
| POST | `/auth/logout` | pública |  | Cierra la sesión |
| GET | `/auth/providers` | pública |  | Proveedores disponibles |
| GET | `/auth/me` | sesión |  | Perfil y roles por proyecto |

## Estado

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/health` | pública |  | Estado de la API y la base |

## Proyectos

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/organisations` | superadministrador |  | Proyectos propios |
| GET | `/organisations/assignable-users` | superadministrador |  | Cuentas que se pueden asignar |
| POST | `/organisations` | superadministrador |  | Crea |
| PATCH | `/organisations/:id` | superadministrador |  | Renombra |
| POST | `/organisations/:id/provision` | superadministrador |  | Reaplica las plantillas base |

## Usuarios

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/users` | `assessment-core:admin` |  | Lista |
| POST | `/:org/users` | `assessment-core:admin` |  | Crea o agrega |
| PATCH | `/:org/users/:id` | `assessment-core:admin` |  | Edita |
| PUT | `/:org/users/:id/visibility` | `assessment-core:admin` |  | Qué organizaciones ve un visualizador |
| DELETE | `/:org/users/:id` | `assessment-core:admin` |  | Saca del proyecto |

## Roles

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/assessments/roles` | `assessment-core:read` |  | Lista |
| POST | `/:org/assessments/roles` | `assessment-core:admin` |  | Asigna |
| DELETE | `/:org/assessments/roles/:id` | `assessment-core:admin` |  | Revoca |
| GET | `/:org/assessments/roles/history/:userId` | `assessment-core:admin` |  | Historial |

## Organizaciones evaluadas

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/assessments/profiles` | `assessment-core:read` |  | Lista |
| GET | `/:org/assessments/profiles/:id` | `assessment-core:read` | profile | Detalle |
| GET | `/:org/assessments/profiles/:id/children` | `assessment-core:read` | profile | Miembros de una asociación |
| GET | `/:org/assessments/profiles/:id/action-plan` | `assessment-core:read` | profile | Plan consolidado de la organización |
| POST | `/:org/assessments/profiles` | `assessment-core:write` |  | Registra |
| PATCH | `/:org/assessments/profiles/:id` | `assessment-core:write` | profile | Edita |
| DELETE | `/:org/assessments/profiles/:id` | `assessment-core:delete` | profile | Borra |
| GET | `/:org/assessments/profiles/:id/applicability` | `assessment-core:read` | profile | KPI aplicables |
| PUT | `/:org/assessments/profiles/:id/applicability` | `assessment-core:write` | profile | Reemplaza los KPI aplicables |
| GET | `/assessments/admin/all-profiles` | superadministrador |  | Organizaciones de los proyectos propios |

## Panel consolidado

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/assessments/dashboard` | `assessment-core:read` |  | Consulta el panel |
| GET | `/:org/assessments/dashboard/export` | `assessment-core:read` |  | Descarga el Excel |

## Analítica

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/assessments/analytics/overview` | `assessment-core:read` |  | Panorama |
| GET | `/:org/assessments/analytics/gaps` | `assessment-core:read` |  | Brechas sistémicas |
| GET | `/:org/assessments/analytics/correlations` | `assessment-core:read` |  | Correlaciones |
| GET | `/:org/assessments/analytics/segments` | `assessment-core:read` |  | Segmentos |
| GET | `/:org/assessments/analytics/effectiveness` | `assessment-core:read` |  | Efectividad de las medidas |
| GET | `/:org/assessments/analytics/clusters` | `assessment-core:read` |  | Tipologías |
| GET | `/:org/assessments/analytics/benchmark/:profileId` | `assessment-core:read` |  | Posición de una organización frente al conjunto |

## Auditoría

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/activity-logs` | `assessment-core:admin` |  | Lista |

## Herramienta Organizativa

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/assessments/organizational/organisations-overview` | `organizational-tool:read` |  | Panel general de la herramienta |
| GET | `/:org/assessments/organizational/templates` | `organizational-tool:read` |  | Versiones de la plantilla |
| GET | `/:org/assessments/organizational/templates/:id` | `organizational-tool:read` |  | Una versión |
| POST | `/:org/assessments/organizational/templates/:id/sections` | `organizational-tool:admin` |  | Agrega sección |
| PATCH | `/:org/assessments/organizational/sections/:id` | `organizational-tool:admin` |  | Edita sección (`?confirm=true` si ya se calificó) |
| DELETE | `/:org/assessments/organizational/sections/:id` | `organizational-tool:admin` |  | Borra sección |
| POST | `/:org/assessments/organizational/sections/:id/indicators` | `organizational-tool:admin` |  | Agrega KPI |
| PATCH | `/:org/assessments/organizational/indicators/:id` | `organizational-tool:admin` |  | Edita KPI |
| DELETE | `/:org/assessments/organizational/indicators/:id` | `organizational-tool:admin` |  | Desactiva KPI |
| POST | `/:org/assessments/organizational/evaluations` | `organizational-tool:write` | profile | Inicia o recupera la evaluación en curso |
| GET | `/:org/assessments/organizational/evaluations` | `organizational-tool:read` |  | Lista evaluaciones |
| GET | `/:org/assessments/organizational/evaluations/:id` | `organizational-tool:read` | evaluation | Detalle con puntajes |
| PUT | `/:org/assessments/organizational/evaluations/:id/responses` | `organizational-tool:write` | evaluation | Guarda calificaciones |
| POST | `/:org/assessments/organizational/evaluations/:id/complete` | `organizational-tool:write` | evaluation | Completa la evaluación |
| GET | `/:org/assessments/organizational/evaluations/:id/summary` | `organizational-tool:read` | evaluation | Resumen |
| GET | `/:org/assessments/organizational/evaluations/:id/summary/export` | `organizational-tool:read` | evaluation | Excel |
| POST | `/:org/assessments/organizational/evaluations/:id/summary/export-pptx` | `organizational-tool:read` | evaluation | Presentación |
| GET | `/:org/assessments/organizational/profiles/:profileId/evaluation-history` | `organizational-tool:read` | profile | Historial |
| GET | `/:org/assessments/organizational/evaluations/:id/measures` | `organizational-tool:read` | evaluation | Medidas |
| POST | `/:org/assessments/organizational/evaluations/:id/measures` | `organizational-tool:write` | evaluation | Crea medida |
| PATCH | `/:org/assessments/organizational/measures/:id` | `organizational-tool:write` | indicator-measure | Registra avance |
| POST | `/:org/assessments/organizational/evaluations/:id/responses/:indicatorId/improve-observation` | `organizational-tool:write` | evaluation | Mejora una observación (IA) |
| POST | `/:org/assessments/organizational/evaluations/:id/dimensions/:number/suggest-measures` | `organizational-tool:write` | evaluation | Sugiere medidas para una sección (IA) |
| POST | `/:org/assessments/organizational/evaluations/:id/suggest-measures` | `organizational-tool:write` | evaluation | Sugiere el plan completo (IA) |
| GET | `/:org/assessments/organizational/evaluations/:id/impact-priority` | `organizational-tool:read` | evaluation | Prioridad de impacto |
| POST | `/:org/assessments/organizational/evaluations/:id/detect-inconsistencies` | `organizational-tool:write` | evaluation | Busca contradicciones (IA) |
| POST | `/:org/assessments/organizational/evaluations/:id/executive-narrative` | `organizational-tool:write` | evaluation | Narrativa ejecutiva (IA) |

## Herramienta Capacidades

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/assessments/capacity/organisations-overview` | `capacity-tool:read` |  | Panel general de la herramienta |
| GET | `/:org/assessments/capacity/templates` | `capacity-tool:read` |  | Versiones de la plantilla |
| GET | `/:org/assessments/capacity/templates/:id` | `capacity-tool:read` |  | Una versión |
| POST | `/:org/assessments/capacity/templates/:id/sections` | `capacity-tool:admin` |  | Agrega sección |
| PATCH | `/:org/assessments/capacity/sections/:id` | `capacity-tool:admin` |  | Edita sección (`?confirm=true` si ya se calificó) |
| DELETE | `/:org/assessments/capacity/sections/:id` | `capacity-tool:admin` |  | Borra sección |
| POST | `/:org/assessments/capacity/sections/:id/indicators` | `capacity-tool:admin` |  | Agrega KPI |
| PATCH | `/:org/assessments/capacity/indicators/:id` | `capacity-tool:admin` |  | Edita KPI |
| DELETE | `/:org/assessments/capacity/indicators/:id` | `capacity-tool:admin` |  | Desactiva KPI |
| POST | `/:org/assessments/capacity/evaluations` | `capacity-tool:write` | profile | Inicia o recupera la evaluación en curso |
| GET | `/:org/assessments/capacity/evaluations` | `capacity-tool:read` |  | Lista evaluaciones |
| GET | `/:org/assessments/capacity/evaluations/:id` | `capacity-tool:read` | evaluation | Detalle con puntajes |
| PUT | `/:org/assessments/capacity/evaluations/:id/responses` | `capacity-tool:write` | evaluation | Guarda calificaciones |
| POST | `/:org/assessments/capacity/evaluations/:id/complete` | `capacity-tool:write` | evaluation | Completa la evaluación |
| GET | `/:org/assessments/capacity/evaluations/:id/summary` | `capacity-tool:read` | evaluation | Resumen |
| GET | `/:org/assessments/capacity/evaluations/:id/summary/export` | `capacity-tool:read` | evaluation | Excel |
| POST | `/:org/assessments/capacity/evaluations/:id/summary/export-pptx` | `capacity-tool:read` | evaluation | Presentación |
| GET | `/:org/assessments/capacity/profiles/:profileId/evaluation-history` | `capacity-tool:read` | profile | Historial |
| GET | `/:org/assessments/capacity/evaluations/:id/measures` | `capacity-tool:read` | evaluation | Medidas |
| POST | `/:org/assessments/capacity/evaluations/:id/measures` | `capacity-tool:write` | evaluation | Crea medida |
| PATCH | `/:org/assessments/capacity/measures/:id` | `capacity-tool:write` | indicator-measure | Registra avance |
| POST | `/:org/assessments/capacity/evaluations/:id/responses/:indicatorId/improve-observation` | `capacity-tool:write` | evaluation | Mejora una observación (IA) |
| POST | `/:org/assessments/capacity/evaluations/:id/areas/:number/suggest-measures` | `capacity-tool:write` | evaluation | Sugiere medidas para una sección (IA) |
| POST | `/:org/assessments/capacity/evaluations/:id/suggest-measures` | `capacity-tool:write` | evaluation | Sugiere el plan completo (IA) |
| GET | `/:org/assessments/capacity/evaluations/:id/impact-priority` | `capacity-tool:read` | evaluation | Prioridad de impacto |
| POST | `/:org/assessments/capacity/evaluations/:id/detect-inconsistencies` | `capacity-tool:write` | evaluation | Busca contradicciones (IA) |
| POST | `/:org/assessments/capacity/evaluations/:id/executive-narrative` | `capacity-tool:write` | evaluation | Narrativa ejecutiva (IA) |

## Herramienta de Riesgos

| Método | Ruta | Acceso | Recurso comprobado | Qué hace |
|---|---|---|---|---|
| GET | `/:org/assessments/risk/organisations-overview` | `risk-tool:read` |  | Panel general de la herramienta |
| GET | `/:org/assessments/risk/country-params` | `risk-tool:read` |  | Umbrales por país |
| PUT | `/:org/assessments/risk/country-params` | `risk-tool:admin` |  | Define el umbral de un país |
| DELETE | `/:org/assessments/risk/country-params/:country` | `risk-tool:admin` |  | Vuelve al umbral de la plantilla |
| GET | `/:org/assessments/risk/templates` | `risk-tool:read` |  | Versiones de la plantilla |
| GET | `/:org/assessments/risk/templates/:id` | `risk-tool:read` |  | Una versión |
| POST | `/:org/assessments/risk/templates/:id/sections` | `risk-tool:admin` |  | Agrega sección |
| PATCH | `/:org/assessments/risk/sections/:id` | `risk-tool:admin` |  | Edita sección (`?confirm=true` si ya se calificó) |
| DELETE | `/:org/assessments/risk/sections/:id` | `risk-tool:admin` |  | Borra sección |
| POST | `/:org/assessments/risk/sections/:id/indicators` | `risk-tool:admin` |  | Agrega KPI |
| PATCH | `/:org/assessments/risk/indicators/:id` | `risk-tool:admin` |  | Edita KPI |
| DELETE | `/:org/assessments/risk/indicators/:id` | `risk-tool:admin` |  | Desactiva KPI |
| POST | `/:org/assessments/risk/evaluations` | `risk-tool:write` | profile | Inicia o recupera la evaluación en curso |
| GET | `/:org/assessments/risk/evaluations` | `risk-tool:read` |  | Lista evaluaciones |
| GET | `/:org/assessments/risk/evaluations/:id` | `risk-tool:read` | evaluation | Detalle con puntajes |
| PUT | `/:org/assessments/risk/evaluations/:id/responses` | `risk-tool:write` | evaluation | Guarda calificaciones |
| POST | `/:org/assessments/risk/evaluations/:id/complete` | `risk-tool:write` | evaluation | Completa la evaluación |
| GET | `/:org/assessments/risk/evaluations/:id/summary` | `risk-tool:read` | evaluation | Resumen |
| GET | `/:org/assessments/risk/profiles/:profileId/evaluation-history` | `risk-tool:read` | profile | Historial |
| GET | `/:org/assessments/risk/evaluations/:id/risks` | `risk-tool:read` | evaluation | Riesgos y medidas |
| POST | `/:org/assessments/risk/risks/:riskId/measures` | `risk-tool:write` | risk | Crea medida |
| PATCH | `/:org/assessments/risk/measures/:id` | `risk-tool:write` | mitigation-measure | Registra avance |
| GET | `/:org/assessments/risk/evaluations/:id/gantt` | `risk-tool:read` | evaluation | Cronograma |
| GET | `/:org/assessments/risk/evaluations/:id/mitigation-plan/export` | `risk-tool:read` | evaluation | Excel del plan |
| POST | `/:org/assessments/risk/evaluations/:id/mitigation-plan/export-pptx` | `risk-tool:read` | evaluation | Presentación |
| POST | `/:org/assessments/risk/evaluations/:id/responses/:indicatorId/improve-observation` | `risk-tool:write` | evaluation | Mejora una observación (IA) |
| POST | `/:org/assessments/risk/evaluations/:id/principles/:number/suggest-measures` | `risk-tool:write` | evaluation | Sugiere medidas para una sección (IA) |
| POST | `/:org/assessments/risk/evaluations/:id/suggest-measures` | `risk-tool:write` | evaluation | Sugiere el plan completo (IA) |
| GET | `/:org/assessments/risk/evaluations/:id/impact-priority` | `risk-tool:read` | evaluation | Prioridad de impacto |
| POST | `/:org/assessments/risk/evaluations/:id/detect-inconsistencies` | `risk-tool:write` | evaluation | Busca contradicciones (IA) |
| POST | `/:org/assessments/risk/evaluations/:id/executive-narrative` | `risk-tool:write` | evaluation | Narrativa ejecutiva (IA) |

## Tiempo real

Socket.IO, espacio `/assessments`, token en `auth.token`.

| Evento | Sentido | Datos |
|---|---|---|
| `join` | Cliente → servidor | `{ org, evaluationId }` |
| `leave` | Cliente → servidor | `{ evaluationId }` |
| `score.updated` | Servidor → cliente | `{ evaluationId, indicatorIds, scoredBy }` |
| `error` | Servidor → cliente | `{ message }` |
