# risk-tool


## Dominio

### risk.repository.ts

`src/modules/risk-tool/domain/ports/risk.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RISK_REPOSITORY` | constante | Símbolo de inyección |
| `RiskResponseInput` | tipo |  |
| `CreateMitigationMeasureInput` | tipo |  |
| `UpdateMitigationMeasureInput` | tipo |  |
| `RiskCountryParam` | tipo |  |
| `RiskRepository` | tipo |  |

Campos:

- `RiskRepository.findCountryThreshold`: Umbral configurado para el país, o null si no hay override.
- `RiskRepository.upsertResponsesWithRisks`: Respuestas + riesgos clasificados en una sola transacción.
- `RiskRepository.countUnmitigatedByEvaluations`: Riesgos NON_NEGLIGIBLE sin medida, por evaluación, para varias evaluaciones.

### risk-tool.definition.ts

`src/modules/risk-tool/domain/risk-tool.definition.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RISK_TOOL_DEFINITION` | constante | Herramienta de Riesgos: identificación y gestión de riesgos por principios, con clasificación por umbral (configurable por país) y plan de mitigación. |
| `RISK_AI_CONTEXT` | constante | Vocabulario de la herramienta para la IA |

Notas:

- Mismo color que la herramienta en la aplicación.

### risk-tool.types.ts

`src/modules/risk-tool/domain/risk-tool.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RiskClass` | tipo |  |
| `RiskRecord` | tipo |  |
| `MitigationMeasureRecord` | tipo |  |
| `RiskWithMeasures` | tipo |  |


## Aplicación

### risk-tool-ai.service.ts

`src/modules/risk-tool/application/risk-tool-ai.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AiRiskItem` | tipo |  |
| `AiRiskMeasureSuggestion` | tipo |  |
| `RiskToolAiService` | clase | Asistencia de IA de la Herramienta de Riesgos: hereda las capacidades comunes (observaciones, inconsistencias, narrativa, insights) y añade la sugerencia de medidas de mitigación a partir de riesgos no despreciables. |
| `parseAiRiskMeasureSuggestions(raw, validIndicatorIds)` | función | Anti-alucinación: toda sugerencia con un indicatorId fuera de la lista pedida se descarta. |

| Método | Acceso | Qué hace |
|---|---|---|
| `suggestMeasuresForPrinciple(principleName, riskItems)` | público | Se llama con los riesgos de UN solo principio a la vez. |

### risk-tool.service.ts

`src/modules/risk-tool/application/risk-tool.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RiskResponseInput` | tipo |  |
| `ScoreKpiRiskInput` | tipo |  |
| `CreateRiskMeasureInput` | tipo |  |
| `UpdateRiskMeasureInput` | tipo |  |
| `RiskItemWithId` (interno) | tipo | AiRiskItem lleva solo lo que necesita el prompt; riskId liga la sugerencia de vuelta a su riesgo al crear la medida y weight/threshold permiten calcular la prioridad de impacto sin otra consulta. |
| `RiskToolService` | clase | Herramienta de Riesgos: el flujo común (plantilla, evaluación, puntuación, panel, historial) viene de EvaluationToolService; acá se añade la clasificación de riesgos por umbral (configurable por país), el plan de mitigación con Gantt, sus exportes y las sugerencias de IA por riesgo. |

| Método | Acceso | Qué hace |
|---|---|---|
| `riskStrategy()` | interno |  |
| `resolveRiskThreshold(organisation, country, templateRiskThreshold)` | interno | El país de la organización evaluada determina el umbral de despreciabilidad efectivo: parámetro por país (BD, configurable desde administración) ?? umbral de la plantilla ?? 5. |
| `listCountryParams(organisation)` | público | Parámetros de riesgo por país (administración) |
| `upsertCountryParam(organisation, country, riskThreshold, actorId?)` | público | Define el umbral de un país |
| `deleteCountryParam(organisation, country, actorId?)` | público | Vuelve al umbral de la plantilla |
| `upsertResponses(organisation, evaluationId, dto, actorId?)` | público | Ganchos del flujo común   Mismo flujo que la base; se redeclara solo para exigir riskDescription. |
| `persistResponses(evaluation, dto, scoredBy, actorId?)` | redefinible | Respuestas y riesgos clasificados se guardan en la misma transacción. |
| `countCriticalByEvaluation(evaluations)` | redefinible | Críticos del panel = riesgos NON_NEGLIGIBLE sin medida de mitigación. |
| `countMeasuresByEvaluation(_organisation, evaluationIds)` | redefinible | Medidas totales y concluidas |
| `listRisks(organisation, evaluationId)` | público | Riesgos y plan de mitigación |
| `findRiskOrThrow(organisation, riskId)` | interno |  |
| `createMeasure(organisation, riskId, dto, actorId?)` | público | Solo se puede crear una medida sobre un riesgo NON_NEGLIGIBLE. endDate la calcula el servicio (startWeek + durationDays), nunca el cliente. |
| `updateMeasureProgress(organisation, measureId, dto, actorId?)` | público | Registra el avance |
| `gantt(organisation, evaluationId)` | público | Cronograma de mitigación |
| `mitigationPlanExport(organisation, evaluationId, actorId?)` | público | Exportes |
| `mitigationPlanExportPptx(organisation, evaluationId, narrative?, actorId?, ganttScope, profileScope)` | público | Reporte en presentación |
| `getRisksWithoutMeasureBySection(evaluation)` | interno | Sugerencias de medidas con IA y prioridad de impacto   Riesgos NON_NEGLIGIBLE sin medida, agrupados por número de sección, con una sola consulta para toda la evaluación. |
| `suggestMeasuresForSection(organisation, evaluationId, sectionNumber, actorId?)` | público | Sugerencias de IA para un principio |
| `suggestMeasuresForEvaluation(organisation, evaluationId, actorId?)` | público | Plan de mitigación completo: una llamada a la IA POR PRINCIPIO, saltando los que no tienen riesgo pendiente; resultado ordenado por impacto. |
| `getImpactPriority(organisation, evaluationId)` | público | Ranking determinístico (peso × brecha bajo el umbral efectivo del país) de los riesgos no despreciables aún sin medida — no llama a la IA. |

Notas:

- `suggestMeasuresForEvaluation`: Prioridad de impacto: peso × brecha bajo el umbral efectivo del país.


## Infraestructura

### prisma-risk.repository.ts

`src/modules/risk-tool/infrastructure/persistence/prisma-risk.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PrismaRiskRepository` | clase | Riesgos y mitigación en PostgreSQL |

| Método | Acceso | Qué hace |
|---|---|---|
| `findCountryThreshold(organisation, country)` | público | Umbral de un país |
| `listCountryParams(organisation)` | público | Umbrales del proyecto |
| `upsertCountryParam(organisation, country, riskThreshold, updatedBy?)` | público | Guarda un umbral |
| `deleteCountryParam(organisation, country)` | público | Borra un umbral |
| `upsertResponsesWithRisks(evaluationId, responses, scoredBy, criticalThreshold)` | público | Guarda notas y riesgos juntos |
| `listByEvaluation(evaluationId)` | público | Riesgos con sus medidas |
| `countUnmitigatedByEvaluations(evaluationIds)` | público | No despreciables sin medida |
| `findById(organisation, riskId)` | público | Riesgo del proyecto |
| `createMeasure(input)` | público | Crea medida |
| `findMeasure(organisation, measureId)` | público | Medida del proyecto |
| `updateMeasure(measureId, input)` | público | Actualiza |
| `listMeasuresByEvaluation(evaluationId)` | público | Medidas de una evaluación |
| `countMeasuresByEvaluations(evaluationIds)` | público | Conteos |

### risk-report.builders.ts

`src/modules/risk-tool/infrastructure/reports/risk-report.builders.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `buildMitigationPlanExcel(definition, evaluation, risks)` | función | Plan de mitigación: una fila por medida (o por riesgo sin medida), con el KPI de origen, y una segunda hoja con los riesgos por sección. |
| `MitigationPptxInput` | tipo |  |
| `buildMitigationPlanPptx(definition, input)` | función | Presentación de riesgos |

Campos:

- `MitigationPptxInput.consolidatedGantt`: Plan consolidado que reemplaza al Gantt propio de la herramienta cuando al exportar se pide un alcance mayor (la organización o el proyecto).

Notas:

- `buildMitigationPlanPptx`: Solo los no despreciables necesitan medida de mitigación.


## Presentación

### risk-tool.controller.ts

`src/modules/risk-tool/presentation/controllers/risk-tool.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RiskToolController` | clase | RF-05/RF-06: Herramienta de Riesgos — principios, KPI, evaluaciones, riesgo y plan de mitigación con Gantt. |

| Método | Acceso | Qué hace |
|---|---|---|
| `organisationsOverview(org)` | público | `GET :org/assessments/risk/organisations-overview`. Panel general (panel general): organizaciones + última evaluación Risk. RF-07/F6-B03: un assessment_evaluator solo ve las organizaciones que tiene asignadas. |
| `listCountryParams(org)` | público | `GET :org/assessments/risk/country-params`. Parámetros de riesgo por país (administración) |
| `upsertCountryParam(org, dto)` | público | `PUT :org/assessments/risk/country-params`. Define un umbral |
| `deleteCountryParam(org, country)` | público | `DELETE :org/assessments/risk/country-params/:country`. Borra un umbral |
| `listTemplates(org)` | público | `GET :org/assessments/risk/templates`. Estructura |
| `getTemplate(org, id)` | público | `GET :org/assessments/risk/templates/:id`. Una plantilla |
| `createSection(org, templateId, dto)` | público | `POST :org/assessments/risk/templates/:id/sections`. Agrega principio |
| `updateSection(org, id, dto, confirm?)` | público | `PATCH :org/assessments/risk/sections/:id`. Edita principio |
| `deleteSection(org, id, confirm?)` | público | `DELETE :org/assessments/risk/sections/:id`. Borra principio |
| `createIndicator(org, sectionId, dto)` | público | `POST :org/assessments/risk/sections/:id/indicators`. Agrega KPI |
| `updateIndicator(org, id, dto, confirm?)` | público | `PATCH :org/assessments/risk/indicators/:id`. Edita KPI |
| `deactivateIndicator(org, id, confirm?)` | público | `DELETE :org/assessments/risk/indicators/:id`. Desactiva KPI |
| `createEvaluation(org, dto)` | público | `POST :org/assessments/risk/evaluations`. Evaluaciones y respuestas (RF-05) |
| `listEvaluations(org, query)` | público | `GET :org/assessments/risk/evaluations`. Lista |
| `getEvaluation(org, id)` | público | `GET :org/assessments/risk/evaluations/:id`. Detalle |
| `upsertResponses(org, id, dto)` | público | `PUT :org/assessments/risk/evaluations/:id/responses`. Califica |
| `complete(org, id)` | público | `POST :org/assessments/risk/evaluations/:id/complete`. Completa |
| `summary(org, id)` | público | `GET :org/assessments/risk/evaluations/:id/summary`. Resumen |
| `evaluationHistory(org, profileId)` | público | `GET :org/assessments/risk/profiles/:profileId/evaluation-history`. Historial |
| `listRisks(org, id)` | público | `GET :org/assessments/risk/evaluations/:id/risks`. Riesgos y plan de mitigación (RF-05/RF-06) |
| `createMeasure(org, riskId, dto)` | público | `POST :org/assessments/risk/risks/:riskId/measures`. Crea medida |
| `updateMeasureProgress(org, id, dto)` | público | `PATCH :org/assessments/risk/measures/:id`. Registra avance |
| `gantt(org, id)` | público | `GET :org/assessments/risk/evaluations/:id/gantt`. Cronograma |
| `mitigationPlanExport(org, id, res)` | público | `GET :org/assessments/risk/evaluations/:id/mitigation-plan/export`. Excel |
| `mitigationPlanExportPptx(org, id, dto, res)` | público | `POST :org/assessments/risk/evaluations/:id/mitigation-plan/export-pptx`. Presentación |
| `improveObservation(org, id, indicatorId, dto)` | público | `POST :org/assessments/risk/evaluations/:id/responses/:indicatorId/improve-observation`. Asistencia con IA   LLM10: 10 solicitudes/minuto por usuario en toda esta sección. |
| `suggestMeasuresForSection(org, id, number)` | público | `POST :org/assessments/risk/evaluations/:id/principles/:number/suggest-measures`. Sugerencias por principio |
| `suggestMeasuresForEvaluation(org, id)` | público | `POST :org/assessments/risk/evaluations/:id/suggest-measures`. Plan sugerido completo |
| `getImpactPriority(org, id)` | público | `GET :org/assessments/risk/evaluations/:id/impact-priority`. 5.ª capacidad de la Alternativa 1: ranking determinístico, sin costo de IA — por eso vive fuera de la sección de asistencia con IA (sin throttle ni auditoría de assessment-ai.call). |
| `detectInconsistencies(org, id)` | público | `POST :org/assessments/risk/evaluations/:id/detect-inconsistencies`. Contradicciones |
| `generateExecutiveNarrative(org, id, dto)` | público | `POST :org/assessments/risk/evaluations/:id/executive-narrative`. Narrativa |

Notas:

- `mitigationPlanExportPptx`: «Todo el proyecto» de un evaluador abarca solo sus organizaciones.

### country-param.dto.ts

`src/modules/risk-tool/presentation/dto/country-param.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpsertRiskCountryParamDto` | clase | Umbral de despreciabilidad por país (score > umbral ⇒ riesgo despreciable). |

### create-risk-measure.dto.ts

`src/modules/risk-tool/presentation/dto/create-risk-measure.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateAssessmentRiskMeasureDto` | clase | RF-06 (UCV-07): medida de mitigación ligada a un riesgo NON_NEGLIGIBLE. `startWeek` es el lunes de la semana de inicio (selector); `endDate` la calcula el servicio como `startWeek + durationDays`, nunca el cliente. |

Campos:

- `CreateAssessmentRiskMeasureDto.support`: "Apoyo" del Excel original: persona/rol de soporte al responsable.
- `CreateAssessmentRiskMeasureDto.budgetUsd`: "Inversión ($ USD)" del Excel original: presupuesto estimado de la medida.
- `CreateAssessmentRiskMeasureDto.verificationLink`: "Medios de verificación" del Excel original: enlace/evidencia de cumplimiento.
- `CreateAssessmentRiskMeasureDto.expectedResult`: Resultado esperado al ejecutar la medida (se define al planificar).
- `CreateAssessmentRiskMeasureDto.appliedImprovements`: Mejoras aplicadas / evidencia narrativa registrada al actualizar el avance.

### score-kpi-risk.dto.ts

`src/modules/risk-tool/presentation/dto/score-kpi-risk.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `KpiResponseRiskDto` | clase | RF-05: calificación entera 1..10 + observación obligatoria por KPI (misma regla transversal que Organizativa/Capacidades), más la descripción de riesgo obligatoria y el tipo de riesgo opcional que exige la Herramienta de Riesgos (doc 03 §4: "igual que Organizational más riskDescription (obligatoria) y riskType"). El servicio clasifica el riesgo y upserta AssessmentRisk a partir de estos dos campos — no se persisten en AssessmentResponse. |
| `ScoreKpiRiskDto` | clase | Lote de calificaciones con riesgo |

Campos:

- `KpiResponseRiskDto.manualCritical`: El evaluador puede marcar el KPI como "requiere atención" a mano, aunque el score sea alto.

### update-measure.dto.ts

`src/modules/risk-tool/presentation/dto/update-measure.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateAssessmentMitigationMeasureDto` | clase | Avance de una medida de mitigación: mismos campos que las medidas por KPI. |


## Módulo

### risk-tool.module.ts

`src/modules/risk-tool/risk-tool.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RiskToolModule` | clase | Herramienta de Riesgos. Reutiliza del núcleo: auditoría, aplicabilidad, alcance de acceso y guards; del módulo de IA: el cliente LLM compartido; del módulo de sesión: el gateway de tiempo real (misma instancia). |
