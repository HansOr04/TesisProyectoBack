export interface AiCompletionResult {
  text: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  cached?: boolean;
}

export interface AiCompletionOptions {
  fast?: boolean;
  cache?: boolean;
  json?: boolean;
  isUsable?: (text: string) => boolean;
}

export interface AiProvider {
  readonly name: string;
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
