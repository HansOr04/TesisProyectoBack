import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AiCompletionOptions,
  AiCompletionResult,
  AiProvider,
} from '../../domain/ports/ai-provider.port';

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';

  constructor(
    private readonly httpService: HttpService,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fastModel: string = model,
  ) {}

  modelFor(options?: AiCompletionOptions): string {
    return options?.fast ? this.fastModel : this.model;
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
    timeoutMs: number,
    options?: AiCompletionOptions,
  ): Promise<AiCompletionResult> {
    const model = this.modelFor(options);
    const response = await firstValueFrom(
      this.httpService.post<{
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string; thought?: boolean }> };
          finishReason?: string;
        }>;
        usageMetadata?: {
          totalTokenCount?: number;
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          thoughtsTokenCount?: number;
        };
      }>(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            maxOutputTokens,
            temperature,
            ...(options?.json ? { responseMimeType: 'application/json' } : {}),
          },
        },
        {
          timeout: timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': this.apiKey,
          },
        },
      ),
    );
    const parts = response.data.candidates?.[0]?.content?.parts ?? [];
    const usage = response.data.usageMetadata;
    return {
      text: parts
        .filter((p) => !p.thought)
        .map((p) => p.text ?? '')
        .join(''),
      tokensUsed: usage?.totalTokenCount,
      finishReason: response.data.candidates?.[0]?.finishReason,
      inputTokens: usage?.promptTokenCount,
      outputTokens:
        (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0) ||
        undefined,
    };
  }
}
