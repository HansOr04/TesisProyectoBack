# Referencia del código del servidor

Todos los archivos de código, con lo que exporta cada uno y por qué está hecho así.
Las pruebas y los componentes visuales básicos (`shared/ui`) no se listan.

## prisma

### `prisma/seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `prisma` (interno) | constante | `npm run prisma:seed` — idempotente: se puede correr N veces. |


## prisma/seeds

### `prisma/seeds/assessment.seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentSeedOptions` | tipo |  |
| `seedAssessment(client, options)` | función | Siembra módulos, permisos, roles de sistema, plantillas y parámetros de riesgo |

Campos:

- `AssessmentSeedOptions.roleAssignments`: userId → roleCode a asignar en la organización (p.ej. admin/evaluador demo).

Notas:

- `seedAssessmentRoles`: Reconstruye los permisos en cada corrida para que un cambio de la plantilla se refleje sin dejar permisos viejos; es seguro porque son roles de sistema, no personalizaciones de un proyecto.
- `seedAssessmentTemplate`: Parámetros de riesgo por país (configurables luego desde administración).

### `prisma/seeds/demo-data.seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `DEMO_PREFIX` (interno) | constante | Datos de demostración para la analítica: organizaciones con perfiles variados, evaluaciones completadas de las 3 herramientas, medidas sobre KPI críticos y re-evaluaciones donde los KPI con medida concluida mejoran más. Determinístico (PRNG con semilla) para que la memoria pueda reproducirlo. Re-ejecutable: borra y vuelve a crear las organizaciones "Demo —". |
| `seedDemoData(prisma, organisation, seed)` | función | Crea los datos de demostración |

Campos:

- `DemoOrg.capability`: Capacidad latente 0–1: mueve todos los puntajes de la organización.
- `DemoOrg.reevaluate`: Segunda evaluación completada (histórico) para medir efectividad.
- `DemoOrg.bias`: Sesgos por herramienta (p.ej. fuerte en organización, débil en riesgos).

Notas:

- `seedDemoData`: Sesgo por sección estable para la organización (fortalezas/debilidades).
- `seedDemoData`: Medidas sobre ~60 % de los KPI críticos de la primera evaluación.
- `seedDemoData`: Segunda evaluación: los KPI con medida concluida mejoran +2..+4, en curso +0..+2, sin medida −1..+1 (efecto real de las medidas, con ruido).

### `prisma/seeds/identity.seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `SeededIdentity` | tipo |  |
| `seedIdentity(prisma)` | función | Usuario técnico 'system' (autor de auditorías sin actor), organización demo y dos cuentas: admin (assessment_admin) y evaluador (assessment_evaluator). |

Notas:

- `seedIdentity`: El administrador inicial es el superadministrador dueño del proyecto base: solo el que crea un proyecto tiene acceso total a él.

### `prisma/seeds/production.seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `prisma` (interno) | constante | `npm run prisma:seed:prod` — arranque de un entorno real: crea SOLO la organización y un superadministrador (con la contraseña pedida por consola o SEED_ADMIN_PASSWORD), más módulos/permisos/roles y plantillas. No crea cuentas de demostración ni contraseñas por defecto. |

Notas:

- `ask`: Oculta la contraseña mientras se escribe.
- `main`: El administrador inicial es el superadministrador dueño del proyecto base: solo el que crea un proyecto tiene acceso total a él.


## scripts

### `scripts/carga-guardado.mjs`

| Elemento | Tipo | Qué es |
|---|---|---|
| `env` (interno) | constante | Prueba de carga del guardado de calificaciones (HU-68, RNF-04). Simula USUARIOS evaluadores calificando a la vez la misma evaluación en curso durante DURACION_S segundos y mide el tiempo de respuesta del guardado (PUT .../responses). CA-68.1: con 20 usuarios, el 95 % responde en menos de 1 segundo. Uso (sin dependencias, Node 18 o superior): API_URL=https://&lt;servidor> ORG=&lt;proyecto> EVALUACION_ID=&lt;id> \ CUENTAS=&lt;archivo> node scripts/carga-guardado.mjs CUENTAS es un archivo con una cuenta por línea («correo contraseña»): cada evaluador simulado usa la suya y todos inician sesión a la vez, como al empezar un taller. Con EMAIL y PASSWORD en lugar de CUENTAS, todos comparten una sola sesión. Variables opcionales: HERRAMIENTA (organizational \| capacity, por defecto organizational), USUARIOS (20), DURACION_S (60), PAUSA_MS (3000, la espera del guardado automático de la web entre un cambio y el siguiente). Escribe calificaciones de verdad: usar una evaluación de prueba. |
| `loginStatuses` (interno) | constante | Todos inician sesión a la vez, como al empezar un taller. |

Notas:

- `evaluator`: Cada evaluador empieza en un momento distinto, como en un taller real.
- `evaluator`: se cuenta como error de red


## scripts

### `scripts/medir-reporte.mjs`

| Elemento | Tipo | Qué es |
|---|---|---|
| `env` (interno) | constante | Tiempo de generación del reporte en presentación (HU-69, RNF-04). Exporta el PPTX de una evaluación completa con alcance de proyecto y mide cuánto tarda. CA-69.1: menos de 10 segundos. La primera exportación redacta los textos con IA; las siguientes los toman de la caché. Uso (sin dependencias, Node 18 o superior): API_URL=https://&lt;servidor> ORG=&lt;proyecto> EMAIL=&lt;correo> PASSWORD=&lt;clave> \ node scripts/medir-reporte.mjs Variables opcionales: REPETICIONES (3), EVALUACIONES por herramienta (1). Solo lee y exporta: no cambia ninguna evaluación. |


## src

### `src/app.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AppModule` | clase | Módulo raíz: configuración, límites de peticiones, tareas programadas y módulos |

| Método | Acceso | Qué hace |
|---|---|---|
| `configure(consumer)` | público | Registra los middlewares de identificador y de registro de peticiones |

Notas:

- Límite global generoso, por usuario con sesión (UserThrottlerGuard, en IdentityModule); los endpoints de IA aplican su propio límite por usuario (AssessmentAiThrottlerGuard, 10/min).


## src

### `src/main.ts`

Notas:

- `bootstrap`: Heroku atiende detrás de un enrutador que agrega X-Forwarded-For. Sin confiar en ese primer salto, req.ip era la del enrutador y los límites por IP (300 peticiones y 10 inicios de sesión por minuto) se compartían entre todos los usuarios de la plataforma: un taller podía quedarse sin poder iniciar sesión.
- `bootstrap`: Sin esto el navegador repite el preflight OPTIONS antes de cada PUT/POST, un viaje de red extra por guardado. 7200 s es el tope de Chrome.
- `bootstrap`: Socket.IO para AssessmentSessionGateway (NestFactory no lo enlaza solo)
- `bootstrap`: En producción la documentación de la API queda cerrada, salvo que se pida.


## src/modules/assessment-ai

### `src/modules/assessment-ai/application/assessment-llm-client.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `DEFAULT_AI_TIMEOUT_MS` | constante | Heroku corta toda petición HTTP a los 30 s (H12). La llamada al proveedor debe rendirse antes para que el endpoint responda con un error claro (o con su fallback) en vez de quedar colgado hasta que el router lo mate. |
| `AI_CACHE_TTL_DAYS` | constante | Las respuestas guardadas se reutilizan hasta 90 días. |
| `AssessmentLlmClientService` | clase | Módulo de IA compartido: un solo punto de selección de proveedor (Gemini/NVIDIA vía AI_PROVIDER), llamada HTTP y circuit breaker, usado por Organizativa/Capacidades/Riesgos en vez de triplicar esta lógica — cada herramienta solo aporta sus propios prompts de dominio. Un solo circuit breaker también significa que si el proveedor cae, las 3 herramientas lo ven caído de inmediato. |

| Método | Acceso | Qué hace |
|---|---|---|
| `complete(systemPrompt, userPrompt, maxOutputTokens, temperature, timeoutMs, options?)` | público | Pide una respuesta al proveedor, con caché, límite de tiempo y corte por fallos |
| `cacheKey(systemPrompt, userPrompt, maxOutputTokens, options?)` | interno | Caché de respuestas |
| `readCache(key)` | interno |  |
| `writeCache(key, result, options?)` | interno |  |

Notas:

- `complete`: Sin credencial no tiene sentido salir a la red: se responde 503 de inmediato.
- `readCache`: Sin caché (tabla no migrada, base caída): se llama al proveedor.
- `writeCache`: Limpieza barata de lo vencido, para que la tabla no crezca sin fin.

### `src/modules/assessment-ai/assessment-ai.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAiModule` | clase | Importado (no reproveído) por los módulos Organizativa/Capacidades/Riesgos para que las 3 herramientas compartan la MISMA instancia de AssessmentLlmClientService — un solo circuit breaker y una sola selección de proveedor. |

### `src/modules/assessment-ai/domain/llm-circuit-breaker.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `LlmCircuitBreaker` | clase | LLM10 (doc 03/06): tras 5 fallos consecutivos (429/5xx) de un proveedor de IA se deja de llamarlo por 5 minutos en vez de seguir intentando y acumular costo/latencia contra un proveedor caído. Estado en memoria por instancia de proceso — cada servicio de IA (Organizativa/Capacidades/Riesgos) mantiene su propia instancia, ya que cada uno puede apuntar a un proveedor distinto. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getState(key)` | interno |  |
| `isOpen(key)` | público | Si el proveedor está cortado en este momento |
| `recordSuccess(key)` | público | Reinicia la cuenta de fallos |
| `recordFailure(key)` | público | Suma un fallo y corta al llegar al límite |

### `src/modules/assessment-ai/domain/ports/ai-provider.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AiCompletionResult` | tipo |  |
| `AiCompletionOptions` | tipo | Un proveedor de LLM solo sabe completar un prompt. Gemini y NVIDIA lo implementan; el cliente elige uno por configuración (Strategy). |
| `AiProvider` | tipo |  |

Campos:

- `AiCompletionResult.inputTokens`: Tokens de entrada (prompt) y de salida, cuando el proveedor los informa.
- `AiCompletionResult.finishReason`: Por qué terminó la respuesta (STOP, MAX_TOKENS…), si el proveedor lo dice.
- `AiCompletionResult.cached`: La respuesta salió de la caché: no se llamó al proveedor.
- `AiCompletionOptions.fast`: Prioriza la latencia: el proveedor usa su modelo rápido (sin razonamiento previo). Para llamadas que deben responder dentro de un export, como los análisis del reporte.
- `AiCompletionOptions.cache`: Reutiliza la respuesta guardada para exactamente el mismo prompt. Solo para análisis que deben salir iguales con los mismos datos (reporte).
- `AiCompletionOptions.json`: Pide al proveedor una respuesta en JSON válido (modo JSON de Gemini).
- `AiCompletionOptions.isUsable`: Con `cache`: solo se guarda (y se reutiliza) una respuesta que pase esta validación, para no repetir una respuesta cortada o mal formada.
- `AiProvider.modelFor`: Modelo que usaría con estas opciones (forma parte de la clave de caché).

### `src/modules/assessment-ai/infrastructure/ai-provider.factory.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AiProviderFactoryResult` | tipo |  |
| `createAiProviderFromEnv(httpService, env)` | función | Factory Method: la selección del proveedor vive en un solo lugar y el cliente LLM no conoce las clases concretas. |

Campos:

- `AiProviderFactoryResult.requiredVariable`: Nombre de la variable de entorno con la API key del proveedor elegido.

Notas:

- `createAiProviderFromEnv`: gemini-flash-latest razona antes de responder (~20 s); el modelo lite responde en 1-3 s, lo que cabe en los 30 s de Heroku de un export.

### `src/modules/assessment-ai/infrastructure/providers/gemini.provider.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `GeminiProvider` | clase | Proveedor de Google Gemini |

| Método | Acceso | Qué hace |
|---|---|---|
| `modelFor(options?)` | público | Modelo que usaría según las opciones |
| `complete(systemPrompt, userPrompt, maxOutputTokens, temperature, timeoutMs, options?)` | público | Llama a Gemini y devuelve texto y consumo |

Notas:

- Modelo sin razonamiento previo, para respuestas dentro de un export.
- `complete`: La respuesta puede venir partida en varias partes: se unen todas, sin las de razonamiento interno. Leer solo la primera cortaba el JSON.

### `src/modules/assessment-ai/infrastructure/providers/nvidia.provider.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `NvidiaProvider` | clase | Proveedor de NVIDIA (API compatible con OpenAI) |

| Método | Acceso | Qué hace |
|---|---|---|
| `modelFor()` | público | Modelo configurado |
| `complete(systemPrompt, userPrompt, maxOutputTokens, temperature, timeoutMs)` | público | Llama a NVIDIA y devuelve texto y consumo |


## src/modules/assessment-analytics

### `src/modules/assessment-analytics/application/assessment-analytics.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `SegmentKey` | tipo |  |
| `latestByProfile(tool)` (interno) | función | Última evaluación con respuestas por perfil (estado actual), y las completadas ordenadas (histórico). |
| `AssessmentAnalyticsService` | clase | Analítica descriptiva, comparativa y de efectividad sobre las evaluaciones. Todo es determinístico (sin IA) y reproducible: cada método documenta la fórmula que usa para poder citarla en la memoria. |
| `AssessmentAnalyticsDataset` | tipo |  |

| Método | Acceso | Qué hace |
|---|---|---|
| `load(organisation, scope)` | interno |  |
| `overview(organisation, scope)` | público | 1. Panorama |
| `systemicGaps(organisation, scope, tool)` | público | 2. Brechas sistémicas   prioridad = tasa crítica × peso del KPI × (umbral + 1 − promedio): un KPI que falla en muchas organizaciones, pesa mucho y tiene promedio bajo sube al tope — es la brecha que más conviene atacar de forma colectiva. |
| `correlations(organisation, scope)` | público | 3. Correlaciones y drivers |
| `segments(organisation, scope, by)` | público | 4. Segmentación |
| `measureEffectiveness(organisation, scope)` | público | 5. Efectividad de las medidas   Para cada organización con ≥ 2 evaluaciones completadas de una herramienta compara, KPI por KPI, la primera con la última: Δ = último − primero. Separa los KPI críticos que recibieron una medida (concluida / en curso) de los que no la recibieron. Si Δ(con medida) > Δ(sin medida) las medidas están funcionando; el ratio de medidas concluidas se correlaciona con la mejora global. |
| `clusters(organisation, scope, tool, k)` | público | 6. Clústeres (k-means sobre el perfil de secciones) |
| `benchmark(organisation, scope, profileId)` | público | 7. Posición relativa de una organización (benchmark) |

Notas:

- `overview`: Tendencia mensual de evaluaciones completadas (promedio de puntaje global).
- `gaps`: Organizaciones donde este KPI es crítico, con su puntaje y si ya registraron una medida — alimenta el detalle expandible del ranking.
- `correlations`: Drivers: correlación de cada sección con el puntaje global de su herramienta.
- `correlations`: Cruce entre herramientas: sección de A vs sección de B, sobre organizaciones con ambas.
- `correlations`: Puntaje global entre herramientas (¿la organización fuerte en una lo es en las demás?).
- `correlations`: Factores del perfil: tamaño (socios) y antigüedad vs puntaje global.
- `clusters`: `level` es el código estable (el cliente lo traduce); `label` se conserva por compatibilidad.

### `src/modules/assessment-analytics/assessment-analytics.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAnalyticsModule` | clase | Analítica de datos sobre las evaluaciones: el servicio depende del puerto ANALYTICS_DATASET (DIP) y toda la estadística vive en domain/statistics.ts. |

### `src/modules/assessment-analytics/domain/analytics.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AnalyticsProfile` | tipo | Dataset neutro (independiente de Prisma) sobre el que trabaja la analítica. Las claves de comparación entre evaluaciones son el código del KPI y el número de sección, estables entre versiones de plantilla. |
| `AnalyticsSection` | tipo |  |
| `AnalyticsIndicator` | tipo |  |
| `AnalyticsResponse` | tipo |  |
| `AnalyticsMeasure` | tipo |  |
| `AnalyticsEvaluation` | tipo |  |
| `AnalyticsToolDataset` | tipo |  |
| `AnalyticsDataset` | tipo |  |
| `ANALYTICS_DATASET` | constante | Símbolo de inyección del puerto de datos |
| `AnalyticsProfileScope` | tipo | Mismo recorte que AssessmentProfileScope: filtro Prisma sobre el perfil. |
| `AnalyticsDatasetPort` | tipo | Puerto: quien provea el dataset (Prisma hoy) no condiciona los cálculos. |

Campos:

- `AnalyticsEvaluation.globalScore`: Puntaje global recalculado con la misma estrategia ponderada de las herramientas.
- `AnalyticsEvaluation.sectionScores`: Promedio ponderado por sección (número de sección → puntaje).

### `src/modules/assessment-analytics/domain/statistics.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `round(value, decimals)` | función | Funciones estadísticas puras usadas por la analítica. Sin dependencias: fáciles de probar y de citar en la memoria de tesis. |
| `mean(values)` | función | Media aritmética |
| `median(values)` | función | Mediana |
| `stdDev(values)` | función | Desviación estándar muestral (n-1); 0 si hay menos de 2 valores. |
| `percentileRank(value, population)` | función | Percentil (0–100) que ocupa `value` dentro de `population` (fracción de valores ≤ value). |
| `pearson(xs, ys)` | función | Coeficiente de correlación de Pearson; null si no hay variabilidad o n &lt; 3. |
| `CorrelationStrength` | tipo |  |
| `correlationStrength(r)` | función | Fuerza de una correlación: fuerte desde 0,7, moderada desde 0,4, débil desde 0,2 en valor absoluto |
| `HistogramBin` | tipo |  |
| `histogram(values, bins, min, max)` | función | Histograma de valores 0–10 en `bins` intervalos iguales (el último incluye el 10). |
| `KMeansResult` | tipo |  |
| `kMeans(points, k, maxIterations)` | función | K-means determinístico: centroides iniciales espaciados por el orden de la suma de componentes (evita aleatoriedad para que el resultado sea reproducible en la memoria). Lloyd hasta converger o `maxIterations`. |
| `linearRegression(xs, ys)` | función | Regresión lineal simple y = a + b·x; null si x no varía o n &lt; 3. |

### `src/modules/assessment-analytics/infrastructure/prisma-analytics-dataset.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PrismaAnalyticsDatasetRepository` | clase | Adaptador Prisma → dataset neutro. Recalcula puntajes con la misma estrategia ponderada de las herramientas para que la analítica sea coherente con lo que ve el evaluador en cada resumen. |

| Método | Acceso | Qué hace |
|---|---|---|
| `load(organisation, scope)` | público | Carga evaluaciones, respuestas y medidas del proyecto dentro del alcance |

Notas:

- `load`: Estructura de referencia: la plantilla más reciente usada en el tenant.

### `src/modules/assessment-analytics/presentation/controllers/assessment-analytics.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAnalyticsController` | clase | Analítica transversal de las 3 herramientas. Misma regla de alcance que el dashboard: un evaluador solo analiza las organizaciones que tiene asignadas. |

| Método | Acceso | Qué hace |
|---|---|---|
| `resolveScope(org)` | interno |  |
| `overview(org)` | público | `GET :org/assessments/analytics/overview`. Panorama |
| `gaps(org, query)` | público | `GET :org/assessments/analytics/gaps`. Brechas sistémicas |
| `correlations(org)` | público | `GET :org/assessments/analytics/correlations`. Correlaciones |
| `segments(org, query)` | público | `GET :org/assessments/analytics/segments`. Segmentos |
| `effectiveness(org)` | público | `GET :org/assessments/analytics/effectiveness`. Efectividad de las medidas |
| `clusters(org, query)` | público | `GET :org/assessments/analytics/clusters`. Tipologías |
| `benchmark(org, profileId)` | público | `GET :org/assessments/analytics/benchmark/:profileId`. Posición de una organización frente al conjunto |

### `src/modules/assessment-analytics/presentation/dto/analytics-query.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ToolQueryDto` | clase | Herramienta que se consulta |
| `ClustersQueryDto` | clase | Herramienta y número de grupos |
| `SEGMENT_KEYS` | constante | Criterios de segmentación admitidos |
| `SegmentsQueryDto` | clase | Criterio de segmentación |


## src/modules/assessment-core

### `src/modules/assessment-core/application/assessment-access-scope.service.ts`

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

### `src/modules/assessment-core/application/assessment-applicability.service.ts`

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

### `src/modules/assessment-core/application/assessment-audit.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAuditAction` | tipo | Wrapper fino y tipado sobre ActivityLogService: cada acción auditable de Assessment tiene un nombre estable que el historial de roles y los reportes pueden consultar. Nuevos bloques extienden AssessmentAuditAction sin tocar el resto del servicio. |
| `AssessmentAuditService` | clase | Registra las acciones auditables con nombre estable |

| Método | Acceso | Qué hace |
|---|---|---|
| `record(organisation, action, entityData, createdById?)` | público | Guarda una acción con su autor, IP e identificador de petición |

### `src/modules/assessment-core/application/assessment-dashboard.service.ts`

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

### `src/modules/assessment-core/application/assessment-profiles.service.ts`

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

### `src/modules/assessment-core/application/assessment-roles.service.ts`

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

### `src/modules/assessment-core/application/consolidated-plan.service.ts`

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

### `src/modules/assessment-core/application/organisation-provisioning.service.ts`

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

### `src/modules/assessment-core/assessment-core.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentCoreModule` | clase | Núcleo compartido: perfiles de organización evaluada, aplicabilidad, roles Assessment, dashboard consolidado y auditoría. Los módulos de herramienta (Organizativa/Capacidades/Riesgos) importan este módulo para reutilizar audit/applicability/access-scope y los guards. |

### `src/modules/assessment-core/domain/assessment-narrative.util.ts`

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

### `src/modules/assessment-core/domain/assessment.constants.ts`

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

### `src/modules/assessment-core/domain/contact-phone.ts`

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

### `src/modules/assessment-core/domain/scoring.engine.ts`

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

### `src/modules/assessment-core/domain/tool-templates/_placeholder.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `buildPlaceholderIndicators(codePrefix, sectionNumber, sectionName, count)` | función | Generador de KPI de relleno. No se usa |

### `src/modules/assessment-core/domain/tool-templates/capacity.template.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IndicatorSeed` (interno) | tipo | KPI reales de la Herramienta de Capacidades (Análisis de Capacidades), transcritos del Excel original de la herramienta (nombre, cálculo del indicador y peso exactos, tal como los pasó el usuario desde su hoja de cálculo fuente). Al igual que Organizational (73 KPI) y Risk (46 KPI), este contenido es real, no genérico: 30 KPI reales (11+6+9+4) con su peso real de ponderación dentro de cada sección (no 65 como estimaba la documentación de arquitectura antes de validar contra el Excel). helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) requerido(s), qué campos debe tener cada uno, quién lo firma/llena, formato esperado, y dónde verificarlo. No usa sintaxis markdown (el texto se renderiza en un &lt;p> plano con whitespace-pre-line, así que el formato es solo saltos de línea + numeración/guiones). scoringRubric: rúbrica de 5 bandas ESPECÍFICA de ese KPI (no genérica), con criterios concretos por puntaje. Ambos grounded en el marco normativo de debida diligencia aplicable — DDS vía TRACES, corte de no deforestación 31/12/2020, geolocalización obligatoria por parcela (Art. 9) — y el marco legal ecuatoriano aplicable: Certificado de No Afectación (MAATE, Sistema SAF), licencias de aprovechamiento forestal (MAATE/MAG), Código Orgánico del Ambiente (COA), Código de Trabajo, IESS, SRI y registro de trazabilidad de productores (Agrocalidad/MAG, Sistema SAC). |
| `CAPACITY_TOOL_TEMPLATE` | constante | Plantilla con los 30 KPI |
| `CAPACITY_TOOL_KPI_COUNT` | constante | Total de KPI, para comprobarlo |

### `src/modules/assessment-core/domain/tool-templates/organizational.template.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IndicatorSeed` (interno) | tipo | KPI reales de la Herramienta Organizativa (Diagnóstico Asociativo), transcritos del Excel original de la herramienta (HERRAMIENTA ORGANIZATIONAL DIAGNOSTICO ASOCIATIVO_V3_2025.xlsm, hoja "DATA 6 DIM"): nombre, cálculo del indicador y peso exactos por KPI dentro de cada dimensión (los 6 totales de peso ya suman 100 en el archivo fuente). 73 KPI en 6 dimensiones. helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) o registro(s) requerido(s), qué campos debe tener, quién lo firma/llena, y dónde/cómo verificarlo. A diferencia de Capacidades/Riesgos, Organizational no evalúa cumplimiento legal sino fortalecimiento organizativo (capacidad de la asociación de sostener ese cumplimiento en el tiempo: gobernanza, finanzas, personal, mercado) — por eso los documentos son administrativos/organizativos (actas, contratos, roles de pago, balances, manuales), no permisos ambientales. No usa sintaxis markdown (el texto se renderiza en un &lt;p> plano con whitespace-pre-line). scoringRubric: rúbrica de 5 bandas ESPECÍFICA de cada KPI (no genérica) con umbrales/criterios concretos derivados del propio cálculo del indicador en el Excel original. |
| `ORGANIZATIONAL_TOOL_TEMPLATE` | constante | Plantilla con los 73 KPI |
| `ORGANIZATIONAL_TOOL_KPI_COUNT` | constante | Total de KPI, para comprobarlo |

### `src/modules/assessment-core/domain/tool-templates/risk.template.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IndicatorSeed` (interno) | tipo | KPI reales de la Herramienta de Riesgos (Gestión de Riesgos), transcritos del Excel original de la herramienta (HERRAMIENTA GESTION DE RIESGOS_V3_2025.xlsm, hoja "DATA UE LDD (2)"): nombre, cálculo del indicador y peso exactos por KPI dentro de cada principio (los 4 totales de peso ya suman 100 en el archivo fuente). 46 KPI en 4 principios. helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) requerido(s), qué campos debe tener cada uno, quién lo firma/llena, formato esperado, y dónde verificarlo. No usa sintaxis markdown (el texto se renderiza en un &lt;p> plano con whitespace-pre-line: el formato es solo saltos de línea + numeración/guiones). scoringRubric: rúbrica de 5 bandas ESPECÍFICA de cada KPI (no genérica), grounded en el marco normativo de debida diligencia aplicable y el marco legal ecuatoriano aplicable (RUC/SRI, Código del Trabajo, IESS, MAATE, ECUAPASS, Registro de la Propiedad, SENAGUA). |
| `COUNTRY_RISK_PARAMS` (interno) | constante | RF-02: el país de la organización evaluada determina los parámetros de riesgo. EC como entrada inicial (única jurisdicción del piloto de la tesis). |
| `RISK_TOOL_TEMPLATE` | constante | Plantilla con los 46 KPI |
| `RISK_TOOL_KPI_COUNT` | constante | Total de KPI, para comprobarlo |

### `src/modules/assessment-core/domain/tool-templates/types.ts`

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

### `src/modules/assessment-core/infrastructure/assessment-dashboard-export.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentDashboardExportService` | clase | F6-B02: exportable equivalente al informe consolidado del Excel original — una fila por organización, con el estado/puntaje/alertas de las 3 herramientas lado a lado (mismo dato que ve la tabla del dashboard). |

| Método | Acceso | Qué hace |
|---|---|---|
| `buildWorkbook(rows)` | público | Construye el Excel del panel |

### `src/modules/assessment-core/presentation/controllers/assessment-admin.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAdminController` | clase | RF-08: vista cross-organización para el Administrador de plataforma. A diferencia del resto de assessment-core (todo `:org/assessments/...`), esta ruta no está scoped a una organización, por eso usa el guard global de claims (RequireGlobalSuperAdmin) en lugar de AssessmentPermissionGuard, que exige un `:org` para resolver permisos por organización. |

| Método | Acceso | Qué hace |
|---|---|---|
| `listAllProfiles()` | público | `GET assessments/admin/all-profiles`. Solo de los proyectos que creó el superadministrador que consulta. |

### `src/modules/assessment-core/presentation/controllers/assessment-applicability.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentApplicabilityController` | clase | Rutas de KPI aplicables |

| Método | Acceso | Qué hace |
|---|---|---|
| `get(org, id)` | público | `GET :org/assessments/profiles/:id/applicability`. Consulta |
| `set(org, id, dto)` | público | `PUT :org/assessments/profiles/:id/applicability`. Reemplaza |

### `src/modules/assessment-core/presentation/controllers/assessment-dashboard.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentDashboardController` | clase | RF-07/F6-B01/F6-B02: panel consolidado multi-herramienta. |

| Método | Acceso | Qué hace |
|---|---|---|
| `resolveScope(org)` | interno |  |
| `getDashboard(org, filters)` | público | `GET :org/assessments/dashboard`. Consulta el panel |
| `exportDashboard(org, filters, res)` | público | `GET :org/assessments/dashboard/export`. Descarga el Excel |

### `src/modules/assessment-core/presentation/controllers/assessment-profiles.controller.ts`

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

### `src/modules/assessment-core/presentation/controllers/assessment-roles.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentRolesController` | clase | Rutas de roles |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(org)` | público | `GET :org/assessments/roles`. Lista |
| `assign(org, dto)` | público | `POST :org/assessments/roles`. Asigna |
| `revoke(org, id, confirm?)` | público | `DELETE :org/assessments/roles/:id`. Revoca |
| `history(org, userId)` | público | `GET :org/assessments/roles/history/:userId`. Historial |

### `src/modules/assessment-core/presentation/dto/assign-role.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssignAssessmentRoleDto` | clase | Usuario y rol que se asigna |

### `src/modules/assessment-core/presentation/dto/create-profile.dto.ts`

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

### `src/modules/assessment-core/presentation/dto/dashboard-filter.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `DashboardFilterDto` | clase | RF-07/F6-B01: filtros del panel consolidado. Todos opcionales — sin filtros, el endpoint devuelve todas las organizaciones visibles para el usuario (ya recortadas por AssessmentAccessScopeService si es evaluador). |

### `src/modules/assessment-core/presentation/dto/set-profile-applicability.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `SetAssessmentProfileApplicabilityDto` | clase | Reemplaza el conjunto completo de secciones/indicadores marcados como "no aplica" para un perfil (RF-02/03/04/05: aplicabilidad por organización, no por plantilla). Excluir una sección implica excluir todos sus indicadores (se resuelve en el servicio de scoring, no se duplica en la exclusión). |

### `src/modules/assessment-core/presentation/dto/update-profile.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateAssessmentProfileDto` | clase | Datos que se pueden editar |

Campos:

- `UpdateAssessmentProfileDto.evaluatorId`: `null` limpia explícitamente el evaluador asignado (a diferencia de `undefined`, que Prisma trata como "no tocar este campo").
- `UpdateAssessmentProfileDto.confidential`: Excluye este perfil de la vista cross-organización del Administrador (RF-08)

### `src/modules/assessment-core/presentation/guards/assessment-ai-throttler.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAiThrottlerGuard` | clase | LLM10 (doc 03/06): limita las llamadas a los endpoints de asistencia con IA a 10 solicitudes por minuto por usuario autenticado (no por IP, para no penalizar a toda una oficina compartiendo salida a internet). |

| Método | Acceso | Qué hace |
|---|---|---|
| `getTracker(req)` | redefinible | Cuenta por usuario |

### `src/modules/assessment-core/presentation/guards/assessment-permission.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `REQUIRE_ASSESSMENT_PERMISSION_KEY` | constante | Clave de metadatos |
| `RequireAssessmentPermission(moduleCode, action)` | función | Los roles de evaluación se asignan como filas de AuthUserRole, así que las rutas se autorizan contra la base y no contra los datos del token. |
| `AssessmentPermissionGuard` | clase | Comprueba en la base el permiso que exige la ruta |

| Método | Acceso | Qué hace |
|---|---|---|
| `canActivate(context)` | público | Permite o responde 403 |

### `src/modules/assessment-core/presentation/guards/assessment-scope.guard.ts`

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


## src/modules/assessment-session

### `src/modules/assessment-session/assessment-session.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentSessionModule` | clase | Importado explícitamente por core/organizational/capacity/risk. Nest resuelve el import a la misma instancia en todo el grafo, así que el gateway es un singleton real (un solo namespace /assessment) aunque 4 módulos dependan de él. El servicio de alcance solo depende de Identity y Prisma (globales), así que se provee aquí sin importar AssessmentCoreModule, que ya importa este módulo. |

### `src/modules/assessment-session/domain/ports/realtime-notifier.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `REALTIME_NOTIFIER` | constante | Símbolo de inyección |
| `ScoreUpdatedEvent` | tipo |  |
| `RealtimeNotifierPort` | tipo | Puerto de notificación en tiempo real. Los servicios de herramienta lo invocan tras persistir respuestas; la implementación (Socket.IO) es un detalle de infraestructura y nunca debe hacer fallar el guardado. |

### `src/modules/assessment-session/infrastructure/assessment-session.gateway.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentSocketAuth` | tipo |  |
| `AssessmentSessionGateway` | clase | Varios facilitadores calificando la misma evaluación en el taller ven el avance del otro en vivo. Namespace propio /assessment, sala por evaluación (eval:&lt;evaluationId>) para no reenviar eventos a clientes ajenos. El handshake valida el mismo JWT que la API HTTP, y un evaluador solo entra a la sala de una evaluación de una organización que tiene asignada. |

| Método | Acceso | Qué hace |
|---|---|---|
| `handleConnection(client)` | público | Valida el token al conectar |
| `handleJoin(client, body)` | público | `SUBSCRIBEMESSAGE join`. Entra a la sala si tiene acceso a la evaluación |
| `handleLeave(client, body)` | público | `SUBSCRIBEMESSAGE leave`. Sale de la sala |
| `emitScoreUpdated(evaluationId, payload)` | público | Llamado por los servicios de herramienta tras persistir una respuesta. Nunca lanza. |
| `room(evaluationId)` | interno |  |
| `extractToken(client)` | interno |  |

Notas:

- Mismos orígenes que la API; sin CORS_ORIGIN (local) se admite cualquiera.


## src/modules/audit

### `src/modules/audit/application/activity-log-query.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ActivityLogFilter` | tipo |  |
| `ActivityLogQueryService` | clase | Consulta paginada de la auditoría de una organización (solo administradores). |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(organisation, filter)` | público | Registros filtrados y paginados |

### `src/modules/audit/application/activity-log.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ActivityLogService` | clase | Registro de auditoría en BD. Nunca lanza hacia el caso de uso que lo llama: una falla al auditar no debe deshacer la operación de negocio ya hecha. |

| Método | Acceso | Qué hace |
|---|---|---|
| `createActivityLog(data)` | público | Guarda un registro sin interrumpir la operación |
| `resolveAuthor(createdById?)` | interno |  |
| `preview(data)` | interno |  |

### `src/modules/audit/application/audit-retention.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuditRetentionService` | clase | Política de retención de la auditoría: los registros más antiguos que ACTIVITY_LOG_RETENTION_MONTHS (24 por defecto) se purgan cada noche. Los refresh tokens vencidos/revocados se limpian en la misma pasada. |

| Método | Acceso | Qué hace |
|---|---|---|
| `cutoffDate()` | público | Fecha límite de conservación |
| `runScheduled()` | público | `CRON CronExpression.EVERY_DAY_AT_3AM`. Tarea nocturna |
| `purge()` | público | Borra lo vencido |

### `src/modules/audit/audit.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuditModule` | clase | Auditoría y su retención |

### `src/modules/audit/domain/activity-log.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ACTIVITY_LOG_LEVELS` | constante | Niveles |
| `ActivityLogLevel` | tipo |  |
| `ACTIVITY_LOG_SOURCE_TYPES` | constante | Orígenes |
| `ActivityLogSourceType` | tipo |  |
| `ActivityLogInput` | tipo |  |
| `SYSTEM_USER_ID` | constante | Usuario técnico al que se atribuyen acciones sin autor (seeds, jobs). |

### `src/modules/audit/presentation/activity-log.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ActivityLogController` | clase | Ruta de consulta de la auditoría |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(org, query)` | público | `GET :org/activity-logs`. Consulta paginada de la auditoría (administradores de evaluación). |

### `src/modules/audit/presentation/activity-log.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ActivityLogQueryDto` | clase | Filtros de la consulta |


## src/modules/capacity-tool

### `src/modules/capacity-tool/application/capacity-tool-ai.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CapacityToolAiService` | clase | Asistencia de IA de la Herramienta de Capacidades: solo aporta el contexto de dominio; prompts, parsers anti-alucinación y llamadas viven en la base. |

### `src/modules/capacity-tool/application/capacity-tool.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CapacityToolService` | clase | Herramienta de Capacidades: análisis de capacidades frente al marco normativo por áreas. Todo el flujo (plantilla versionada, evaluación, puntuación, medidas por KPI, exportes, IA, panel) es el genérico de IndicatorMeasureToolService; esta clase solo fija la definición de la herramienta y sus dependencias. |

### `src/modules/capacity-tool/capacity-tool.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CapacityToolModule` | clase | Herramienta de Capacidades. El flujo genérico y los adaptadores de persistencia vienen de EvaluationToolModule; del núcleo: auditoría, aplicabilidad, alcance y guards; del módulo de IA: el cliente LLM; del de sesión: el gateway. |

### `src/modules/capacity-tool/domain/capacity-tool.definition.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CAPACITY_TOOL_DEFINITION` | constante | Herramienta de Capacidades: análisis de capacidades frente al marco normativo por áreas. |
| `CAPACITY_AI_CONTEXT` | constante | Vocabulario de la herramienta para la IA |

Notas:

- Mismo color que la herramienta en la aplicación.

### `src/modules/capacity-tool/presentation/controllers/capacity-tool.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CapacityToolController` | clase | Herramienta de Capacidades — rutas /:org/assessments/capacity/*. |


## src/modules/evaluation-tool

### `src/modules/evaluation-tool/application/evaluation-tool-ai.service.ts`

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

### `src/modules/evaluation-tool/application/evaluation-tool.service.ts`

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
| `countCriticalByEvaluation(evaluations)` | redefinible | Críticos por evaluación para el panel (KPI críticos por defecto). |
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
| `loadOverviewContext(organisation, profileIds)` | redefinible | Carga en lote todo lo que necesita el panel: última evaluación por perfil, exclusiones de aplicabilidad para las no completadas y críticos por evaluación. |
| `buildOrganisationRow(profile, context, children)` | redefinible | Fila del panel de una organización |
| `consolidateChildrenRow(profile, children, context)` | redefinible | Asociación Nivel 2 sin evaluación propia: promedio de sus miembros por sección, para que el panel refleje el estado agregado y no "sin evaluación". |
| `evaluationHistory(organisation, profileId)` | público | Evolución en el tiempo: una evaluación completada = un punto; se usa para el gráfico de tendencia y la diapositiva de evolución del reporte. |
| `improveObservation(organisation, evaluationId, indicatorId, dto, actorId?)` | público | Asistencia con IA |
| `detectInconsistencies(organisation, evaluationId, actorId?)` | público | Una sola llamada por evaluación al intentar completarla. |
| `generateExecutiveNarrative(organisation, evaluationId, dto, actorId?)` | público | Payload liviano: solo puntajes agregados y KPI críticos. |
| `buildAiReportContext(globalScore, sectionScores, criticalItems, evaluation?)` | redefinible | Contexto liviano para la IA: puntajes agregados e ítems críticos. Con la evaluación se agregan los KPI mejor y peor calificados de cada sección y los datos de la organización, que necesitan las fortalezas, brechas y FODA. |
| `tryGenerateReportInsights(organisation, evaluationId, context, actorId?, withSwot)` | redefinible | Análisis de IA para el reporte en diapositivas: insights (fortalezas, brechas, hallazgos) y, si la evaluación está completada, el FODA. Las dos llamadas van en paralelo; si una falla (rate limit, clave inválida, tiempo) el reporte se genera sin esas diapositivas. |

Notas:

- `createEvaluation`: Idempotencia: si ya hay una evaluación en curso para este perfil se devuelve esa en vez de crear un duplicado (doble clic, recarga).
- `improveObservation`: Lee el indicador de la plantilla (no de la respuesta): el KPI puede estar aún sin guardar mientras el usuario califica en el wizard.

### `src/modules/evaluation-tool/application/indicator-measure-tool.service.ts`

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

### `src/modules/evaluation-tool/domain/evaluation-tool-ai.types.ts`

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

### `src/modules/evaluation-tool/domain/evaluation-tool.definition.ts`

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

### `src/modules/evaluation-tool/domain/evaluation-tool.types.ts`

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

### `src/modules/evaluation-tool/domain/ports/evaluation.repository.ts`

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

### `src/modules/evaluation-tool/domain/ports/indicator-measure.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `INDICATOR_MEASURE_REPOSITORY` | constante | Símbolo de inyección |
| `CreateIndicatorMeasureInput` | tipo |  |
| `UpdateIndicatorMeasureInput` | tipo |  |
| `IndicatorMeasureRepository` | tipo |  |

### `src/modules/evaluation-tool/domain/ports/template.repository.ts`

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

### `src/modules/evaluation-tool/evaluation-tool.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `EvaluationToolModule` | clase | Núcleo compartido de las herramientas de evaluación: puertos de persistencia (plantillas, evaluaciones, medidas por KPI) con sus adaptadores Prisma. Las herramientas concretas extienden los servicios genéricos de application/. |

### `src/modules/evaluation-tool/infrastructure/persistence/prisma-evaluation.repository.ts`

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

### `src/modules/evaluation-tool/infrastructure/persistence/prisma-indicator-measure.repository.ts`

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

### `src/modules/evaluation-tool/infrastructure/persistence/prisma-template.repository.ts`

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

### `src/modules/evaluation-tool/infrastructure/reports/evaluation-report.builders.ts`

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

### `src/modules/evaluation-tool/presentation/dto/create-evaluation.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateAssessmentEvaluationDto` | clase | Precondición: la organización a evaluar debe existir; la plantilla vigente de la herramienta se resuelve en el servicio (no la elige el cliente). |

### `src/modules/evaluation-tool/presentation/dto/create-indicator-measure.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateIndicatorMeasureDto` | clase | Plan de acción de las herramientas por KPI: la medida se liga directamente a un KPI crítico de la evaluación (AssessmentResponse.isCritical). |

Campos:

- `CreateIndicatorMeasureDto.support`: "Apoyo" del Excel original: persona/rol de soporte al responsable.
- `CreateIndicatorMeasureDto.budgetUsd`: "Inversión ($ USD)" del Excel original: presupuesto estimado de la medida.
- `CreateIndicatorMeasureDto.verificationLink`: "Medios de verificación" del Excel original: enlace/evidencia de cumplimiento.
- `CreateIndicatorMeasureDto.expectedResult`: Resultado esperado al ejecutar la medida (se define al planificar).
- `CreateIndicatorMeasureDto.appliedImprovements`: Mejoras aplicadas / evidencia narrativa registrada al actualizar el avance.

### `src/modules/evaluation-tool/presentation/dto/create-indicator.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateAssessmentIndicatorDto` | clase | KPI dentro de una sección de la plantilla. `code` debe ser estable para paridad con el instrumento original (p.ej. "1.3"). |

### `src/modules/evaluation-tool/presentation/dto/create-section.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateAssessmentSectionDto` | clase | El administrador define la estructura de una sección de la plantilla (número, nombre, descripción, peso). El peso pondera la sección en el puntaje global. |

### `src/modules/evaluation-tool/presentation/dto/executive-narrative.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ExecutiveNarrativeDto` | clase | Tono pedido para la narrativa |

### `src/modules/evaluation-tool/presentation/dto/export-pptx.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ExportPptxDto` | clase | Síntesis y alcance del cronograma |

Campos:

- `ExportPptxDto.ganttScope`: Qué abarca el Gantt del reporte: solo esta herramienta (por defecto), las tres de la organización, o todas las organizaciones del proyecto.

### `src/modules/evaluation-tool/presentation/dto/improve-observation.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ImproveObservationDto` | clase | El KPI puede no estar guardado todavía (el usuario está calificando en el wizard) — la calificación y observación viajan en el body en vez de leerse de la respuesta persistida, para que "Mejorar redacción" funcione sobre el borrador sin exigir un guardado previo. |

### `src/modules/evaluation-tool/presentation/dto/score-kpi.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `KpiResponseDto` | clase | UCA-04: calificación entera 1..10 + observación obligatoria por KPI (regla de negocio transversal RF-03/04/05, doc 01 §1). |
| `ScoreKpiDto` | clase | Lote de calificaciones |

Campos:

- `KpiResponseDto.manualCritical`: El evaluador puede marcar el KPI como "requiere atención" a mano, aunque el score sea alto (RF-03: no todo lo crítico se refleja en la nota).

### `src/modules/evaluation-tool/presentation/dto/update-indicator-measure.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateIndicatorMeasureDto` | clase | Avance de una medida |

Campos:

- `UpdateIndicatorMeasureDto.expectedResult`: Resultado esperado al ejecutar la medida (se define al planificar).
- `UpdateIndicatorMeasureDto.appliedImprovements`: Mejoras aplicadas / evidencia narrativa registrada al actualizar el avance.

### `src/modules/evaluation-tool/presentation/dto/update-indicator.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateAssessmentIndicatorDto` | clase | Campos editables de un KPI |

### `src/modules/evaluation-tool/presentation/dto/update-section.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateAssessmentSectionDto` | clase | Campos editables de una sección |

### `src/modules/evaluation-tool/presentation/indicator-tool.controller.factory.ts`

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


## src/modules/identity

### `src/modules/identity/application/auth.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuthenticatedSession` | tipo |  |
| `AuthService` | clase | Casos de uso de autenticación. No sabe de bcrypt, JWT ni Google: habla con puertos (DIP) y por eso se puede probar sin red ni criptografía real. |

| Método | Acceso | Qué hace |
|---|---|---|
| `loginWithPassword(email, password, userAgent?)` | público | Inicia sesión con correo y contraseña |
| `loginWithOAuth(idToken, userAgent?)` | público | Inicia sesión con Google |
| `refresh(rawRefreshToken, userAgent?)` | público | Rota el refresh token y emite un nuevo token de acceso. |
| `logout(rawRefreshToken?)` | público | Cierra la sesión |
| `oauthProviders()` | público | Proveedores disponibles |
| `buildSession(user, userAgent?, refresh?)` | interno |  |

Campos:

- `AuthenticatedSession.refreshToken`: Solo para el controlador: va a la cookie HttpOnly, nunca al cuerpo.

Notas:

- `loginWithPassword`: Mismo tiempo de respuesta que con una cuenta real: si no, se podría averiguar qué correos existen.
- `loginWithOAuth`: 1) usuario ya vinculado al proveedor; 2) usuario existente por email (se vincula); 3) no existe → se rechaza: las cuentas las crea un admin o el seed, para que no entre cualquiera con una cuenta de Google.

### `src/modules/identity/application/authorization.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuthorizationService` | clase | RBAC por organización: rol → permisos (módulo:acción). Un usuario puede tener varios roles en la misma organización; se unen sus permisos. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getUserRoles(organisation, userId)` | público | Roles del usuario en el proyecto |
| `getUserPermissions(organisation, userId)` | público | Permisos unidos de sus roles |
| `canPerformAction(organisation, userId, moduleCode, action, isSuperAdmin)` | público | Si puede hacer una acción |

### `src/modules/identity/application/organisation-access.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganisationAccess` | tipo |  |
| `CurrentAccount` | tipo |  |
| `loadCurrentAccount(prisma, userId)` | función | Estado actual de la cuenta, leído de la base y no del token: el token dura horas, y a quien se desactiva, se le quita el superadministrador o se saca de un proyecto debe perder ese acceso de inmediato. |
| `resolveOrganisationAccess(prisma, user, organisation)` | función | Decide con qué alcance entra un usuario a un proyecto. Lo usan el guard de HTTP y el de WebSocket, para que las dos puertas apliquen la misma regla, siempre con la cuenta de loadCurrentAccount. |

Campos:

- `OrganisationAccess.allowed`: Puede entrar al proyecto: es miembro o es el superadministrador que lo creó.
- `OrganisationAccess.isSuperAdmin`: Superadministrador con acceso total en ESTE proyecto: solo el que lo creó. Un superadministrador en un proyecto ajeno entra como cualquier miembro, con el rol que le hayan asignado.
- `CurrentAccount.organisations`: Proyectos de los que es miembro ahora mismo.

### `src/modules/identity/application/organisation-management.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganisationView` | tipo |  |
| `CreateOrganisationInput` | tipo |  |
| `SLUG` (interno) | constante | El identificador viaja en las URLs (`/:org/assessments/...`): slug estricto. |
| `RESERVED` (interno) | constante | Reservados por rutas globales existentes, para que nunca colisionen. |
| `OrganisationManagementService` | clase | Alta y mantenimiento de organizaciones (inquilinos) desde la API, reservado al superadministrador global. Cada superadministrador ve y administra solo los proyectos que creó. Crear una organización no es insertar una fila: hay que dejarla operativa (plantillas, parámetros de riesgo, administrador con su rol), y eso es lo que hace `create` en una sola transacción lógica. |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(actorId)` | público | Proyectos que creó este superadministrador: solo esos administra. |
| `get(id, actorId)` | público | Un proyecto propio |
| `create(input, actor)` | público | Crea un proyecto listo para usar |
| `update(id, input, actor)` | público | Datos editables del alta. El identificador no cambia: vive en las URLs. |
| `reprovision(id, actor)` | público | Vuelve a aplicar las plantillas base sobre una organización existente (útil si se creó antes de que existiera el aprovisionamiento o si una plantilla se borró por error). No toca evaluaciones ni respuestas. |
| `assignableUsers(search?)` | público | Usuarios activos de la plataforma, para asignarlos a un proyecto sin tener que volver a crearlos. Solo datos de contacto, nunca credenciales. |
| `assertAdminInput(input, actor)` | interno | Un administrador nuevo necesita contraseña; una cuenta existente conserva la suya, así que crear un proyecto no sirve para cambiársela a otra persona. |
| `attachAdmin(organisation, input, actor)` | interno | Crea o reutiliza al administrador inicial y le da el rol en la organización. |

Campos:

- `CreateOrganisationInput.adminEmail`: Administrador inicial; si se omite, el superadmin que la crea queda como miembro.

Notas:

- `create`: El administrador se valida antes de crear nada: si sus datos no sirven, no debe quedar un proyecto a medio configurar.
- `create`: Sin plantillas no se puede iniciar ninguna evaluación: se aprovisiona antes de devolver, para que la organización nazca utilizable.
- `attachAdmin`: Validada en assertAdminInput antes de crear el proyecto.

### `src/modules/identity/application/refresh-token.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IssuedRefreshToken` | tipo |  |
| `ROTATION_GRACE_MS` | constante | Dos pestañas comparten la cookie y pueden renovar a la vez: la segunda llega con el token que la primera acaba de rotar. Durante este margen eso no se toma por robo. Es corto para que una cookie robada siga sin servir después. |
| `RefreshTokenService` | clase | Refresh tokens rotatorios: cada uso emite uno nuevo y revoca el anterior. Si alguien presenta un token ya rotado (robo de cookie), se revoca toda la familia y la sesión legítima también cae — el usuario vuelve a iniciar sesión, el atacante pierde el acceso. |

| Método | Acceso | Qué hace |
|---|---|---|
| `ttlMilliseconds()` | público | Vigencia configurada |
| `hash(token)` | interno |  |
| `issue(userId, userAgent?, familyId, client)` | público | Emite un token nuevo en una familia |
| `rotate(rawToken, userAgent?)` | público | Valida y rota: devuelve el usuario y el nuevo token. |
| `isConcurrentRotation(familyId, revokedAt)` | interno | El token se rotó hace un momento y la sesión sigue abierta. Cerrar sesión, desactivar la cuenta o detectar un robo revocan toda la familia: ahí ya no queda ninguno activo y el margen no la revive. |
| `revokeFamily(familyId)` | interno |  |
| `revoke(rawToken)` | público | Cierra la sesión en todas las pestañas que la comparten. |
| `revokeAllForUser(userId)` | público | Cierra todas las sesiones de un usuario (desactivación, baja). |
| `purgeExpired()` | público | Limpieza de tokens vencidos/revocados con más de 30 días. |

Campos:

- `IssuedRefreshToken.token`: Valor opaco que viaja en la cookie HttpOnly (nunca se persiste en claro).

Notas:

- `rotate`: Revocar el token y emitir el siguiente van juntos: si dos pestañas llegan a la vez, solo una lo rota y la otra espera a que el nuevo ya exista.
- `rotate`: Reuso de un token ya rotado: se revoca toda la familia.

### `src/modules/identity/application/request-context.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RequestContextService` | clase | Acceso a la petición actual (usuario autenticado, ip, request-id) sin pasar todo por parámetros de controlador. Request-scoped en HTTP; en tests/scripts se inyecta sin REQUEST y devuelve valores vacíos. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getAuthContext()` | público | Identidad de la petición |
| `getCurrentUserId()` | público | Id del usuario |
| `getCurrentUserEmail()` | público | Correo |
| `getCurrentUserIsSuperAdmin()` | público | Acceso total en este proyecto |
| `getCurrentUserIsPlatformSuperAdmin()` | público | Superadministrador de la plataforma, aunque no sea dueño del proyecto actual. |
| `getCurrentUserOrganisations()` | público | Proyectos |
| `getRequestId()` | público | Identificador de la petición |
| `getRequestIp()` | público | IP resuelta por Express |
| `getUserAgent()` | público | Navegador |
| `getCurrentUser()` | público | Usuario de la base, una vez por petición |
| `requireCurrentUser()` | público | Lo mismo, o error |

Notas:

- `getRequestIp`: Express ya resuelve X-Forwarded-For según «trust proxy»: leer la cabecera aquí dejaba que el cliente escribiera cualquier IP en la auditoría.

### `src/modules/identity/application/user-management.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganisationUserView` | tipo |  |
| `UserManagementService` | clase | Alta y administración de usuarios de una organización. Un administrador de evaluación (assessment_admin) gestiona usuarios y roles de su organización; solo un superadmin global puede otorgar/quitar superadmin. |

| Método | Acceso | Qué hace |
|---|---|---|
| `listMembers(organisation, query)` | público | Miembros del proyecto |
| `createMember(organisation, input, actor)` | público | Crea una cuenta o agrega una existente |
| `updateMember(organisation, userId, input, actor)` | público | Cambia datos, estado, contraseña o rol |
| `assertCanManageAccount(organisation, userId, actor)` | interno | Una cuenta es de la persona, no del proyecto: sin esto, un administrador agregaba a su proyecto la cuenta de otro y le cambiaba la contraseña. |
| `assertCanManageSuperAdmin(target, actor)` | interno |  |
| `removeMember(organisation, userId, actor)` | público | Saca del proyecto y cierra sus sesiones |
| `setViewerVisibility(organisation, userId, input, actor)` | público | Qué organizaciones evaluadas ve un visualizador: todas las del proyecto o una lista. Se guarda en su asignación de rol, así que solo aplica a quien tiene el rol de visualizador. |
| `replaceRole(organisation, userId, roleCode, actorId)` | interno |  |
| `assertMember(organisation, userId)` | interno |  |
| `getMember(organisation, userId)` | interno |  |
| `toView(user)` | interno |  |

Notas:

- Solo en el rol de visualizador: qué organizaciones evaluadas ve.
- `createMember`: Asignar una cuenta existente no cambia su contraseña: si no, quien administra un proyecto podría quedarse con la cuenta de cualquiera.
- `createMember`: Reactivar una cuenta también es cambiarla.
- `createMember`: Usuario existente en otra organización: se agrega como miembro.
- `updateMember`: El rol dentro del proyecto sí lo gestiona su administrador; la cuenta (nombre, contraseña, activación) de un superadministrador o de alguien que también está en otro proyecto, no.
- `updateMember`: Un usuario desactivado o con contraseña cambiada pierde sus sesiones.

### `src/modules/identity/domain/auth-context.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuthContext` | tipo | Identidad autenticada que viaja en la petición (request.auth) tras validar el JWT. Es lo único que la capa de presentación necesita del usuario. |
| `AUTH_CONTEXT_KEY` | constante | Propiedad de la petición donde viaja la identidad |
| `AccessTokenPayload` | tipo |  |

Campos:

- `AuthContext.isSuperAdmin`: Acceso total en la petición actual. En una ruta de proyecto (`:org`) solo es verdadero para el superadministrador que creó ese proyecto.
- `AuthContext.isPlatformSuperAdmin`: Superadministrador de la plataforma, sin importar el proyecto.
- `AuthContext.organisations`: Ids de organización a las que pertenece el usuario.

### `src/modules/identity/domain/permission.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UserPermission` | tipo |  |
| `CanPerformActionResult` | tipo |  |
| `UserRoleWithPermissions` | tipo |  |

### `src/modules/identity/domain/ports/oauth-verifier.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OAUTH_VERIFIER` | constante | Símbolo de inyección |
| `OAuthIdentity` | tipo |  |
| `OAuthVerifierPort` | tipo | Un proveedor OAuth (Google hoy; GitHub/Microsoft mañana) solo tiene que saber verificar un id_token y devolver la identidad — Strategy. |

### `src/modules/identity/domain/ports/password-hasher.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PASSWORD_HASHER` | constante | Símbolo de inyección |
| `PasswordHasherPort` | tipo |  |

### `src/modules/identity/domain/ports/token-issuer.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `TOKEN_ISSUER` | constante | Símbolo de inyección |
| `TokenIssuerPort` | tipo |  |

### `src/modules/identity/identity.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IdentityModule` | clase | Global: RequestContextService y AuthorizationService los usan todos los módulos Assessment, igual que el guard JWT que se registra como APP_GUARD. |

Notas:

- El orden importa: el límite de peticiones cuenta por el usuario que deja JwtAuthGuard en la petición.

### `src/modules/identity/infrastructure/bcrypt-password-hasher.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `BcryptPasswordHasher` | clase | Contraseñas con bcrypt, coste 10 |

| Método | Acceso | Qué hace |
|---|---|---|
| `hash(plain)` | público | Cifra |
| `compare(plain, hash)` | público | Compara |

### `src/modules/identity/infrastructure/google-oauth-verifier.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `GoogleOAuthVerifier` | clase | Login con Google (OAuth 2.0 / OpenID Connect). Gratis: solo requiere un OAuth Client ID de Google Cloud Console. El frontend obtiene el id_token con Google Identity Services y lo manda a POST /auth/google. |

| Método | Acceso | Qué hace |
|---|---|---|
| `enabled()` | público | Si hay Client ID configurado |
| `verify(idToken)` | público | Verifica el id_token |

### `src/modules/identity/infrastructure/jwt-token-issuer.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `JwtTokenIssuer` | clase | Tokens de acceso JWT |

| Método | Acceso | Qué hace |
|---|---|---|
| `sign(payload)` | público | Firma |
| `verify(token)` | público | Verifica |

### `src/modules/identity/presentation/auth.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `REFRESH_COOKIE` | constante | Nombre de la cookie |
| `REFRESH_COOKIE_PATH` (interno) | constante | Solo se envía a /auth/*: el resto de la API nunca ve la cookie. |
| `LOGIN_LIMIT_PER_ACCOUNT` (interno) | constante | La web llega a /auth a través de Vercel (cookie propia, HU-71): varias personas comparten la IP, así que el inicio de sesión cuenta por correo y la renovación por sesión. El tope por IP de abajo frena a quien prueba muchas cuentas y deja entrar a la vez a todo un taller (HU-68). |
| `refreshLimit(context)` (interno) | función | Sin cookie no hay sesión que renovar (cada visita a la web pasa por aquí) y ni siquiera se consulta la base: queda solo el tope por IP. |
| `AuthController` | clase | Rutas de sesión |

| Método | Acceso | Qué hace |
|---|---|---|
| `cookieOptions()` | interno | El refresh token viaja en cookie HttpOnly (inaccesible desde JS) y el token de acceso, corto, en el cuerpo — el frontend lo guarda en memoria. En producción la web llama a /auth en su propio dominio (Vercel lo reenvía aquí): la cookie es propia y los navegadores que bloquean las de terceros la aceptan. SameSite=None cubre a quien todavía llame directo a Heroku. |
| `issue(res, session)` | interno |  |
| `readRefreshCookie(req)` | interno |  |
| `login(dto, userAgent, res)` | público | `POST login`. Correo y contraseña |
| `loginWithGoogle(dto, userAgent, res)` | público | `POST google`. Google |
| `refresh(req, userAgent, res)` | público | `POST refresh`. Renueva el token de acceso rotando el refresh token de la cookie. |
| `logout(req, res)` | público | `POST logout`. Cierra la sesión |
| `providers()` | público | `GET providers`. Proveedores disponibles |
| `me()` | público | `GET me`. Perfil + roles Assessment por organización, para que el frontend sepa qué menús mostrar sin adivinar. |

### `src/modules/identity/presentation/decorators/auth.decorators.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IS_PUBLIC_KEY` | constante | Clave de metadatos |
| `REQUIRE_AUTHENTICATED_KEY` | constante | Clave de metadatos |
| `REQUIRE_SUPERADMIN_KEY` | constante | Clave de metadatos |
| `Public()` | función | Ruta sin token. |
| `RequireAuthenticated()` | función | Usuario autenticado (JWT válido). Si la ruta tiene `:org`, el usuario debe ser miembro de esa organización (o superadmin). |
| `RequireGlobalSuperAdmin()` | función | Solo superadmin global (User.isSuperAdmin). |

### `src/modules/identity/presentation/decorators/current-auth.decorator.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CurrentAuth` | constante | Inyecta la identidad en un controlador |

### `src/modules/identity/presentation/dto/login.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `LoginDto` | clase | Correo y contraseña |
| `OAuthLoginDto` | clase | id_token de Google |

### `src/modules/identity/presentation/dto/organisation.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateOrganisationDto` | clase | Alta de proyecto |
| `UpdateOrganisationDto` | clase | Nombre del proyecto |

Campos:

- `CreateOrganisationDto.id`: Identificador en las URLs (`/:org/assessments/...`). No se puede cambiar después.
- `CreateOrganisationDto.adminEmail`: Si se omite, el superadministrador que la crea queda como administrador.
- `CreateOrganisationDto.adminPassword`: Obligatoria solo si el correo no corresponde a un usuario existente.

### `src/modules/identity/presentation/dto/user-management.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateOrganisationUserDto` | clase | Alta de usuario |
| `UpdateOrganisationUserDto` | clase | Cambios de usuario |
| `ViewerVisibilityDto` | clase | Organizaciones evaluadas que ve un visualizador. |

Campos:

- `CreateOrganisationUserDto.password`: Opcional: sin contraseña el usuario solo podrá entrar por OAuth.
- `CreateOrganisationUserDto.isSuperAdmin`: Solo un superadmin puede otorgarlo.
- `UpdateOrganisationUserDto.roleCode`: Rol de evaluación dentro de la organización; null = sin rol.

### `src/modules/identity/presentation/guards/ip-throttler.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IP_THROTTLER` | constante | Tope por IP de las rutas de /auth, además de su límite por cuenta o sesión. |
| `AUTH_LIMIT_PER_IP` | constante | 300 peticiones por minuto |
| `ipThrottler` | constante | Configuración del tope por IP |

### `src/modules/identity/presentation/guards/jwt-auth.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `getBearerToken(request)` | función | Lee el token de la cabecera |
| `JwtAuthGuard` | clase | Guard global (APP_GUARD). Toda ruta HTTP debe declarar exactamente qué exige: @Public(), @RequireAuthenticated() o @RequireGlobalSuperAdmin() — las rutas sin declaración se rechazan, para que olvidar un decorador nunca deje un endpoint abierto por accidente. |

| Método | Acceso | Qué hace |
|---|---|---|
| `canActivate(context)` | público | Valida sesión, cuenta y pertenencia al proyecto |
| `isEffectivelyPublic(context)` | interno | @Public en el handler gana; un handler restringido nunca se vuelve público por un @Public a nivel de clase. |

Notas:

- `canActivate`: Permisos y membresías de la base, no del token: un usuario desactivado, degradado o sacado de un proyecto pierde el acceso de inmediato.
- `canActivate`: Dentro de un proyecto, el superadministrador solo conserva el acceso total si es quien lo creó; en los demás entra como cualquier miembro.

### `src/modules/identity/presentation/guards/user-throttler.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UserThrottlerGuard` | clase | Límite global de peticiones: por usuario con sesión y por IP sin ella (el inicio de sesión). Contado por IP, los evaluadores de un taller detrás del mismo router compartían 300 peticiones por minuto, y con 20 calificando a la vez una de cada cuatro calificaciones se rechazaba con 429. Se registra justo después de JwtAuthGuard para que la petición ya traiga el usuario. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getTracker(req)` | redefinible | Cuenta por usuario o por IP |

### `src/modules/identity/presentation/organisation-management.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganisationManagementController` | clase | Administración de organizaciones (inquilinos). Son rutas globales, sin `:org`, así que usan el guard de superadministrador en lugar del de permisos por organización. |

| Método | Acceso | Qué hace |
|---|---|---|
| `list()` | público | `GET `. Proyectos propios |
| `assignableUsers(search?)` | público | `GET assignable-users`. Usuarios ya creados que se pueden asignar a un proyecto. |
| `create(dto)` | público | `POST `. Crea |
| `update(id, dto)` | público | `PATCH :id`. Renombra |
| `reprovision(id)` | público | `POST :id/provision`. Reaplica las plantillas base sobre una organización existente. |

### `src/modules/identity/presentation/user-management.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UserManagementController` | clase | Gestión de usuarios de una organización. Requiere el permiso 'admin' del módulo assessment-core (rol assessment_admin) o ser superadmin global. |

| Método | Acceso | Qué hace |
|---|---|---|
| `actor()` | interno |  |
| `list(org, query)` | público | `GET :org/users`. Lista |
| `create(org, dto)` | público | `POST :org/users`. Crea o agrega |
| `update(org, id, dto)` | público | `PATCH :org/users/:id`. Edita |
| `setVisibility(org, id, dto)` | público | `PUT :org/users/:id/visibility`. Qué organizaciones evaluadas ve un usuario con rol de visualizador. |
| `remove(org, id)` | público | `DELETE :org/users/:id`. Saca del proyecto |


## src/modules/organizational-tool

### `src/modules/organizational-tool/application/organizational-tool-ai.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganizationalToolAiService` | clase | Asistencia de IA de la Herramienta Organizativa: solo aporta el contexto de dominio; prompts, parsers anti-alucinación y llamadas viven en la base. |

### `src/modules/organizational-tool/application/organizational-tool.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganizationalToolService` | clase | Herramienta Organizativa: diagnóstico de fortalecimiento organizativo por dimensiones. Todo el flujo (plantilla versionada, evaluación, puntuación, medidas por KPI, exportes, IA, panel) es el genérico de IndicatorMeasureToolService; esta clase solo fija la definición de la herramienta y sus dependencias. |

### `src/modules/organizational-tool/domain/organizational-tool.definition.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ORGANIZATIONAL_TOOL_DEFINITION` | constante | Herramienta Organizativa: diagnóstico de fortalecimiento organizativo por dimensiones. |
| `ORGANIZATIONAL_AI_CONTEXT` | constante | Vocabulario de la herramienta para la IA |

Notas:

- Mismo color que la herramienta en la aplicación.

### `src/modules/organizational-tool/organizational-tool.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganizationalToolModule` | clase | Herramienta Organizativa. El flujo genérico y los adaptadores de persistencia vienen de EvaluationToolModule; del núcleo: auditoría, aplicabilidad, alcance y guards; del módulo de IA: el cliente LLM; del de sesión: el gateway. |

### `src/modules/organizational-tool/presentation/controllers/organizational-tool.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganizationalToolController` | clase | Herramienta Organizativa — rutas /:org/assessments/organizational/*. |


## src/modules/risk-tool

### `src/modules/risk-tool/application/risk-tool-ai.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AiRiskItem` | tipo |  |
| `AiRiskMeasureSuggestion` | tipo |  |
| `RiskToolAiService` | clase | Asistencia de IA de la Herramienta de Riesgos: hereda las capacidades comunes (observaciones, inconsistencias, narrativa, insights) y añade la sugerencia de medidas de mitigación a partir de riesgos no despreciables. |
| `parseAiRiskMeasureSuggestions(raw, validIndicatorIds)` | función | Anti-alucinación: toda sugerencia con un indicatorId fuera de la lista pedida se descarta. |

| Método | Acceso | Qué hace |
|---|---|---|
| `suggestMeasuresForPrinciple(principleName, riskItems)` | público | Se llama con los riesgos de UN solo principio a la vez. |

### `src/modules/risk-tool/application/risk-tool.service.ts`

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

### `src/modules/risk-tool/domain/ports/risk.repository.ts`

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

### `src/modules/risk-tool/domain/risk-tool.definition.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RISK_TOOL_DEFINITION` | constante | Herramienta de Riesgos: identificación y gestión de riesgos por principios, con clasificación por umbral (configurable por país) y plan de mitigación. |
| `RISK_AI_CONTEXT` | constante | Vocabulario de la herramienta para la IA |

Notas:

- Mismo color que la herramienta en la aplicación.

### `src/modules/risk-tool/domain/risk-tool.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RiskClass` | tipo |  |
| `RiskRecord` | tipo |  |
| `MitigationMeasureRecord` | tipo |  |
| `RiskWithMeasures` | tipo |  |

### `src/modules/risk-tool/infrastructure/persistence/prisma-risk.repository.ts`

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

### `src/modules/risk-tool/infrastructure/reports/risk-report.builders.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `buildMitigationPlanExcel(definition, evaluation, risks)` | función | Plan de mitigación: una fila por medida (o por riesgo sin medida), con el KPI de origen, y una segunda hoja con los riesgos por sección. |
| `MitigationPptxInput` | tipo |  |
| `buildMitigationPlanPptx(definition, input)` | función | Presentación de riesgos |

Campos:

- `MitigationPptxInput.consolidatedGantt`: Plan consolidado que reemplaza al Gantt propio de la herramienta cuando al exportar se pide un alcance mayor (la organización o el proyecto).

Notas:

- `buildMitigationPlanPptx`: Solo los no despreciables necesitan medida de mitigación.

### `src/modules/risk-tool/presentation/controllers/risk-tool.controller.ts`

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

### `src/modules/risk-tool/presentation/dto/country-param.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpsertRiskCountryParamDto` | clase | Umbral de despreciabilidad por país (score > umbral ⇒ riesgo despreciable). |

### `src/modules/risk-tool/presentation/dto/create-risk-measure.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateAssessmentRiskMeasureDto` | clase | RF-06 (UCV-07): medida de mitigación ligada a un riesgo NON_NEGLIGIBLE. `startWeek` es el lunes de la semana de inicio (selector); `endDate` la calcula el servicio como `startWeek + durationDays`, nunca el cliente. |

Campos:

- `CreateAssessmentRiskMeasureDto.support`: "Apoyo" del Excel original: persona/rol de soporte al responsable.
- `CreateAssessmentRiskMeasureDto.budgetUsd`: "Inversión ($ USD)" del Excel original: presupuesto estimado de la medida.
- `CreateAssessmentRiskMeasureDto.verificationLink`: "Medios de verificación" del Excel original: enlace/evidencia de cumplimiento.
- `CreateAssessmentRiskMeasureDto.expectedResult`: Resultado esperado al ejecutar la medida (se define al planificar).
- `CreateAssessmentRiskMeasureDto.appliedImprovements`: Mejoras aplicadas / evidencia narrativa registrada al actualizar el avance.

### `src/modules/risk-tool/presentation/dto/score-kpi-risk.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `KpiResponseRiskDto` | clase | RF-05: calificación entera 1..10 + observación obligatoria por KPI (misma regla transversal que Organizativa/Capacidades), más la descripción de riesgo obligatoria y el tipo de riesgo opcional que exige la Herramienta de Riesgos (doc 03 §4: "igual que Organizational más riskDescription (obligatoria) y riskType"). El servicio clasifica el riesgo y upserta AssessmentRisk a partir de estos dos campos — no se persisten en AssessmentResponse. |
| `ScoreKpiRiskDto` | clase | Lote de calificaciones con riesgo |

Campos:

- `KpiResponseRiskDto.manualCritical`: El evaluador puede marcar el KPI como "requiere atención" a mano, aunque el score sea alto.

### `src/modules/risk-tool/presentation/dto/update-measure.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UpdateAssessmentMitigationMeasureDto` | clase | Avance de una medida de mitigación: mismos campos que las medidas por KPI. |

### `src/modules/risk-tool/risk-tool.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RiskToolModule` | clase | Herramienta de Riesgos. Reutiliza del núcleo: auditoría, aplicabilidad, alcance de acceso y guards; del módulo de IA: el cliente LLM compartido; del módulo de sesión: el gateway de tiempo real (misma instancia). |


## src/shared/domain

### `src/shared/domain/soft-delete.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `NOT_DELETED` | constante | Convención transversal: los registros se "borran" fijando deletedAt. Todas las consultas de lectura filtran deletedAt: null explícitamente (no hay middleware global de soft-delete como en el sistema de origen). |


## src/shared/infrastructure

### `src/shared/infrastructure/config/env.validation.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `EnvironmentVariables` (interno) | clase | Fail-fast: si falta una variable obligatoria el proceso no arranca, en vez de fallar más tarde en la primera petición. |
| `validateEnv(config)` | función | Valida las variables al arrancar |

Campos:

- `EnvironmentVariables.JWT_EXPIRES_IN`: Jornada completa: el token de acceso vive en memoria del navegador, así que al recargar se renueva con el refresh token rotatorio. Con 15 min la renovación era constante y cualquier fallo se notaba enseguida.
- `EnvironmentVariables.ACTIVITY_LOG_RETENTION_MONTHS`: Retención de la auditoría (ActivityLog): meses que se conservan.

Notas:

- `validateEnv`: En producción un secreto débil o el de ejemplo deja los JWT falsificables.

### `src/shared/infrastructure/database/prisma.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PrismaModule` | clase | Acceso global a la base |

### `src/shared/infrastructure/database/prisma.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PrismaService` | clase | Único punto de acceso a la base de datos. Las capas de aplicación lo reciben inyectado; el dominio nunca lo importa. |

| Método | Acceso | Qué hace |
|---|---|---|
| `onModuleInit()` | público | Abre la conexión |
| `onModuleDestroy()` | público | La cierra |

### `src/shared/infrastructure/http/all-exceptions.filter.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AllExceptionsFilter` | clase | Respuesta de error uniforme: statusCode, message, requestId y timestamp. Los errores no controlados (500) se registran con stack y, en producción, no exponen detalles internos al cliente. |

| Método | Acceso | Qué hace |
|---|---|---|
| `catch(exception, host)` | público | Convierte cualquier error en la respuesta uniforme |

Notas:

- `catch`: Los 502–504 son de un servicio externo (la IA) o de saturación y ya se responden con un mensaje: se registran, pero no son fallas propias.

### `src/shared/infrastructure/http/health.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `HealthController` | clase | Estado del servicio |

| Método | Acceso | Qué hace |
|---|---|---|
| `check()` | público | `GET `. Comprueba la base y cuenta los errores recientes |

### `src/shared/infrastructure/http/request-id.middleware.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `SAFE_ID` (interno) | constante | Lo que manda el cliente acaba en los registros: solo identificadores cortos. |
| `RequestIdMiddleware` | clase | Correlación de logs/auditoría: respeta X-Request-Id si el cliente lo manda. |

| Método | Acceso | Qué hace |
|---|---|---|
| `use(req, res, next)` | público | Asigna el identificador |

### `src/shared/infrastructure/http/request-log.middleware.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RequestLogMiddleware` | clase | Una línea por petición: ruta, estado, duración y usuario. Sin parámetros de consulta, cuerpo ni cabeceras, que pueden llevar datos de las organizaciones. |

| Método | Acceso | Qué hace |
|---|---|---|
| `use(req, res, next)` | público | Registra la petición al terminar |

### `src/shared/infrastructure/logging/logger.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `LoggerModule` | clase | Registro y contador de errores |

### `src/shared/infrastructure/logging/server-error-monitor.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ServerErrorMonitor` | clase | Cuenta los errores 5xx de la última hora. Los expone /health para que la vigilancia (`.github/workflows/vigilancia.yml`) avise al equipo. Vive en memoria: se reinicia con el servidor, y el detalle queda en los registros. |

| Método | Acceso | Qué hace |
|---|---|---|
| `record(now)` | público | Suma un error |
| `snapshot(now)` | público | Errores de la última hora |
| `prune(now)` | interno |  |

### `src/shared/infrastructure/logging/structured-logger.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `LogContext` | tipo |  |
| `StructuredLoggerService` | clase | Logger estructurado (una línea JSON por evento en producción, texto legible en desarrollo). Instancia transitoria: cada servicio fija su propio contexto con setContext() sin pisar el de los demás. |

| Método | Acceso | Qué hace |
|---|---|---|
| `setContext(context)` | público | Fija datos comunes |
| `debug(message, context?)` | público | Solo en desarrollo |
| `info(message, context?)` | público | Informativo |
| `warn(message, context?)` | público | Advertencia |
| `error(message, error?, context?)` | público | Error con traza |
| `write(level, message, context?)` | interno |  |

### `src/shared/infrastructure/reports/excel-cell.util.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `EXCEL_CELL_MAX_LENGTH` | constante | Límite de caracteres por celda de Excel. |
| `clampExcelText(value, columnId?)` | función | Recorta un texto al límite de una celda de Excel. |
| `sanitizeForExcelCell(value, columnId?)` | función | Prepara cualquier valor para una celda: recorta solo textos, deja números y booleanos, y reemplaza por un aviso lo que no quepa. |
| `clampForExcelCell` | constante | Nombre anterior de sanitizeForExcelCell. |
| `ExcelColumnKind` | tipo | Hojas con formato (ExcelJS)   Los reportes que se entregan a las organizaciones se generan con ExcelJS: título, encabezado con color, anchos de columna, texto ajustado, filtros y la fila de encabezado inmovilizada. |
| `ExcelColumn` | tipo |  |
| `ExcelSheetSpec` | tipo |  |
| `safeSheetName(name)` (interno) | función | Nombre de hoja válido para Excel: máx. 31 caracteres y sin : \ / ? * [ ] |
| `buildFormattedWorkbook(sheets)` | función | Libro de Excel con formato |

Campos:

- `ExcelColumn.width`: Ancho en caracteres.
- `ExcelSheetSpec.subtitle`: Línea de contexto bajo el título (organización, fecha…).

### `src/shared/infrastructure/reports/export-limiter.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `MAX_CONCURRENT` (interno) | constante | Los exportes (PPTX/Excel) se generan en memoria y son costosos en CPU: un semáforo acota cuántos se construyen a la vez y cuántos esperan en cola, para que un lote de descargas no tumbe el proceso. Sin dependencias. |
| `withExportSlot(task)` | función | Ejecuta `task` cuando hay un cupo libre; rechaza si la cola está llena. |
| `exportLimiterStats()` | función | Estado actual, para pruebas y diagnóstico. |

### `src/shared/infrastructure/reports/pptx-report.util.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PptxGenJSCtor` (interno) | constante | `pptxgenjs`'s CJS build does `module.exports = PptxGenJS` (no `.default`), so a plain default import breaks under ts-jest (which honors tsconfig's missing `esModuleInterop`) even though it works fine under the SWC runtime Nest uses. A direct `require` + type cast works identically under both. eslint-disable-next-line @typescript-eslint/no-var-requires |
| `REPORT_COLORS` | constante | Reporte de resultados con el formato de las presentaciones de diagnóstico: barra lateral y títulos en el color de la herramienta (azul Organizativa, naranja Capacidades, verde Riesgos), resultados en porcentaje y colores de semáforo reservados para el nivel de cada puntaje. Todos los gráficos son formas nativas, nunca gráficos de Office: así se ven igual en PowerPoint, Keynote y Google Slides. |
| `mix(from, to, ratio)` | función | Mezcla dos colores hex; `ratio` es la proporción del segundo. |
| `scorePct(score)` | función | Escala   /** Puntaje de 0 a 10 llevado a porcentaje entero. |
| `pctLabel(score)` | función | Porcentaje para mostrar |
| `tierColor(score, lowMax, mediumMax)` | función | Color del semáforo |
| `tierLevel(score)` | función | Nivel bajo, medio o alto |
| `formatDate(date)` (interno) | función | Utilidades de texto |
| `fitFontSize(text, w, h, max, min, charEm, lineEm)` (interno) | función | Tamaño de letra que deja entrar el texto en la caja (estimación por área). |
| `createReportPptx(footerLabel?, opts?)` | función | Presentación y marco de cada lámina |
| `addCoverSlide(pptx, opts)` | función | Portada |
| `ResultCard` | tipo | Resultados globales: barras horizontales por sección |
| `addGlobalResultsSlide(pptx, opts)` | función | Resultados en barras |
| `InsightPoint` | tipo | Lectura ejecutiva y fortalezas/brechas |
| `addPointList(slide, points, box, opts)` (interno) | función | Lista de puntos con viñeta: "Título: detalle". |
| `GAUGE_ZONES` (interno) | constante | Resumen ejecutivo: velocímetro del resultado global y síntesis   Ángulos OOXML: 0° al este, creciendo en sentido horario. El semicírculo superior va de 180° (0 %) a 360° (100 %). Cortes del semáforo: rojo hasta 50 %, amarillo hasta 70 %, verde desde 70 %. |
| `addExecutiveSummarySlide(pptx, opts)` | función | Resumen ejecutivo |
| `addExecutiveReadingSlide(pptx, opts)` | función | Lectura ejecutiva |
| `drawTrafficLight(pptx, slide, x, y, score)` (interno) | función | Una lámina por sección: avance, fortalezas, brechas y semáforo |
| `addSectionDetailSlide(pptx, opts)` | función | Detalle de una sección |
| `TableCell` | tipo | Tabla genérica paginada |
| `TableColumn` | tipo |  |
| `addChips(pptx, slide, chips, y)` (interno) | función | Cifras en píldoras sobre una tabla o un gráfico. |
| `addTableSlide(pptx, opts)` | función | Tabla con encabezado en el color de la herramienta y filas alternas teñidas; cada lámina repite el encabezado. `summary` son cifras en píldoras sobre la tabla. |
| `paginateRows(columns, rows, opts)` (interno) | función | Reparte las filas en láminas según el alto estimado de cada una (las celdas largas ocupan varias líneas), sin pasar de `maxRows` por lámina. |
| `addNumberedListSlide(pptx, opts)` | función | Lista numerada (hallazgos y recomendaciones) |
| `addProportionBar(pptx, slide, opts)` | función | Barra apilada (proporciones de un total) |
| `addClassificationSlide(pptx, opts)` | función | Clasificación de riesgos |
| `PlanMeasure` | tipo | Resumen del plan de acción |
| `addPlanSummarySlide(pptx, opts)` | función | Resumen del plan |
| `addSwotSlide(pptx, opts)` | función | FODA |
| `TimelineMeasure` | tipo | Cronograma (Gantt) |
| `addTimelineSlide(pptx, opts)` | función | Cronograma |
| `EvolutionPoint` | tipo | Evolución entre evaluaciones: barras y línea |
| `addEvolutionSlide(pptx, opts)` | función | Barras por evaluación completada, línea de tendencia y tabla de variaciones. |
| `writePptxBuffer(pptx)` | función | Genera el archivo dentro del cupo de exportes |

Campos:

- `TableColumn.weight`: Ancho relativo; se reparte sobre el ancho útil de la lámina.

Notas:

- `fitFontSize`: Ancho medio de un carácter en em: 0,46 para texto, más para negritas grandes.
- `addCoverSlide`: Círculos de fondo en el color de la herramienta, como motivo de portada.
- `addGlobalResultsSlide`: Promedio global: línea y etiqueta sobre el gráfico.
- `addExecutiveSummarySlide`: "Capacidad alta", "Capacidad media"…
- `addExecutiveSummarySlide`: Síntesis.
- `addSectionDetailSlide`: Avance hacia la meta del 100 %.
- `addSectionDetailSlide`: Tarjeta del semáforo.
- `addPlanSummarySlide`: KPI críticos (o riesgos) que todavía no tienen medida.
- `addPlanSummarySlide`: Avance promedio del plan.
- `addPlanSummarySlide`: Primero lo que vence antes y no está concluido.
- `addTimelineSlide`: Escala por meses completos, del mes de la primera medida al de la última.
- `addTimelineSlide`: Meses: etiqueta y línea vertical; si son muchos, se etiqueta uno de cada n.
- `addEvolutionSlide`: Línea de tendencia que une las barras, en el color de la herramienta.
- `rows`: Se compara ya redondeado, como se muestra.


## src/shared/presentation

### `src/shared/presentation/pagination.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `MAX_PAGE_SIZE` | constante | Máximo por página |
| `MAX_UNPAGED_ROWS` | constante | Tope de filas cuando el cliente no pagina (compatibilidad con listados clásicos). |
| `PaginationQueryDto` | clase | Página y tamaño |
| `Paginated` | tipo |  |
| `pageArgs(query)` | función | Argumentos Prisma (`skip`/`take`) para una consulta paginada o acotada. |
| `pageResult(query, items, total)` | función | Devuelve el sobre paginado cuando el cliente pidió `page`; si no, la lista plana (acotada) para no romper a los consumidores que esperan un array. |

