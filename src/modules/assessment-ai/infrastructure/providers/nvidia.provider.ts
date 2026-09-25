import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AiCompletionResult,
  AiProvider,
} from '../../domain/ports/ai-provider.port';

export class NvidiaProvider implements AiProvider {
  readonly name = 'nvidia';
  private readonly apiUrl =
    'https://integrate.api.nvidia.com/v1/chat/completions';

  constructor(
    private readonly httpService: HttpService,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
  ): Promise<AiCompletionResult> {
    const response = await firstValueFrom(
      this.httpService.post<{
        choices: Array<{ message: { content: string } }>;
        usage?: { total_tokens: number };
      }>(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxOutputTokens,
          temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    return {
      text: response.data.choices?.[0]?.message?.content ?? '',
      tokensUsed: response.data.usage?.total_tokens,
    };
  }
}
