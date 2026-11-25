# evaluation-tool


## Dominio

### evaluation-tool-ai.types.ts

`src/modules/evaluation-tool/domain/evaluation-tool-ai.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AiIndicatorContext` | tipo | Contratos y parsers puros de la asistencia con IA de las herramientas. Los parsers validan la respuesta del modelo con una regla anti-alucinación: todo id que no venga de la lista enviada se descarta. |
| `AiCriticalItem` | tipo |  |
| `AiMeasureSuggestion` | tipo |  |
| `AiEvaluatedItem` | tipo |  |
| `AiInconsistencyFinding` | tipo |  |
| `NarrativeTone` | tipo |  |
| `AiSectionScoreContext` | tipo |  |
| `AiCriticalContext` | tipo |  |
| `AiInsightPoint` | tipo | Un punto de fortaleza o brecha: título corto y una oración de detalle. |
| `AiSectionInsight` | tipo |  |
| `AiReportInsights` | tipo |  |
| `AiSwot` | tipo | FODA de la organización (máximo 4 puntos por cuadrante). |
| `AiKpiContext` | tipo | KPI de una sección con su nota y una observación breve, para la IA. |
| `AiSectionDetailContext` | tipo |  |
| `AiProfileContext` | tipo |  |
| `AiReportContext` | tipo |  |
| `MAX_INSIGHT_POINTS` | constante | Máximo de puntos por lista |
| `extractJson(raw, shape)` | función | Extrae y parsea el primer JSON (array u objeto) de una respuesta de LLM. Toma el primer bloque balanceado, así que tolera texto alrededor y llaves sobrantes al final (un error frecuente de los modelos rápidos). |
| `parseAiMeasureSuggestions(raw, validIndicatorIds)` | función | Extraída como función pura (no depende del proveedor ni de I/O) para poder testear la validación anti-alucinación sin llamar a ningún LLM real: toda sugerencia con un indicatorId que no vino en la lista pedida se descarta. |
| `parseAiInconsistencyFindings(raw, validIndicatorIds)` | función | Misma lógica anti-alucinación que parseAiMeasureSuggestions: todo hallazgo que referencie un indicatorId fuera de la lista enviada se descarta. |
| `parseAiReportInsights(raw, validSectionNumbers)` | función | Anti-alucinación: cualquier clave de sectionAnalysis que no sea un número de dimensión de los enviados se descarta en vez de mostrarse. |
| `parseInsightPoints(raw, max)` | función | Acepta {title, detail} o un texto "Título: detalle"; descarta lo vacío y corta en `max` puntos. |
| `parseAiSwot(raw)` | función | FODA: cuatro listas de textos, cada una con hasta 4 puntos. |
| `countryName(code?)` | función | "EC" → "Ecuador"; sin país se asume Ecuador, donde opera la plataforma. |

Campos:

- `AiReportInsights.strengths`: Lectura general de la organización: fortalezas y brechas principales.
- `AiReportInsights.conclusion`: Mensaje de cierre de la lectura ejecutiva (1-2 oraciones).
- `AiReportInsights.sectionInsights`: Fortalezas y brechas de cada sección, por número de sección.
- `AiSectionDetailContext.best`: KPI mejor calificados de la sección.
- `AiSectionDetailContext.worst`: KPI peor calificados de la sección.

### evaluation-tool.definition.ts

`src/modules/evaluation-tool/domain/evaluation-tool.definition.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `EvaluationToolDefinition` | tipo | Parametriza el servicio genérico de evaluación (Template Method): todo lo que cambia entre la Herramienta Organizativa, la de Capacidades y la de Riesgos en el flujo común (plantilla → evaluación → puntuación → panel) vive acá. |

Campos:

- `EvaluationToolDefinition.slug`: Identificador en minúsculas para nombres de archivo y rutas.
- `EvaluationToolDefinition.displayName`: Nombre visible de la herramienta (reportes).
- `EvaluationToolDefinition.section`: Cómo llama esta herramienta a la sección de la plantilla.

Notas:

- "Dimensión"
- "Dimensiones"
- Forma en inglés para mensajes de error de la API.
- "Dimension"
- "Capacidad" → "Capacidad Alta"
- Color dominante del reporte (hex sin #), el de la herramienta en la app.

### evaluation-tool.types.ts

`src/modules/evaluation-tool/domain/evaluation-tool.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `NumericLike` | tipo | Tipos de dominio de las herramientas de evaluación. Son estructurales (sin dependencia del ORM): los adaptadores Prisma devuelven objetos que los satisfacen tal cual, y la capa de aplicación solo conoce estas formas. /** Compatible con number y con Prisma.Decimal (Number(x) funciona en ambos). |
| `EvaluationStatus` | tipo |  |
| `MeasureStatus` | tipo |  |
| `IndicatorRecord` | tipo |  |
| `SectionRecord` | tipo |  |
| `SectionWithIndicators` | tipo |  |
| `TemplateRecord` | tipo |  |
| `TemplateWithStructure` | tipo |  |
| `ProfileRecord` | tipo |  |
| `ResponseRecord` | tipo |  |
| `EvaluationRecord` | tipo |  |
| `EvaluationWithStructure` | tipo |  |
| `EvaluationListItem` | tipo |  |
| `CompletedEvaluationPoint` | tipo |  |
| `IndicatorMeasureRecord` | tipo |  |
| `IndicatorMeasureWithIndicator` | tipo |  |
| `SectionScoreResult` | tipo |  |
| `OrganisationOverviewRow` | tipo |  |
| `MeasureCounts` | tipo |  |
| `FileExport` | tipo |  |

Campos:

- `OrganisationOverviewRow.criticalCount`: Secciones críticas; en Riesgos, riesgos no despreciables sin medida.

### evaluation.repository.ts

`src/modules/evaluation-tool/domain/ports/evaluation.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `EVALUATION_REPOSITORY` | constante | Símbolo de inyección |
| `ResponseInput` | tipo |  |
| `ProfileFilter` | tipo |  |
| `EvaluationRepository` | tipo |  |

Campos:

- `ResponseInput.manualCritical`: El evaluador lo marca "requiere atención" a mano, sin importar el score.
- `EvaluationRepository.list`: `profileScope` recorta a las organizaciones que el usuario puede ver.
- `EvaluationRepository.findByProfiles`: Todas las evaluaciones (más reciente primero) de los perfiles indicados.

### indicator-measure.repository.ts

`src/modules/evaluation-tool/domain/ports/indicator-measure.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `INDICATOR_MEASURE_REPOSITORY` | constante | Símbolo de inyección |
| `CreateIndicatorMeasureInput` | tipo |  |
| `UpdateIndicatorMeasureInput` | tipo |  |
| `IndicatorMeasureRepository` | tipo |  |

### template.repository.ts

`src/modules/evaluation-tool/domain/ports/template.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `TEMPLATE_REPOSITORY` | constante | Símbolo de inyección |
| `SectionInput` | tipo |  |
| `IndicatorInput` | tipo |  |
| `DuplicateStructureError` | clase | Número de sección o código de KPI repetido |
| `TemplateRepository` | tipo |  |

Campos:

- `TemplateRepository.cloneAsNewVersion`: Clona la plantilla como nueva versión activa y desactiva la anterior.
- `TemplateRepository.deactivateIndicator`: Un KPI nunca se borra: se desactiva. Deja de contar para las evaluaciones pero sigue apareciendo en la estructura y en la pantalla de KPI aplicables, para poder volver a encenderlo.


## Aplicación

### evaluation-tool-ai.service.ts

`src/modules/evaluation-tool/application/evaluation-tool-ai.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AiDomainContext` | tipo | Asistencia de IA común a las herramientas: mejorar redacción de observaciones, sugerir medidas para KPI críticos, detectar inconsistencias, narrativa ejecutiva e insights para el reporte. Diseñada para bajo consumo de tokens y sin alucinaciones — los prompts obligan al modelo a basarse únicamente en los datos que se le pasan. Cada herramienta aporta solo su contexto de dominio (AiDomainContext); la selección de proveedor, la llamada HTTP y el circuit breaker viven en AssessmentLlmClientService. |
| `ANTI_HALLUCINATION_RULE` | constante | Regla común: usar solo los datos recibidos |
| `readable(parse)` (interno) | función | true si la respuesta se puede leer (para no guardar en caché una rota). |
| `usageOf(result)` (interno) | función | Consumo de una llamada, para el registro. |
| `REPORT_AI_BUDGET_MS` (interno) | constante | El reporte debe salir en menos de 10 s (HU-69): si la IA no responde a tiempo, se arma con los textos calculados a partir de los datos. |
| `EvaluationToolAiService` | clase | Capacidades de IA comunes |

| Método | Acceso | Qué hace |
|---|---|---|
| `improveObservationPrompt()` | redefinible | Prompts de sistema (parametrizados por dominio) |
| `suggestMeasuresPrompt()` | redefinible | Instrucción para sugerir medidas |
| `detectInconsistenciesPrompt()` | redefinible | Instrucción para detectar contradicciones |
| `executiveNarrativePrompt()` | redefinible | Instrucción de la narrativa |
| `reportInsightsPrompt()` | redefinible | Instrucción de los análisis del reporte |
| `swotPrompt()` | redefinible | Instrucción del FODA |
| `improveObservation(indicator, score, observation)` | público | Capacidades   Ahorro de tokens: una sola llamada sin historial, system prompt corto y fijo, solo el KPI puntual (no el resto de la evaluación) y temperature baja. |
| `suggestMeasuresForSection(sectionName, criticalItems)` | público | Ahorro de tokens: se llama con los KPI críticos de UNA sola sección a la vez — nunca con todos los KPI críticos de la evaluación completa. |
| `detectInconsistencies(items)` | público | Una sola llamada por evaluación, solo al intentar completarla. La observación se trunca para acotar tokens de entrada. |
| `generateExecutiveNarrative(context, tone)` | público | Payload liviano (solo puntajes agregados y KPI críticos, nunca las observaciones completas); la instrucción de tono va en el userPrompt. |
| `generateReportInsights(context)` | público | Análisis de calidad para el reporte PPTX — una sola llamada por export. |
| `generateSwot(context)` | público | FODA para el reporte de una evaluación completada. Corre en paralelo con los insights y con el mismo límite de tiempo. |
| `completeReportJson(capability, systemPrompt, userPrompt, maxOutputTokens, temperature, parse)` | interno | Llamada de reporte: modelo rápido, modo JSON y caché. Si la respuesta llega cortada (el modelo a veces termina antes de cerrar el JSON), se reintenta una vez; nunca se guarda en caché una respuesta ilegible. Ambos intentos caben en REPORT_AI_BUDGET_MS. |
| `describeProfile(context)` | redefinible | Datos de la organización para el prompt |
| `describeSectionDetails(context, opts)` | redefinible | KPI mejores y peores por sección |
| `describeReportContext(context, scale, withCriticalList)` | redefinible | Puntajes para el prompt. El reporte se presenta en porcentaje (`pct`), así que sus análisis reciben los datos en esa escala para citarlos igual. |
| `parseOrWarn(capability, text, parse)` | redefinible | Si la respuesta no se puede leer, deja rastro (largo y final) y relanza. |
| `log(event, data)` | redefinible | Registra el consumo |

Campos:

- `AiDomainContext.domain`: "fortalecimiento organizativo", "capacidades de cumplimiento normativo"…
- `AiDomainContext.sectionLabel`: Nombre de la sección en minúsculas: "dimensión", "área", "principio".
- `AiDomainContext.sectionLabelPlural`: Plural: "dimensiones", "áreas", "principios".
- `AiDomainContext.logLabel`: Etiqueta de registro: "Organizational", "Capacity", "Risk".

Notas:

- `improveObservation`: 1500 (no 200) porque el alias "flash" de Gemini razona internamente antes de escribir la respuesta visible y esos tokens cuentan contra este tope.
- `suggestMeasuresForSection`: Base de 1200 para el razonamiento interno de Gemini + 300 por ítem.
- `generateExecutiveNarrative`: Texto corto a partir de puntajes: no necesita el modelo que razona.
- `userPrompt`: Los KPI críticos van como conteo: los más bajos de cada sección ya aparecen en el detalle, con nombre y observación.
- `generateReportInsights`: Límite holgado (solo se cobra lo que se genera): si se queda corto, el JSON sale cortado y el reporte pierde el análisis.
- `generateSwot`: El FODA necesita menos detalle que el análisis: puntajes por sección y los nombres de los KPI extremos, sin observaciones.

### evaluation-tool.service.ts

`src/modules/evaluation-tool/application/evaluation-tool.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ScoreKpiInput` | tipo |  |
| `ScoreResult` | tipo |  |
| `OverviewContext` | tipo | Datos precargados en lote para construir el panel de organizaciones sin N+1. |
| `EvaluationToolService` | clase | Flujo común de una herramienta de evaluación (Template Method): plantilla versionada → evaluación por perfil → calificación de KPI → cierre con puntajes → panel de organizaciones e historial. Las herramientas concretas aportan su EvaluationToolDefinition (código, etiquetas, estrategia) y redefinen los ganchos (`persistResponses`, `countCriticalByEvaluation`, `countMeasuresByEvaluation`) cuando su modelo de medidas difiere. No conoce el ORM: toda la persistencia entra por los puertos TemplateRepository y EvaluationRepository. |

| Método | Acceso | Qué hace |
|---|---|---|
| `tool()` | redefinible | Código de la herramienta |
| `strategy()` | redefinible | Estrategia de puntuación |
| `sectionLabel()` | redefinible | Nombre de la sección |
| `persistResponses(evaluation, dto, scoredBy, _actorId?)` | redefinible | Ganchos redefinibles por herramienta   /** Persiste las respuestas de KPI. Riesgos lo redefine para clasificar y guardar los riesgos en la misma transacción. |
| `countCriticalByEvaluation(evaluations)` | redefinible | Críticos propios de la herramienta para el panel. Por defecto devuelve null y el panel cuenta las secciones críticas (dimensiones o áreas) de cada fila. |
| `countMeasuresByEvaluation(organisation, evaluationIds)` | redefinible | Total/hechas de medidas por evaluación para el historial de evolución. |
| `recordStructureChange(organisation, entity, operation, target, before, after, actorId?)` | interno | Estructura (administrador)   /** Trazabilidad de cambios estructurales: registra en la auditoría qué entidad cambió y cada campo con su valor anterior y nuevo. |
| `listTemplates(organisation)` | público | Versiones de la plantilla |
| `getTemplate(organisation, id)` | público | Una versión |
| `getActiveTemplate(organisation)` | redefinible | La versión vigente |
| `ensureWritableTemplate(organisation, templateId, actorId?)` | redefinible | Devuelve una plantilla segura de mutar estructuralmente: la vigente si ninguna evaluación la referencia, o una nueva versión clonada (la anterior se desactiva) — así una edición nunca cambia lo que ve una evaluación ya iniciada (regla de inmutabilidad). |
| `createSection(organisation, templateId, dto, actorId?)` | público | Agrega una sección |
| `findSectionOrThrow(organisation, sectionId)` | redefinible | Sección del proyecto o 404 |
| `assertSectionEditable(sectionId, confirm)` | redefinible | Pide confirmar si hay evaluaciones en curso con esa sección calificada |
| `updateSection(organisation, sectionId, dto, confirm, actorId?)` | público | Edita una sección |
| `deleteSection(organisation, sectionId, confirm, actorId?)` | público | Borra lógicamente una sección |
| `createIndicator(organisation, sectionId, dto, actorId?)` | público | Agrega un KPI |
| `findIndicatorOrThrow(organisation, indicatorId)` | redefinible | KPI del proyecto o 404 |
| `assertIndicatorEditable(indicatorId, confirm)` | redefinible | Pide confirmar si el KPI ya está calificado en evaluaciones en curso |
| `updateIndicator(organisation, indicatorId, dto, confirm, actorId?)` | público | Edita un KPI |
| `deactivateIndicator(organisation, indicatorId, confirm, actorId?)` | público | "Eliminar" un KPI lo desactiva, no lo borra. Antes se marcaba `deletedAt` y el KPI desaparecía de todas partes —incluida la pantalla de KPI aplicables—, así que no había forma de volver a encenderlo ni de decidir por organización si aplica. Desactivado deja de contar para las evaluaciones nuevas pero sigue a la vista. |
| `createEvaluation(organisation, dto, actorId?)` | público | Evaluaciones y respuestas |
| `listEvaluations(organisation, query, scope)` | público | Evaluaciones dentro del alcance |
| `getEvaluationOrThrow(organisation, evaluationId)` | redefinible | Evaluación del proyecto o 404 |
| `getEvaluation(organisation, evaluationId)` | público | Evaluación con aplicabilidad y puntajes |
| `toEvaluationPayload(evaluation)` | redefinible | Forma que recibe la web |
| `resolveScores(evaluation)` | redefinible | Puntajes persistidos si la evaluación está completada; si no, en vivo. |
| `computeScores(template, responses, excludedIndicatorIds)` | redefinible | Puntajes por sección y global con los KPI activos, aplicables y calificados |
| `upsertResponses(organisation, evaluationId, dto, actorId?)` | público | Guarda calificaciones, avisa en vivo y audita |
| `complete(organisation, evaluationId, actorId?)` | público | Cierra la evaluación si no falta ningún KPI |
| `summary(organisation, evaluationId)` | público | Resumen de puntajes y críticos |
| `organisationsOverview(organisation, scope)` | público | Panel general de organizaciones   Perfiles de primer nivel (parentProfileId: null) con su última evaluación de esta herramienta. Las asociaciones Nivel 2 sin evaluación propia se consolidan a partir de sus miembros. |
| `loadOverviewContext(organisation, profileIds)` | redefinible | Carga en lote todo lo que necesita el panel: última evaluación por perfil, exclusiones de aplicabilidad para las no completadas y críticos propios. |
| `countCriticalSections(sectionScores)` | interno | Secciones críticas de una fila del panel |
| `buildOrganisationRow(profile, context, children)` | redefinible | Fila del panel de una organización |
| `consolidateChildrenRow(profile, children, context)` | redefinible | Asociación Nivel 2 sin evaluación propia: promedio de sus miembros por sección, para que el panel refleje el estado agregado y no "sin evaluación". Una sección es crítica si lo es el promedio que muestra la fila y lo es en algún miembro: la que nadie calificó vale 0 pero no es crítica. |
| `evaluationHistory(organisation, profileId)` | público | Evolución en el tiempo: una evaluación completada = un punto; se usa para el gráfico de tendencia y la diapositiva de evolución del reporte. |
| `improveObservation(organisation, evaluationId, indicatorId, dto, actorId?)` | público | Asistencia con IA |
| `detectInconsistencies(organisation, evaluationId, actorId?)` | público | Una sola llamada por evaluación al intentar completarla. |
| `generateExecutiveNarrative(organisation, evaluationId, dto, actorId?)` | público | Payload liviano: solo puntajes agregados y KPI críticos. |
| `buildAiReportContext(globalScore, sectionScores, criticalItems, evaluation?)` | redefinible | Contexto liviano para la IA: puntajes agregados e ítems críticos. Con la evaluación se agregan los KPI mejor y peor calificados de cada sección y los datos de la organización, que necesitan las fortalezas, brechas y FODA. |
| `tryGenerateReportInsights(organisation, evaluationId, context, actorId?, withSwot)` | redefinible | Análisis de IA para el reporte en diapositivas: insights (fortalezas, brechas, hallazgos) y, si la evaluación está completada, el FODA. Las dos llamadas van en paralelo; si una falla (rate limit, clave inválida, tiempo) el reporte se genera sin esas diapositivas. |

Notas:

- `OverviewContext.criticalByEvaluation`: null cuando la herramienta cuenta secciones críticas y no un total propio.
- `createEvaluation`: Idempotencia: si ya hay una evaluación en curso para este perfil se devuelve esa en vez de crear un duplicado (doble clic, recarga).
- `improveObservation`: Lee el indicador de la plantilla (no de la respuesta): el KPI puede estar aún sin guardar mientras el usuario califica en el wizard.

### indicator-measure-tool.service.ts

`src/modules/evaluation-tool/application/indicator-measure-tool.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateMeasureInput` | tipo |  |
| `UpdateMeasureInput` | tipo |  |
| `CriticalItemWithWeight` (interno) | tipo | AiCriticalItem lleva solo lo que necesita el prompt de IA; weight se agrega acá para poder calcular impactScore (prioridad) sin otra consulta. |
| `measureStatusFor(progressPct)` | función | Estado según el avance: 0 pendiente, 1 a 99 en progreso, 100 concluida |
| `IndicatorMeasureToolService` | clase | Herramienta cuyo plan de acción liga medidas directamente a KPI críticos (Organizativa y de Capacidades). Añade al flujo común: medidas por indicador, exportes Excel/PPTX, asistencia con IA y prioridad de impacto. |

| Método | Acceso | Qué hace |
|---|---|---|
| `countMeasuresByEvaluation(organisation, evaluationIds)` | redefinible | Medidas totales y concluidas |
| `summaryExport(organisation, evaluationId, actorId?)` | público | Exportes |
| `summaryExportPptx(organisation, evaluationId, narrative?, actorId?, ganttScope, profileScope)` | público | Reporte en diapositivas: mismo dato del resumen más un análisis de calidad generado por IA (una sola llamada por export). Si la IA falla el reporte se genera igual sin esas diapositivas. |
| `listMeasures(organisation, evaluationId)` | público | Plan de acción (KPI crítico → medida) |
| `createMeasure(organisation, evaluationId, dto, actorId?)` | público | Crea una medida sobre un KPI crítico |
| `updateMeasureProgress(organisation, measureId, dto, actorId?)` | público | Registra el avance |
| `getCriticalItemsWithoutMeasure(evaluation, section, indicatorsWithMeasure)` | redefinible | Sugerencias de medidas con IA y prioridad de impacto |
| `suggestMeasuresForSection(organisation, evaluationId, sectionNumber, actorId?)` | público | Sugerencias de IA para una sección |
| `suggestMeasuresForEvaluation(organisation, evaluationId, actorId?)` | público | Plan de acción completo: llama a la IA UNA VEZ POR SECCIÓN (nunca con todos los KPI críticos juntos), saltando las secciones sin KPI crítico pendiente. Devuelve una sola lista ordenada por prioridad de impacto. |
| `getImpactPriority(organisation, evaluationId)` | público | Prioridad de impacto: ranking determinístico (peso × brecha bajo el umbral) de los KPI críticos aún sin medida — no llama a la IA. |

Notas:

- `suggestMeasuresForEvaluation`: Prioridad de impacto: peso del indicador × brecha bajo el umbral de criticidad — determinístico y sin costo de IA adicional.


## Infraestructura

### prisma-evaluation.repository.ts

`src/modules/evaluation-tool/infrastructure/persistence/prisma-evaluation.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `evaluationInclude` | constante | Relaciones que se cargan con la evaluación |
| `PrismaEvaluationRepository` | clase | Evaluaciones y respuestas en PostgreSQL |

| Método | Acceso | Qué hace |
|---|---|---|
| `findProfile(organisation, profileId)` | público | Organización del proyecto |
| `findProfiles(organisation, filter)` | público | Organizaciones por alcance |
| `findChildProfiles(organisation, parentIds)` | público | Miembros de asociaciones |
| `findActiveForProfile(organisation, tool, profileId)` | público | Evaluación en curso |
| `create(input)` | público | Crea |
| `list(organisation, tool, page, profileScope)` | público | Lista por herramienta y alcance |
| `findWithStructure(organisation, tool, evaluationId)` | público | Evaluación con plantilla y respuestas |
| `findByProfiles(organisation, tool, profileIds)` | público | Todas las de varias organizaciones |
| `findCompletedByProfile(organisation, tool, profileId)` | público | Completadas de una organización |
| `upsertResponses(evaluationId, responses, scoredBy, criticalThreshold)` | público | Guarda calificaciones |
| `setStatus(evaluationId, status)` | público | Cambia el estado |
| `complete(evaluationId, result)` | público | Guarda puntajes y cierra |

### prisma-indicator-measure.repository.ts

`src/modules/evaluation-tool/infrastructure/persistence/prisma-indicator-measure.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PrismaIndicatorMeasureRepository` | clase | Medidas por KPI en PostgreSQL |

| Método | Acceso | Qué hace |
|---|---|---|
| `listByEvaluation(organisation, evaluationId)` | público | Medidas de una evaluación |
| `indicatorIdsWithMeasure(organisation, evaluationId)` | público | KPI que ya tienen medida |
| `countByEvaluations(organisation, evaluationIds)` | público | Conteos por evaluación |
| `create(input)` | público | Crea |
| `findById(organisation, measureId)` | público | Medida del proyecto |
| `update(measureId, input)` | público | Actualiza |

### prisma-template.repository.ts

`src/modules/evaluation-tool/infrastructure/persistence/prisma-template.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `templateStructureInclude` | constante | Secciones y KPI ordenados |
| `PrismaTemplateRepository` | clase | Plantillas en PostgreSQL |

| Método | Acceso | Qué hace |
|---|---|---|
| `findAll(organisation, tool)` | público | Versiones |
| `findById(organisation, tool, id)` | público | Una versión |
| `findActive(organisation, tool)` | público | La vigente |
| `countEvaluations(templateId)` | público | Evaluaciones que la usan |
| `cloneAsNewVersion(current, actorId?)` | público | Copia como versión nueva |
| `createSection(templateId, input)` | público | Agrega sección |
| `findSection(organisation, tool, sectionId)` | público | Sección del proyecto |
| `findSectionById(sectionId)` | público | Sección por id |
| `countScoredResponsesInActiveEvaluations(filter)` | público | Calificaciones en evaluaciones en curso |
| `updateSection(sectionId, input)` | público | Edita |
| `softDeleteSection(sectionId)` | público | Borra lógicamente |
| `createIndicator(sectionId, input)` | público | Agrega KPI |
| `findIndicator(organisation, tool, indicatorId)` | público | KPI del proyecto |
| `updateIndicator(indicatorId, input)` | público | Edita |
| `deactivateIndicator(indicatorId)` | público | Desactiva |

### evaluation-report.builders.ts

`src/modules/evaluation-tool/infrastructure/reports/evaluation-report.builders.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `STATUS_LABEL` | constante | Estados en español |
| `MEASURE_STATUS_LABEL` | constante | Estados de medida en español |
| `scoreLevelLabel(score)` | función | Nivel de un puntaje |
| `scoreLevelPhrase(definition, score)` | función | "Capacidad" + nivel con concordancia: "Capacidad alta", "Capacidad media"… |
| `EXCEL_CONTENT_TYPE` | constante | Tipo MIME de Excel |
| `PPTX_CONTENT_TYPE` | constante | Tipo MIME de PowerPoint |
| `reportDate()` | función | Fecha del reporte |
| `evaluationSubtitle(evaluation)` | función | Subtítulo con organización y fecha |
| `sectionByIndicator(evaluation)` | función | Sección a la que pertenece cada indicador de la plantilla. |
| `buildSummaryExcel(definition, evaluation, sectionScores)` | función | Resumen por sección y matriz completa de KPI calificados, en dos hojas con encabezados en español, anchos de columna y filtros. |
| `SummaryPptxInput` | tipo |  |
| `createToolReport(definition, evaluation)` | función | Presentación con el color de la herramienta |
| `addToolCoverSlide(pptx, definition, evaluation)` | función | Portada |
| `sectionPointsFromData(responses)` (interno) | función | Fortalezas y brechas de una sección a partir de sus KPI, cuando la IA no las dio: los mejor calificados (nivel alto) y los peor calificados. |
| `generalPointsFromData(evaluation, sectionScores)` (interno) | función | Lectura general sin IA: las secciones con mejor y peor resultado. |
| `addResultSlides(pptx, definition, input)` | función | Láminas de resultados comunes a todas las herramientas: resultados globales en barras, lectura ejecutiva, una lámina por sección con su semáforo y los hallazgos clave. |
| `addClosingSlides(pptx, evaluation, insights, swot)` | función | FODA y recomendaciones, al cierre del reporte. |
| `sectionRowsFor(evaluation, sectionScores)` | función | Filas por sección |
| `evolutionPoints(history)` | función | Puntos de la evolución |
| `planStatusCell(measures)` | función | Celda de estado de una medida |
| `scoreCell(score)` | función | Celda del resultado de un KPI en porcentaje, con su color de nivel. |
| `buildSummaryPptx(definition, input)` | función | Reporte en diapositivas: portada, resultados globales, lectura ejecutiva, una lámina por sección, hallazgos, KPI críticos, resumen y cronograma del plan de acción, evolución, FODA y recomendaciones. |

Campos:

- `SummaryPptxInput.customNarrative`: La síntesis la escribió (o eligió) el usuario: va tal cual al cierre.
- `SummaryPptxInput.consolidatedGantt`: Plan consolidado que reemplaza al Gantt propio de la herramienta cuando al exportar se pide un alcance mayor (la organización o el proyecto).

Notas:

- `addResultSlides`: Segunda lámina: el resultado global y la síntesis (la que se escribió en la aplicación o, si no, la narrativa automática con los porcentajes).
- `addResultSlides`: La síntesis ya va en el resumen ejecutivo; aquí va la lectura de cierre.


## Presentación

### create-evaluation.dto.ts

`src/modules/evaluation-tool/presentation/dto/create-evaluation.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateAssessmentEvaluationDto` | clase | Precondición: la organización a evaluar debe existir; la plantilla vigente de la herramienta se resuelve en el servicio (no la elige el cliente). |

### create-indicator-measure.dto.ts

`src/modules/evaluation-tool/presentation/dto/create-indicator-measure.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateIndicatorMeasureDto` | clase | Plan de acción de las herramientas por KPI: la medida se liga directamente a un KPI crítico de la evaluación (AssessmentResponse.isCritical). |

Campos:

- `CreateIndicatorMeasureDto.support`: "Apoyo" del Excel original: persona/rol de soporte al responsable.
- `CreateIndicatorMeasureDto.budgetUsd`: "Inversión ($ USD)" del Excel original: presupuesto estimado de la medida.
- `CreateIndicatorMeasureDto.verificationLink`: "Medios de verificación" del Excel original: enlace/evidencia de cumplimiento.
- `CreateIndicatorMeasureDto.expectedResult`: Resultado esperado al ejecutar la medida (se define al planificar).
- `CreateIndicatorMeasureDto.appliedImprovements`: Mejoras aplicadas / evidencia narrativa registrada al actualizar el avance.

### create-indicator.dto.ts

`src/modules/evaluation-tool/presentation/dto/create-indicator.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateAssessmentIndicatorDto` | clase | KPI dentro de una sección de la plantilla. `code` debe ser estable para paridad con el instrumento original (p.ej. "1.3"). |

### create-section.dto.ts

`src/modules/evaluation-tool/presentation/dto/create-section.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateAssessmentSectionDto` | clase | El administrador define la estructura de una sección de la plantilla (número, nombre, descripción, peso). El peso pondera la sección en el puntaje global. |

### executive-narrative.dto.ts

`src/modules/evaluation-tool/presentation/dto/executive-narrative.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ExecutiveNarrativeDto` | clase | Tono pedido para la narrativa |

### export-pptx.dto.ts

`src/modules/evaluation-tool/presentation/dto/export-pptx.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ExportPptxDto` | clase | Síntesis y alcance del cronograma |

Campos:

- `ExportPptxDto.ganttScope`: Qué abarca el Gantt del reporte: solo esta herramienta (por defecto), las tres de la organización, o todas las organizaciones del proyecto.

### improve-observation.dto.ts

`src/modules/evaluation-tool/presentation/dto/improve-observation.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ImproveObservationDto` | clase | El KPI puede no estar guardado todavía (el usuario está calificando en el wizard) — la calificación y observación viajan en el body en vez de leerse de la respuesta persistida, para que "Mejorar redacción" funcione sobre el borrador sin exigir un guardado previo. |

### score-kpi.dto.ts

`src/modules/evaluation-tool/presentation/dto/score-kpi.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `KpiResponseDto` | clase | UCA-04: calificación entera 1..10 + observación obligatoria por KPI (regla de negocio transversal RF-03/04/05, doc 01 §1). |
| `ScoreKpiDto` | clase | Lote de calificaciones |

Campos:

- `KpiResponseDto.manualCritical`: El evaluador puede marcar el KPI como "requiere atención" a mano, aunque el score sea alto (RF-03: no todo lo crítico se refleja en la nota).

### update-indicator-measure.dto.ts

`src/modules/evaluation-tool/presentation/dto/update-indicator-measure.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateIndicatorMeasureDto` | clase | Avance de una medida |

Campos:

- `UpdateIndicatorMeasureDto.expectedResult`: Resultado esperado al ejecutar la medida (se define al planificar).
- `UpdateIndicatorMeasureDto.appliedImprovements`: Mejoras aplicadas / evidencia narrativa registrada al actualizar el avance.

### update-indicator.dto.ts

`src/modules/evaluation-tool/presentation/dto/update-indicator.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateAssessmentIndicatorDto` | clase | Campos editables de un KPI |

### update-section.dto.ts

`src/modules/evaluation-tool/presentation/dto/update-section.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateAssessmentSectionDto` | clase | Campos editables de una sección |

### indicator-tool.controller.factory.ts

`src/modules/evaluation-tool/presentation/indicator-tool.controller.factory.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IndicatorToolControllerConfig` | tipo |  |
| `createIndicatorToolController(cfg)` | función | Construye el controlador REST de una herramienta basada en KPI. Las rutas, permisos y cuerpos son idénticos entre herramientas: solo cambian el segmento de URL, el nombre de la sección y el módulo de permisos. |

Campos:

- `IndicatorToolControllerConfig.segment`: Segmento de ruta de la herramienta: "organizational" \| "capacity".
- `IndicatorToolControllerConfig.sectionSegment`: Segmento de ruta de las secciones: "dimensions" \| "areas".
- `IndicatorToolControllerConfig.module`: Código del módulo de permisos (AppModule.code).
- `IndicatorToolControllerConfig.service`: Clase del servicio concreto que Nest inyecta.

Notas:

- `organisationsOverview`: Panel general: organizaciones + última evaluación de la herramienta. Un assessment_evaluator solo ve las organizaciones que tiene asignadas.
- `listTemplates`: Estructura
- `createEvaluation`: Evaluaciones y respuestas
- `summaryExportPptx`: «Todo el proyecto» de un evaluador abarca solo sus organizaciones.
- `listMeasures`: Plan de acción (KPI crítico → medida)
- `improveObservation`: Asistencia con IA (10 solicitudes/minuto por usuario)


## Módulo

### evaluation-tool.module.ts

`src/modules/evaluation-tool/evaluation-tool.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `EvaluationToolModule` | clase | Núcleo compartido de las herramientas de evaluación: puertos de persistencia (plantillas, evaluaciones, medidas por KPI) con sus adaptadores Prisma. Las herramientas concretas extienden los servicios genéricos de application/. |
