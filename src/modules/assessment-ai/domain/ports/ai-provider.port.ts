export interface AiCompletionResult {
  text: string;
  tokensUsed?: number;
  /** Tokens de entrada (prompt) y de salida, cuando el proveedor los informa. */
  inputTokens?: number;
  outputTokens?: number;
  /** Por qué terminó la respuesta (STOP, MAX_TOKENS…), si el proveedor lo dice. */
  finishReason?: string;
  /** La respuesta salió de la caché: no se llamó al proveedor. */
  cached?: boolean;
}

// Un proveedor de LLM solo sabe completar un prompt. Gemini y NVIDIA lo
// implementan; el cliente elige uno por configuración (Strategy).
export interface AiCompletionOptions {
  /**
   * Prioriza la latencia: el proveedor usa su modelo rápido (sin
   * razonamiento previo). Para llamadas que deben responder dentro de un
   * export, como los análisis del reporte.
   */
  fast?: boolean;
  /**
   * Reutiliza la respuesta guardada para exactamente el mismo prompt. Solo
   * para análisis que deben salir iguales con los mismos datos (reporte).
   */
  cache?: boolean;
  /** Pide al proveedor una respuesta en JSON válido (modo JSON de Gemini). */
  json?: boolean;
  /**
   * Con `cache`: solo se guarda (y se reutiliza) una respuesta que pase esta
   * validación, para no repetir una respuesta cortada o mal formada.
   */
  isUsable?: (text: string) => boolean;
}

export interface AiProvider {
  readonly name: string;
  /** Modelo que usaría con estas opciones (forma parte de la clave de caché). */
  modelFor?(options?: AiCompletionOptions): string;
  complete(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
    timeoutMs: number,
    options?: AiCompletionOptions,
  ): Promise<AiCompletionResult>;
}
