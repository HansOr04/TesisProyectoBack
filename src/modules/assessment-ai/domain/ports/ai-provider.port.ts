export interface AiCompletionResult {
  text: string;
  tokensUsed?: number;
}

// Un proveedor de LLM solo sabe completar un prompt. Gemini y NVIDIA lo
// implementan; el cliente elige uno por configuración (Strategy).
export interface AiProvider {
  readonly name: string;
  complete(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
  ): Promise<AiCompletionResult>;
}
