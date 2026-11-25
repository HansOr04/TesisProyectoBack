# organizational-tool


## Dominio

### organizational-tool.definition.ts

`src/modules/organizational-tool/domain/organizational-tool.definition.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ORGANIZATIONAL_TOOL_DEFINITION` | constante | Herramienta Organizativa: diagnóstico de fortalecimiento organizativo por dimensiones. |
| `ORGANIZATIONAL_AI_CONTEXT` | constante | Vocabulario de la herramienta para la IA |

Notas:

- Mismo color que la herramienta en la aplicación.


## Aplicación

### organizational-tool-ai.service.ts

`src/modules/organizational-tool/application/organizational-tool-ai.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganizationalToolAiService` | clase | Asistencia de IA de la Herramienta Organizativa: solo aporta el contexto de dominio; prompts, parsers anti-alucinación y llamadas viven en la base. |

### organizational-tool.service.ts

`src/modules/organizational-tool/application/organizational-tool.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganizationalToolService` | clase | Herramienta Organizativa: diagnóstico de fortalecimiento organizativo por dimensiones. Todo el flujo (plantilla versionada, evaluación, puntuación, medidas por KPI, exportes, IA, panel) es el genérico de IndicatorMeasureToolService; esta clase solo fija la definición de la herramienta y sus dependencias. |


## Presentación

### organizational-tool.controller.ts

`src/modules/organizational-tool/presentation/controllers/organizational-tool.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganizationalToolController` | clase | Herramienta Organizativa — rutas /:org/assessments/organizational/*. |


## Módulo

### organizational-tool.module.ts

`src/modules/organizational-tool/organizational-tool.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganizationalToolModule` | clase | Herramienta Organizativa. El flujo genérico y los adaptadores de persistencia vienen de EvaluationToolModule; del núcleo: auditoría, aplicabilidad, alcance y guards; del módulo de IA: el cliente LLM; del de sesión: el gateway. |
