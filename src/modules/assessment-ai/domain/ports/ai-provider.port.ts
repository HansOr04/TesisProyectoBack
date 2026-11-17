export interface AiCompletionResult {
  text: string;
  tokensUsed?: number;
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
}

export interface AiProvider {
  readonly name: string;
  complete(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
    timeoutMs: number,
    options?: AiCompletionOptions,
  ): Promise<AiCompletionResult>;
}
