# capacity-tool


## Dominio

### capacity-tool.definition.ts

`src/modules/capacity-tool/domain/capacity-tool.definition.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CAPACITY_TOOL_DEFINITION` | constante | Herramienta de Capacidades: análisis de capacidades frente al marco normativo por áreas. |
| `CAPACITY_AI_CONTEXT` | constante | Vocabulario de la herramienta para la IA |

Notas:

- Mismo color que la herramienta en la aplicación.


## Aplicación

### capacity-tool-ai.service.ts

`src/modules/capacity-tool/application/capacity-tool-ai.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CapacityToolAiService` | clase | Asistencia de IA de la Herramienta de Capacidades: solo aporta el contexto de dominio; prompts, parsers anti-alucinación y llamadas viven en la base. |

### capacity-tool.service.ts

`src/modules/capacity-tool/application/capacity-tool.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CapacityToolService` | clase | Herramienta de Capacidades: análisis de capacidades frente al marco normativo por áreas. Todo el flujo (plantilla versionada, evaluación, puntuación, medidas por KPI, exportes, IA, panel) es el genérico de IndicatorMeasureToolService; esta clase solo fija la definición de la herramienta y sus dependencias. |


## Presentación

### capacity-tool.controller.ts

`src/modules/capacity-tool/presentation/controllers/capacity-tool.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CapacityToolController` | clase | Herramienta de Capacidades — rutas /:org/assessments/capacity/*. |


## Módulo

### capacity-tool.module.ts

`src/modules/capacity-tool/capacity-tool.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CapacityToolModule` | clase | Herramienta de Capacidades. El flujo genérico y los adaptadores de persistencia vienen de EvaluationToolModule; del núcleo: auditoría, aplicabilidad, alcance y guards; del módulo de IA: el cliente LLM; del de sesión: el gateway. |
