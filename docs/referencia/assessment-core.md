# assessment-core


## Dominio

### assessment-narrative.util.ts

`src/modules/assessment-core/domain/assessment-narrative.util.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentNarrativeTool` | tipo |  |
| `AssessmentNarrativeProfile` | tipo |  |
| `AssessmentNarrativeSection` | tipo |  |
| `buildExecutiveNarrative(profile, sections, tool)` | función | Resumen ejecutivo determinístico (sin IA) a partir de los datos de perfil (inicio de actividades, socios, producto, mercados) + los porcentajes de cumplimiento por sección de la evaluación (weightedAvg/10 -> %). Sirve como narrativa por defecto del reporte cuando no se provee una manual/IA, para que el "Resumen Ejecutivo" nunca quede en blanco. |

Campos:

- `AssessmentNarrativeProfile.type`: "ASSOCIATION" \| "COMPANY"
- `AssessmentNarrativeSection.weightedAvg`: 0-10

Notas:

- `buildExecutiveNarrative`: Sin el punto final, que la oración ya agrega ("EE. UU." quedaba "EE. UU..").

### assessment.constants.ts

`src/modules/assessment-core/domain/assessment.constants.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ASSESSMENT_TOOLS` | constante | Vocabulario compartido por las tres herramientas y el núcleo. |
| `AssessmentToolCode` | tipo |  |
| `ASSESSMENT_MODULE_CODES` | constante | Códigos de los módulos de permisos |
| `ASSESSMENT_PERMISSION_CODES` | constante | Acciones: read, write, delete, admin |
| `ASSESSMENT_ROLE_CODES` | constante | Roles de sistema |
| `AssessmentRoleCode` | tipo |  |
| `ViewerVisibility` | tipo | Qué organizaciones evaluadas ve un visualizador. Se guarda en `AuthUserRole.customPermissions` de su rol `assessment_viewer`. Sin configurar no ve ninguna: el administrador decide qué habilitarle. |
| `readViewerVisibility(raw)` | función | Lee la visibilidad guardada de un visualizador |
| `ACTIVE_EVALUATION_STATUSES` | constante | Estados en curso |
| `CRITICAL_THRESHOLD` | constante | score &lt;= 5 ⇒ KPI crítico (regla transversal RF-03/04/05). |

### contact-phone.ts

`src/modules/assessment-core/domain/contact-phone.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PHONE_DIGITS_BY_DIAL_CODE` | constante | Teléfono de contacto de una organización evaluada: "+&lt;prefijo> &lt;número nacional>", como lo arma el asistente del frontend. La cantidad de dígitos del número nacional (celular, sin el 0 de marcación nacional) depende del país: con 9 fijos para todos, un celular de Colombia (10) no se podía registrar. Misma tabla que LATAM_COUNTRIES en el asistente. |
| `OTHER_MIN_DIGITS` (interno) | constante | Un prefijo que no está en la tabla (un cliente de la API, no el asistente) se acepta con el largo de un número nacional cualquiera de la región. |
| `isValidContactPhone(value)` | función | Valida el teléfono según los dígitos de su país |

Notas:

- República Dominicana
- Perú
- México
- Cuba
- Argentina
- Brasil
- Chile
- Colombia
- Venezuela
- Bolivia
- Ecuador
- Paraguay
- Uruguay
- Guatemala
- El Salvador
- Honduras
- Nicaragua
- Costa Rica
- Panamá
- Haití

### scoring.engine.ts

`src/modules/assessment-core/domain/scoring.engine.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `SectionScoreInput` | tipo |  |
| `AssessmentRiskClass` | tipo |  |
| `ToolScoringStrategy` | tipo |  |
| `OrganizationalStrategy` | clase | Promedios ponderados con dos decimales |
| `CapacityStrategy` | clase | Capacity: mismo cálculo que Organizational, distinto etiquetado (doc 03 §2 F2-B05). |
| `RiskStrategy` | clase | Risk: mismo cálculo que Organizational, más clasificación de riesgo por umbral (RF-05). |

| Método | Acceso | Qué hace |
|---|---|---|
| `sectionAverage(section)` | público | Promedio de los KPI por su peso |
| `globalScore(sections)` | público | Promedio de las secciones por su peso |
| `isCritical(score)` | público | Crítico si la nota es 5 o menos |
| `classifyRisk(score, threshold)` | público | Despreciable si la nota supera el umbral |

Campos:

- `ToolScoringStrategy.sectionAverage`: Promedio ponderado de los KPI de una sección, por peso de KPI.
- `ToolScoringStrategy.globalScore`: Promedio ponderado de las secciones, por peso de sección.
- `ToolScoringStrategy.isCritical`: score &lt;= 5 ⇒ coloreado automático de KPI crítico (regla transversal RF-03/04/05).

### _placeholder.ts

`src/modules/assessment-core/domain/tool-templates/_placeholder.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `buildPlaceholderIndicators(codePrefix, sectionNumber, sectionName, count)` | función | Generador de KPI de relleno. No se usa |

### capacity.template.ts

`src/modules/assessment-core/domain/tool-templates/capacity.template.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IndicatorSeed` (interno) | tipo | KPI reales de la Herramienta de Capacidades (Análisis de Capacidades), transcritos del Excel original de la herramienta (nombre, cálculo del indicador y peso exactos, tal como los pasó el usuario desde su hoja de cálculo fuente). Al igual que Organizational (73 KPI) y Risk (46 KPI), este contenido es real, no genérico: 30 KPI reales (11+6+9+4) con su peso real de ponderación dentro de cada sección (no 65 como estimaba la documentación de arquitectura antes de validar contra el Excel). helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) requerido(s), qué campos debe tener cada uno, quién lo firma/llena, formato esperado, y dónde verificarlo. No usa sintaxis markdown (el texto se renderiza en un &lt;p> plano con whitespace-pre-line, así que el formato es solo saltos de línea + numeración/guiones). scoringRubric: rúbrica de 5 bandas ESPECÍFICA de ese KPI (no genérica), con criterios concretos por puntaje. Ambos grounded en el marco normativo de debida diligencia aplicable — DDS vía TRACES, corte de no deforestación 31/12/2020, geolocalización obligatoria por parcela (Art. 9) — y el marco legal ecuatoriano aplicable: Certificado de No Afectación (MAATE, Sistema SAF), licencias de aprovechamiento forestal (MAATE/MAG), Código Orgánico del Ambiente (COA), Código de Trabajo, IESS, SRI y registro de trazabilidad de productores (Agrocalidad/MAG, Sistema SAC). |
| `CAPACITY_TOOL_TEMPLATE` | constante | Plantilla con los 30 KPI |
| `CAPACITY_TOOL_KPI_COUNT` | constante | Total de KPI, para comprobarlo |

### organizational.template.ts

`src/modules/assessment-core/domain/tool-templates/organizational.template.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IndicatorSeed` (interno) | tipo | KPI reales de la Herramienta Organizativa (Diagnóstico Asociativo), transcritos del Excel original de la herramienta (HERRAMIENTA ORGANIZATIONAL DIAGNOSTICO ASOCIATIVO_V3_2025.xlsm, hoja "DATA 6 DIM"): nombre, cálculo del indicador y peso exactos por KPI dentro de cada dimensión (los 6 totales de peso ya suman 100 en el archivo fuente). 73 KPI en 6 dimensiones. helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) o registro(s) requerido(s), qué campos debe tener, quién lo firma/llena, y dónde/cómo verificarlo. A diferencia de Capacidades/Riesgos, Organizational no evalúa cumplimiento legal sino fortalecimiento organizativo (capacidad de la asociación de sostener ese cumplimiento en el tiempo: gobernanza, finanzas, personal, mercado) — por eso los documentos son administrativos/organizativos (actas, contratos, roles de pago, balances, manuales), no permisos ambientales. No usa sintaxis markdown (el texto se renderiza en un &lt;p> plano con whitespace-pre-line). scoringRubric: rúbrica de 5 bandas ESPECÍFICA de cada KPI (no genérica) con umbrales/criterios concretos derivados del propio cálculo del indicador en el Excel original. |
| `ORGANIZATIONAL_TOOL_TEMPLATE` | constante | Plantilla con los 73 KPI |
| `ORGANIZATIONAL_TOOL_KPI_COUNT` | constante | Total de KPI, para comprobarlo |

### risk.template.ts

`src/modules/assessment-core/domain/tool-templates/risk.template.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IndicatorSeed` (interno) | tipo | KPI reales de la Herramienta de Riesgos (Gestión de Riesgos), transcritos del Excel original de la herramienta (HERRAMIENTA GESTION DE RIESGOS_V3_2025.xlsm, hoja "DATA UE LDD (2)"): nombre, cálculo del indicador y peso exactos por KPI dentro de cada principio (los 4 totales de peso ya suman 100 en el archivo fuente). 46 KPI en 4 principios. helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) requerido(s), qué campos debe tener cada uno, quién lo firma/llena, formato esperado, y dónde verificarlo. No usa sintaxis markdown (el texto se renderiza en un &lt;p> plano con whitespace-pre-line: el formato es solo saltos de línea + numeración/guiones). scoringRubric: rúbrica de 5 bandas ESPECÍFICA de cada KPI (no genérica), grounded en el marco normativo de debida diligencia aplicable y el marco legal ecuatoriano aplicable (RUC/SRI, Código del Trabajo, IESS, MAATE, ECUAPASS, Registro de la Propiedad, SENAGUA). |
| `COUNTRY_RISK_PARAMS` (interno) | constante | RF-02: el país de la organización evaluada determina los parámetros de riesgo. EC como entrada inicial (única jurisdicción del piloto de la tesis). |
| `RISK_TOOL_TEMPLATE` | constante | Plantilla con los 46 KPI |
| `RISK_TOOL_KPI_COUNT` | constante | Total de KPI, para comprobarlo |

### types.ts

`src/modules/assessment-core/domain/tool-templates/types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentSeedIndicator` | tipo |  |
| `AssessmentSeedSection` | tipo |  |
| `AssessmentCountryRiskParams` | tipo |  |
| `AssessmentSeedTemplate` | tipo |  |

Campos:

- `AssessmentSeedIndicator.code`: p.ej. "KPI 1.3"
- `AssessmentSeedIndicator.helpText`: qué documento/proceso concreto debe existir para este KPI
- `AssessmentSeedIndicator.scoringRubric`: nota específica de este KPI, complementa la rúbrica genérica 1-10
- `AssessmentSeedIndicator.weight`: peso del KPI dentro de la sección
- `AssessmentSeedSection.number`: dimensión (Organizational) \| área estratégica (Capacity) \| principio (Risk)
- `AssessmentSeedSection.weight`: peso de la sección en el promedio ponderado global
- `AssessmentSeedTemplate.riskThreshold`: Risk únicamente (RF-02): el país de la organización evaluada determina el umbral de despreciabilidad efectivo. countryRiskParams[profile.country] ?? riskThreshold.


## Aplicación

### assessment-access-scope.service.ts

`src/modules/assessment-core/application/assessment-access-scope.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentProfileScope` | tipo | Recorte de las organizaciones evaluadas (perfiles) que ve un usuario. Es un filtro de Prisma sobre AssessmentOrganisationProfile, por eso se puede esparcir en un `where` de perfil o anidar como `profile: scope`: - `{}`: sin recorte (superadministrador dueño, administrador o visualizador con todas las organizaciones habilitadas). - `evaluatorId`: evaluador, solo las organizaciones asignadas a él. - `AND: [{ id: { in } }]`: visualizador, solo las que le habilitaron. Va dentro de `AND` para no pisar un `id` del `where` que lo recibe. |
| `AssessmentScopedResource` | tipo | Recursos que cuelgan de una organización evaluada (perfil). |
| `isUnrestrictedScope(scope)` | función | Si el alcance no recorta nada |
| `AssessmentAccessScopeService` | clase | RF-07 (F6-B03): un usuario con rol assessment_evaluator solo debe ver los perfiles de organización que tiene asignados (evaluatorId), mientras que assessment_admin y el superadministrador dueño del proyecto ven todos. El visualizador (assessment_viewer) solo lee, y ve las organizaciones que un administrador le habilitó. La distinción no es un permiso nuevo sino un recorte de datos, por eso se resuelve aquí y se aplica como filtro Prisma en cada endpoint de listado en lugar de vivir en el guard de permisos. Las rutas que reciben el id de un recurso concreto lo comprueban con assertInScope (vía AssessmentScopeGuard). |

| Método | Acceso | Qué hace |
|---|---|---|
| `resolveProfileScope(organisation, userId, isSuperAdmin)` | público | Calcula qué organizaciones ve el usuario según su rol |
| `assertInScope(organisation, scope, resource, id)` | público | Con alcance recortado, el recurso tiene que colgar de una organización evaluada que el usuario puede ver. Responde 404, como la ficha de una organización ajena, para no revelar que el recurso existe. |
| `profileOf(organisation, resource, id)` | interno |  |

### assessment-applicability.service.ts

`src/modules/assessment-core/application/assessment-applicability.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentProfileApplicability` | tipo |  |
| `AssessmentApplicabilityService` | clase | RF-02/03/04/05: aplicabilidad por organización — un perfil puede marcar secciones/indicadores completos como "no aplica" (p.ej. "aplica solo si la organización realiza aprovechamiento forestal"), independiente de la plantilla compartida por el resto de organizaciones del mismo tenant. No depende de AssessmentProfilesService a propósito: así puede añadirse como provider standalone en cada módulo de herramienta (Organizativa/Riesgos/Capacity) sin arrastrar el resto del grafo de AssessmentCoreModule. |

| Método | Acceso | Qué hace |
|---|---|---|
| `assertProfileExists(organisation, profileId)` | interno |  |
| `get(organisation, profileId)` | público | Exclusiones de una organización |
| `set(organisation, profileId, dto, updatedBy?)` | público | Reemplaza sus exclusiones |
| `expandExclusions(profileIds)` | interno | Las exclusiones se guardan por id de sección/indicador, pero cada versión de plantilla crea filas nuevas con ids nuevos. Sin expandir, marcar "no aplica" sobre la plantilla activa no tendría efecto en una evaluación que corre sobre una versión anterior — que es justo lo que pasaba en producción: TSAPAU evaluaba con la v1 y el diálogo editaba la v2. Lo que identifica de verdad a un KPI entre versiones es su código, y a una sección su número. Se expande por ahí, acotado siempre a la misma organización y herramienta: desde que los códigos son "KPI X.Y" en las tres herramientas, sin acotar por herramienta excluir "KPI 1.1" en Organizativa también lo excluiría en Capacidades y en Riesgos. |
| `resolveExcludedIndicatorIds(profileId)` | público | Usado por los servicios de scoring de cada herramienta: expande la exclusión por sección (todos sus indicadores) + la exclusión directa por indicador en un único Set de indicatorId no aplicables para el perfil. |
| `resolveExcludedSectionIds(profileId)` | público | Secciones que no aplican |
| `resolveExcludedIndicatorIdsForProfiles(profileIds)` | público | Versiones por lote (evitan N+1 en paneles): { profileId → Set&lt;id> }. |
| `resolveExcludedSectionIdsForProfiles(profileIds)` | público | Lo mismo para varias organizaciones |

Notas:

- `expandExclusions`: Todas las secciones/indicadores equivalentes, en cualquier versión.

### assessment-audit.service.ts

`src/modules/assessment-core/application/assessment-audit.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAuditAction` | tipo | Wrapper fino y tipado sobre ActivityLogService: cada acción auditable de Assessment tiene un nombre estable que el historial de roles y los reportes pueden consultar. Nuevos bloques extienden AssessmentAuditAction sin tocar el resto del servicio. |
| `AssessmentAuditService` | clase | Registra las acciones auditables con nombre estable |

| Método | Acceso | Qué hace |
|---|---|---|
| `record(organisation, action, entityData, createdById?)` | público | Guarda una acción con su autor, IP e identificador de petición |

### assessment-dashboard.service.ts

`src/modules/assessment-core/application/assessment-dashboard.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentDashboardToolSummary` | tipo |  |
| `AssessmentDashboardRow` | tipo |  |
| `AssessmentDashboardService` | clase | Panel consolidado: una fila por organización con el estado de las 3 herramientas. Consultas por lote (una por herramienta + una por tipo de exclusión + una por tipo de medida) en vez de N consultas por perfil, para que el coste no crezca con el número de organizaciones. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getDashboard(organisation, filters, scope)` | público | Filas del panel consolidado con filtros y alcance |
| `loadMeasuredIndicators(organizationalEvaluationIds, capacityEvaluationIds)` | interno |  |
| `summarize(tool, evaluation, excludedSectionIds, excludedIndicatorIds, measuredIndicatorIds)` | interno |  |
| `matchesFilters(row, filters)` | interno |  |

Notas:

- `getDashboard`: Última evaluación por perfil y herramienta, en una consulta por herramienta.

### assessment-profiles.service.ts

`src/modules/assessment-core/application/assessment-profiles.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ToolScoreSnapshot` (interno) | tipo | RF-02: CRUD de organizaciones evaluadas (AssessmentOrganisationProfile). |
| `AssessmentProfilesService` | clase | Organizaciones evaluadas |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(organisation, scope, query)` | público | Lista dentro del alcance |
| `listAllForAdmin(actorId)` | público | RF-08: vista cross-organización para el Administrador de plataforma (isSuperAdmin global). Excluye los perfiles marcados `confidential` — ni siquiera el superadmin los ve aquí; la organización dueña sigue viéndolos normalmente en su propio `:org/assessments/profiles`. |
| `get(organisation, id, scope)` | público | Una organización del proyecto o 404 |
| `validateParentProfile(organisation, parentProfileId, childIsLevel2, excludeId?)` | interno | Una asociación Nivel 2 (associationLevel="LEVEL_2") puede agrupar empresas y/o asociaciones Nivel 1 como miembros (parentProfileId). No se permite anidar una Nivel 2 dentro de otra ni que un perfil sea su propio padre. |
| `create(organisation, dto, createdBy?)` | público | Registra (o revive) una organización |
| `update(organisation, id, dto, updatedBy?)` | público | Actualiza sus datos |
| `delete(organisation, id, confirm, deletedBy?)` | público | Borrado lógico; pide confirmar si tiene evaluaciones activas |
| `getToolScores(organisation, profileId)` | interno | Último puntaje persistido (AssessmentEvaluation.globalScore) por herramienta para un perfil — no se recalcula en vivo aquí para no acoplar assessment-core a los servicios de cada herramienta; refleja el último resultado guardado al completar la evaluación. |
| `getToolScoresForProfiles(organisation, profileIds)` | interno | Una sola consulta para todos los perfiles: se trae cada evaluación (más reciente primero) y se conserva la primera por (perfil, herramienta). |
| `getAssociationOverview(organisation, parentProfileId, scope)` | público | Panel de una asociación: sus propios puntajes (se evalúa igual que cualquier perfil) + las empresas/asociaciones Nivel 1 vinculadas (parentProfileId) con el puntaje de cada una por herramienta. |

Notas:

- `create`: El índice único (organisation, name) no excluye los borrados: una organización borrada con ese mismo nombre se revive con upsert en lugar de crearse, o la base la rechaza (P2002) aunque para el usuario el nombre esté libre.
- `create`: Prisma ignora los campos undefined al actualizar: al revivir una fila borrada, los opcionales que no llegan se limpian a null para no dejar el valor anterior.

### assessment-roles.service.ts

`src/modules/assessment-core/application/assessment-roles.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentRolesService` | clase | RF-01: administrador y evaluador Assessment sobre el subsistema real de autorización (AuthRole/AuthUserRole) — ver doc 03 §2.0. No se crea un modelo propio de roles. |

| Método | Acceso | Qué hace |
|---|---|---|
| `listActive(organisation)` | público | Asignaciones vigentes |
| `assign(organisation, userId, roleCode, assignedBy?)` | público | Asigna un rol |
| `revoke(organisation, id, confirm, revokedBy?)` | público | Revoca un rol; pide confirmar si hay evaluaciones activas |
| `history(organisation, userId)` | público | Historial de roles de un usuario |

Notas:

- `assign`: El índice único (organisation, userId, roleId) no excluye las revocadas: una asignación revocada se revive con upsert en lugar de crearse, o la base la rechaza (P2002).
- `history`: El historial incluye asignaciones revocadas (deletedAt != null), por eso aquí no se filtra por deletedAt.

### consolidated-plan.service.ts

`src/modules/assessment-core/application/consolidated-plan.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ConsolidatedPlanScope` | tipo | Alcance del Gantt que se pide al exportar el reporte: - `tool`: solo el plan de la evaluación que se está exportando. - `organisation`: las tres herramientas de esa organización evaluada. - `project`: todas las organizaciones del proyecto. |
| `CONSOLIDATED_PLAN_SCOPES` | constante | Alcances admitidos |
| `ConsolidatedMeasure` | tipo |  |
| `ProfilePlanMeasure` | tipo | Una medida del plan de una organización, venga de la herramienta que venga. |
| `ConsolidatedPlanService` | clase | Reúne el plan de acción de varias evaluaciones en una sola lista para el Gantt del reporte. Las medidas viven en dos tablas y no se pueden unir en SQL: las de KPI (Organizativa y Capacidades) cuelgan de la evaluación, y las de mitigación (Riesgos) cuelgan del riesgo. Aquí se leen las dos y se normalizan a la misma forma — `startWeek` de las de riesgo es su fecha de inicio. |

| Método | Acceso | Qué hace |
|---|---|---|
| `measures(organisation, filter)` | público | Medidas de las dos tablas en una sola forma |
| `profilePlan(organisation, profileId)` | público | Plan de acción completo de una organización evaluada: las medidas de las tres herramientas, de todas sus evaluaciones, con lo necesario para verlas juntas (KPI de origen, responsable, avance y lo implementado). Solo lee. Las medidas de riesgo no guardan el KPI: cuelgan del riesgo, que guarda el id del indicador, así que los códigos se buscan aparte. |
| `gantt(organisation, scope, profileId, profileScope)` | público | Resuelve el Gantt del reporte para un alcance dado. Devuelve `undefined` en `tool` para que cada herramienta siga dibujando el suyo, que ya tiene el detalle medida a medida. En los alcances mayores no se dibuja una barra por medida: un proyecto con cuatrocientas medidas daría setenta láminas y dejaría de ser una vista consolidada. Se agrega una barra por grupo —herramienta u organización— que abarca desde el inicio más temprano hasta el fin más tardío de su plan, con el avance promedio. |

Campos:

- `ConsolidatedMeasure.group`: Herramienta u organización de la que viene, para agrupar en el Gantt.

Notas:

- `measures`: Con alcance recortado, solo las organizaciones que el usuario ve.
- `measures`: El Gantt se lee en orden cronológico y, dentro de una misma fecha, agrupado para que las barras del mismo origen queden juntas.

### organisation-provisioning.service.ts

`src/modules/assessment-core/application/organisation-provisioning.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ProvisionedTemplate` | tipo |  |
| `OrganisationProvisioningService` | clase | Aprovisiona una organización recién creada con lo que necesita para operar: las tres plantillas de evaluación (versión 1, activa) con sus secciones y KPI, y los parámetros de riesgo por país. Es la misma lógica que `prisma/seeds/assessment.seed.ts`, pero como servicio de aplicación para poder crear organizaciones desde la API en vez de exigir acceso a la consola del servidor. Idempotente (upsert por clave natural): volver a ejecutarlo sobre una organización existente actualiza los textos de la plantilla sin duplicar nada ni tocar las evaluaciones ya hechas. |

| Método | Acceso | Qué hace |
|---|---|---|
| `provision(organisation)` | público | Crea o actualiza las plantillas y parámetros del proyecto |
| `provisionTemplate(organisation, seed)` | interno |  |

Notas:

- `provisionTemplate`: Umbral de riesgo por país (luego editable desde administración).


## Infraestructura

### assessment-dashboard-export.service.ts

`src/modules/assessment-core/infrastructure/assessment-dashboard-export.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentDashboardExportService` | clase | F6-B02: exportable equivalente al informe consolidado del Excel original — una fila por organización, con el estado/puntaje/alertas de las 3 herramientas lado a lado (mismo dato que ve la tabla del dashboard). |

| Método | Acceso | Qué hace |
|---|---|---|
| `buildWorkbook(rows)` | público | Construye el Excel del panel |


## Presentación

### assessment-admin.controller.ts

`src/modules/assessment-core/presentation/controllers/assessment-admin.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAdminController` | clase | RF-08: vista cross-organización para el Administrador de plataforma. A diferencia del resto de assessment-core (todo `:org/assessments/...`), esta ruta no está scoped a una organización, por eso usa el guard global de claims (RequireGlobalSuperAdmin) en lugar de AssessmentPermissionGuard, que exige un `:org` para resolver permisos por organización. |

| Método | Acceso | Qué hace |
|---|---|---|
| `listAllProfiles()` | público | `GET assessments/admin/all-profiles`. Solo de los proyectos que creó el superadministrador que consulta. |

### assessment-applicability.controller.ts

`src/modules/assessment-core/presentation/controllers/assessment-applicability.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentApplicabilityController` | clase | Rutas de KPI aplicables |

| Método | Acceso | Qué hace |
|---|---|---|
| `get(org, id)` | público | `GET :org/assessments/profiles/:id/applicability`. Consulta |
| `set(org, id, dto)` | público | `PUT :org/assessments/profiles/:id/applicability`. Reemplaza |

### assessment-dashboard.controller.ts

`src/modules/assessment-core/presentation/controllers/assessment-dashboard.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentDashboardController` | clase | RF-07/F6-B01/F6-B02: panel consolidado multi-herramienta. |

| Método | Acceso | Qué hace |
|---|---|---|
| `resolveScope(org)` | interno |  |
| `getDashboard(org, filters)` | público | `GET :org/assessments/dashboard`. Consulta el panel |
| `exportDashboard(org, filters, res)` | público | `GET :org/assessments/dashboard/export`. Descarga el Excel |

### assessment-profiles.controller.ts

`src/modules/assessment-core/presentation/controllers/assessment-profiles.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentProfilesController` | clase | Rutas de organizaciones evaluadas |

| Método | Acceso | Qué hace |
|---|---|---|
| `resolveScope(org)` | interno |  |
| `list(org, query)` | público | `GET :org/assessments/profiles`. Lista |
| `getOne(org, id)` | público | `GET :org/assessments/profiles/:id`. Detalle |
| `getChildren(org, id)` | público | `GET :org/assessments/profiles/:id/children`. Miembros de una asociación |
| `getActionPlan(org, id)` | público | `GET :org/assessments/profiles/:id/action-plan`. Plan de acción consolidado de la organización: medidas de las tres herramientas juntas. Pasa por get() para respetar el alcance del evaluador (solo sus organizaciones asignadas). |
| `create(org, dto)` | público | `POST :org/assessments/profiles`. Registra |
| `update(org, id, dto)` | público | `PATCH :org/assessments/profiles/:id`. Edita |
| `remove(org, id, confirm?)` | público | `DELETE :org/assessments/profiles/:id`. Borra |

Notas:

- `create`: Lo que da de alta un evaluador queda a su cargo: sin evaluador asignado la organización desaparecía de su lista apenas la creaba.
- `update`: Elegir el evaluador responsable es del administrador: un evaluador que cambia evaluatorId se asignaría organizaciones ajenas a sí mismo.

### assessment-roles.controller.ts

`src/modules/assessment-core/presentation/controllers/assessment-roles.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentRolesController` | clase | Rutas de roles |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(org)` | público | `GET :org/assessments/roles`. Lista |
| `assign(org, dto)` | público | `POST :org/assessments/roles`. Asigna |
| `revoke(org, id, confirm?)` | público | `DELETE :org/assessments/roles/:id`. Revoca |
| `history(org, userId)` | público | `GET :org/assessments/roles/history/:userId`. Historial |

### assign-role.dto.ts

`src/modules/assessment-core/presentation/dto/assign-role.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssignAssessmentRoleDto` | clase | Usuario y rol que se asigna |

### create-profile.dto.ts

`src/modules/assessment-core/presentation/dto/create-profile.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CONTACT_PHONE_MESSAGE` | constante | Mensaje de teléfono inválido |
| `IsContactPhone(options?)` | función | Prefijo de país + número nacional con los dígitos de ese país, igual al formato que arma el asistente del frontend (`+&lt;dialCode> &lt;número>`). |
| `ASSESSMENT_PROFILE_TYPES` | constante | ASSOCIATION o COMPANY |
| `AssessmentProfileType` | tipo |  |
| `ASSESSMENT_ASSOCIATION_LEVELS` | constante | LEVEL_1 o LEVEL_2 |
| `AssessmentAssociationLevel` | tipo |  |
| `CreateAssessmentProfileDto` | clase | Datos para registrar una organización |

Campos:

- `CreateAssessmentProfileDto.associationLevel`: Solo aplica cuando type = "ASSOCIATION"
- `CreateAssessmentProfileDto.confidential`: Excluye este perfil de la vista cross-organización del Administrador (RF-08)
- `CreateAssessmentProfileDto.parentProfileId`: Solo aplica si el perfil padre es type="ASSOCIATION" y associationLevel="LEVEL_2"

### dashboard-filter.dto.ts

`src/modules/assessment-core/presentation/dto/dashboard-filter.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `DashboardFilterDto` | clase | RF-07/F6-B01: filtros del panel consolidado. Todos opcionales — sin filtros, el endpoint devuelve todas las organizaciones visibles para el usuario (ya recortadas por AssessmentAccessScopeService si es evaluador). |

### set-profile-applicability.dto.ts

`src/modules/assessment-core/presentation/dto/set-profile-applicability.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `SetAssessmentProfileApplicabilityDto` | clase | Reemplaza el conjunto completo de secciones/indicadores marcados como "no aplica" para un perfil (RF-02/03/04/05: aplicabilidad por organización, no por plantilla). Excluir una sección implica excluir todos sus indicadores (se resuelve en el servicio de scoring, no se duplica en la exclusión). |

### update-profile.dto.ts

`src/modules/assessment-core/presentation/dto/update-profile.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateAssessmentProfileDto` | clase | Datos que se pueden editar |

Campos:

- `UpdateAssessmentProfileDto.evaluatorId`: `null` limpia explícitamente el evaluador asignado (a diferencia de `undefined`, que Prisma trata como "no tocar este campo").
- `UpdateAssessmentProfileDto.confidential`: Excluye este perfil de la vista cross-organización del Administrador (RF-08)

### assessment-ai-throttler.guard.ts

`src/modules/assessment-core/presentation/guards/assessment-ai-throttler.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAiThrottlerGuard` | clase | LLM10 (doc 03/06): limita las llamadas a los endpoints de asistencia con IA a 10 solicitudes por minuto por usuario autenticado (no por IP, para no penalizar a toda una oficina compartiendo salida a internet). |

| Método | Acceso | Qué hace |
|---|---|---|
| `getTracker(req)` | redefinible | Cuenta por usuario |

### assessment-permission.guard.ts

`src/modules/assessment-core/presentation/guards/assessment-permission.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `REQUIRE_ASSESSMENT_PERMISSION_KEY` | constante | Clave de metadatos |
| `RequireAssessmentPermission(moduleCode, action)` | función | Los roles de evaluación se asignan como filas de AuthUserRole, así que las rutas se autorizan contra la base y no contra los datos del token. |
| `AssessmentPermissionGuard` | clase | Comprueba en la base el permiso que exige la ruta |

| Método | Acceso | Qué hace |
|---|---|---|
| `canActivate(context)` | público | Permite o responde 403 |

### assessment-scope.guard.ts

`src/modules/assessment-core/presentation/guards/assessment-scope.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ASSESSMENT_SCOPE_KEY` | constante | Clave de metadatos |
| `ScopedTo(resource, param, from)` | función | La ruta trabaja sobre un recurso de una organización evaluada (su id viene en `param` de la ruta o del cuerpo): un evaluador solo llega a las que tiene asignadas. Va después de @RequireAssessmentPermission, que decide si el rol puede hacer la acción; este decide sobre qué datos. |
| `AssessmentScopeGuard` | clase | Comprueba que el recurso esté en el alcance del usuario |

| Método | Acceso | Qué hace |
|---|---|---|
| `canActivate(context)` | público | Permite o responde 404 |

Notas:

- `canActivate`: Sin usuario u organización ya respondió el guard de permisos; sin id (cuerpo incompleto) responde la validación del DTO.


## Módulo

### assessment-core.module.ts

`src/modules/assessment-core/assessment-core.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentCoreModule` | clase | Núcleo compartido: perfiles de organización evaluada, aplicabilidad, roles Assessment, dashboard consolidado y auditoría. Los módulos de herramienta (Organizativa/Capacidades/Riesgos) importan este módulo para reutilizar audit/applicability/access-scope y los guards. |
