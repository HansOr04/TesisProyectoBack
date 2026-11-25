# assessment-analytics


## Dominio

### analytics.types.ts

`src/modules/assessment-analytics/domain/analytics.types.ts`

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

### statistics.ts

`src/modules/assessment-analytics/domain/statistics.ts`

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


## Aplicación

### assessment-analytics.service.ts

`src/modules/assessment-analytics/application/assessment-analytics.service.ts`

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


## Infraestructura

### prisma-analytics-dataset.repository.ts

`src/modules/assessment-analytics/infrastructure/prisma-analytics-dataset.repository.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PrismaAnalyticsDatasetRepository` | clase | Adaptador Prisma → dataset neutro. Recalcula puntajes con la misma estrategia ponderada de las herramientas para que la analítica sea coherente con lo que ve el evaluador en cada resumen. |

| Método | Acceso | Qué hace |
|---|---|---|
| `load(organisation, scope)` | público | Carga evaluaciones, respuestas y medidas del proyecto dentro del alcance |

Notas:

- `load`: Estructura de referencia: la plantilla más reciente usada en el tenant.


## Presentación

### assessment-analytics.controller.ts

`src/modules/assessment-analytics/presentation/controllers/assessment-analytics.controller.ts`

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

### analytics-query.dto.ts

`src/modules/assessment-analytics/presentation/dto/analytics-query.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ToolQueryDto` | clase | Herramienta que se consulta |
| `ClustersQueryDto` | clase | Herramienta y número de grupos |
| `SEGMENT_KEYS` | constante | Criterios de segmentación admitidos |
| `SegmentsQueryDto` | clase | Criterio de segmentación |


## Módulo

### assessment-analytics.module.ts

`src/modules/assessment-analytics/assessment-analytics.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAnalyticsModule` | clase | Analítica de datos sobre las evaluaciones: el servicio depende del puerto ANALYTICS_DATASET (DIP) y toda la estadística vive en domain/statistics.ts. |
