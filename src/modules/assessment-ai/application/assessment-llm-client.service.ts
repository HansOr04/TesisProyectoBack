import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import { LlmCircuitBreaker } from '../domain/llm-circuit-breaker';
import {
  AiCompletionResult,
  AiProvider,
} from '../domain/ports/ai-provider.port';
import { createAiProviderFromEnv } from '../infrastructure/ai-provider.factory';

export type { AiCompletionResult } from '../domain/ports/ai-provider.port';

// Módulo de IA compartido: un solo punto de selección de proveedor
// (Gemini/NVIDIA vía AI_PROVIDER), llamada HTTP y circuit breaker,
// usado por Organizativa/Capacidades/Riesgos en vez de triplicar esta lógica — cada
// herramienta solo aporta sus propios prompts de dominio. Un solo circuit
// breaker también significa que si el proveedor cae, las 3 herramientas lo
// ven caído de inmediato.
@Injectable()
export class AssessmentLlmClientService {
  private readonly provider: AiProvider;
  private readonly providerName: string;
  private readonly circuitBreaker = new LlmCircuitBreaker();

  constructor(
    private readonly httpService: HttpService,
    @Optional() private readonly logger?: StructuredLoggerService,
  ) {
    this.logger?.setContext({ service: 'AssessmentLlmClientService' });
    const { provider, missingApiKey, apiKeyEnvVar } =
      createAiProviderFromEnv(httpService);
    this.provider = provider;
    this.providerName = provider.name;
    if (missingApiKey) {
      this.logger?.warn(
        `${apiKeyEnvVar} is not set — Assessment AI features will fail until configured`,
      );
    }
    this.logger?.info(`Assessment AI provider active: ${this.providerName}`);
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
  ): Promise<AiCompletionResult> {
    if (this.circuitBreaker.isOpen(this.providerName)) {
      throw new ServiceUnavailableException(
        `AI provider (${this.providerName}) temporarily disabled after repeated failures. Try again in a few minutes.`,
      );
    }
    try {
      const result = await this.provider.complete(
        systemPrompt,
        userPrompt,
        maxOutputTokens,
        temperature,
      );
      this.circuitBreaker.recordSuccess(this.providerName);
      return result;
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 429 || (typeof status === 'number' && status >= 500)) {
        this.circuitBreaker.recordFailure(this.providerName);
      }
      const responseData =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: unknown } }).response?.data
          : undefined;
      this.logger?.error(
        `Assessment AI provider call failed (${this.providerName})`,
        error instanceof Error ? error : undefined,
        { responseData },
      );
      throw new ServiceUnavailableException(
        `AI provider (${this.providerName}) request failed. Check AI_PROVIDER credentials.`,
      );
    }
  }
}
