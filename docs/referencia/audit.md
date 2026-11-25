# audit


## Dominio

### activity-log.types.ts

`src/modules/audit/domain/activity-log.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ACTIVITY_LOG_LEVELS` | constante | Niveles |
| `ActivityLogLevel` | tipo |  |
| `ACTIVITY_LOG_SOURCE_TYPES` | constante | Orígenes |
| `ActivityLogSourceType` | tipo |  |
| `ActivityLogInput` | tipo |  |
| `SYSTEM_USER_ID` | constante | Usuario técnico al que se atribuyen acciones sin autor (seeds, jobs). |


## Aplicación

### activity-log-query.service.ts

`src/modules/audit/application/activity-log-query.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ActivityLogFilter` | tipo |  |
| `ActivityLogQueryService` | clase | Consulta paginada de la auditoría de una organización (solo administradores). |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(organisation, filter)` | público | Registros filtrados y paginados |

### activity-log.service.ts

`src/modules/audit/application/activity-log.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ActivityLogService` | clase | Registro de auditoría en BD. Nunca lanza hacia el caso de uso que lo llama: una falla al auditar no debe deshacer la operación de negocio ya hecha. |

| Método | Acceso | Qué hace |
|---|---|---|
| `createActivityLog(data)` | público | Guarda un registro sin interrumpir la operación |
| `resolveAuthor(createdById?)` | interno |  |
| `preview(data)` | interno |  |

### audit-retention.service.ts

`src/modules/audit/application/audit-retention.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuditRetentionService` | clase | Política de retención de la auditoría: los registros más antiguos que ACTIVITY_LOG_RETENTION_MONTHS (24 por defecto) se purgan cada noche. Los refresh tokens vencidos/revocados se limpian en la misma pasada. |

| Método | Acceso | Qué hace |
|---|---|---|
| `cutoffDate()` | público | Fecha límite de conservación |
| `runScheduled()` | público | `CRON CronExpression.EVERY_DAY_AT_3AM`. Tarea nocturna |
| `purge()` | público | Borra lo vencido |


## Presentación

### activity-log.controller.ts

`src/modules/audit/presentation/activity-log.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ActivityLogController` | clase | Ruta de consulta de la auditoría |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(org, query)` | público | `GET :org/activity-logs`. Consulta paginada de la auditoría (administradores de evaluación). |

### activity-log.dto.ts

`src/modules/audit/presentation/activity-log.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ActivityLogQueryDto` | clase | Filtros de la consulta |


## Módulo

### audit.module.ts

`src/modules/audit/audit.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuditModule` | clase | Auditoría y su retención |
