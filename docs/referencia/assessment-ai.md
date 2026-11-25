# assessment-ai


## Dominio

### llm-circuit-breaker.ts

`src/modules/assessment-ai/domain/llm-circuit-breaker.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `LlmCircuitBreaker` | clase | LLM10 (doc 03/06): tras 5 fallos consecutivos (429/5xx) de un proveedor de IA se deja de llamarlo por 5 minutos en vez de seguir intentando y acumular costo/latencia contra un proveedor caído. Estado en memoria por instancia de proceso — cada servicio de IA (Organizativa/Capacidades/Riesgos) mantiene su propia instancia, ya que cada uno puede apuntar a un proveedor distinto. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getState(key)` | interno |  |
| `isOpen(key)` | público | Si el proveedor está cortado en este momento |
| `recordSuccess(key)` | público | Reinicia la cuenta de fallos |
| `recordFailure(key)` | público | Suma un fallo y corta al llegar al límite |

### ai-provider.port.ts

`src/modules/assessment-ai/domain/ports/ai-provider.port.ts`

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


## Aplicación

### assessment-llm-client.service.ts

`src/modules/assessment-ai/application/assessment-llm-client.service.ts`

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


## Infraestructura

### ai-provider.factory.ts

`src/modules/assessment-ai/infrastructure/ai-provider.factory.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AiProviderFactoryResult` | tipo |  |
| `createAiProviderFromEnv(httpService, env)` | función | Factory Method: la selección del proveedor vive en un solo lugar y el cliente LLM no conoce las clases concretas. |

Campos:

- `AiProviderFactoryResult.requiredVariable`: Nombre de la variable de entorno con la API key del proveedor elegido.

Notas:

- `createAiProviderFromEnv`: gemini-flash-latest razona antes de responder (~20 s); el modelo lite responde en 1-3 s, lo que cabe en los 30 s de Heroku de un export.

### gemini.provider.ts

`src/modules/assessment-ai/infrastructure/providers/gemini.provider.ts`

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

### nvidia.provider.ts

`src/modules/assessment-ai/infrastructure/providers/nvidia.provider.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `NvidiaProvider` | clase | Proveedor de NVIDIA (API compatible con OpenAI) |

| Método | Acceso | Qué hace |
|---|---|---|
| `modelFor()` | público | Modelo configurado |
| `complete(systemPrompt, userPrompt, maxOutputTokens, temperature, timeoutMs)` | público | Llama a NVIDIA y devuelve texto y consumo |


## Módulo

### assessment-ai.module.ts

`src/modules/assessment-ai/assessment-ai.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentAiModule` | clase | Importado (no reproveído) por los módulos Organizativa/Capacidades/Riesgos para que las 3 herramientas compartan la MISMA instancia de AssessmentLlmClientService — un solo circuit breaker y una sola selección de proveedor. |
