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
    /** Modelo sin razonamiento previo, para respuestas dentro de un export. */
    private readonly fastModel: string = model,
  ) {}

  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
    timeoutMs: number,
    options?: AiCompletionOptions,
  ): Promise<AiCompletionResult> {
    const model = options?.fast ? this.fastModel : this.model;
    const response = await firstValueFrom(
      this.httpService.post<{
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: { totalTokenCount?: number };
      }>(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens, temperature },
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
    return {
      text: response.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      tokensUsed: response.data.usageMetadata?.totalTokenCount,
    };
  }
}
