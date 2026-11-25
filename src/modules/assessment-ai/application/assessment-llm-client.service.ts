import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import { LlmCircuitBreaker } from '../domain/llm-circuit-breaker';
import {
  AiCompletionOptions,
  AiCompletionResult,
  AiProvider,
} from '../domain/ports/ai-provider.port';
import { createAiProviderFromEnv } from '../infrastructure/ai-provider.factory';

export type { AiCompletionResult } from '../domain/ports/ai-provider.port';

// Heroku corta toda petición HTTP a los 30 s (H12). La llamada al proveedor
// debe rendirse antes para que el endpoint responda con un error claro (o
// con su fallback) en vez de quedar colgado hasta que el router lo mate.
export const DEFAULT_AI_TIMEOUT_MS = 25_000;

/** Las respuestas guardadas se reutilizan hasta 90 días. */
export const AI_CACHE_TTL_DAYS = 90;

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
  private readonly missingApiKeyVar?: string;
  private readonly circuitBreaker = new LlmCircuitBreaker();

  constructor(
    private readonly httpService: HttpService,
    @Optional() private readonly logger?: StructuredLoggerService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    this.logger?.setContext({ service: 'AssessmentLlmClientService' });
    const { provider, missingApiKey, requiredVariable } =
      createAiProviderFromEnv(httpService);
    this.provider = provider;
    this.providerName = provider.name;
    if (missingApiKey) {
      this.missingApiKeyVar = requiredVariable;
      this.logger?.warn(
        `${requiredVariable} is not set — Assessment AI features will fail until configured`,
      );
    }
    this.logger?.info(`Assessment AI provider active: ${this.providerName}`);
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
    timeoutMs: number = DEFAULT_AI_TIMEOUT_MS,
    options?: AiCompletionOptions,
  ): Promise<AiCompletionResult> {
    // Sin credencial no tiene sentido salir a la red: se responde 503 de inmediato.
    if (this.missingApiKeyVar) {
      throw new ServiceUnavailableException(
        `AI provider (${this.providerName}) is not configured: ${this.missingApiKeyVar} is not set.`,
      );
    }
    const cacheKey = options?.cache
      ? this.cacheKey(systemPrompt, userPrompt, maxOutputTokens, options)
      : undefined;
    if (cacheKey) {
      const cached = await this.readCache(cacheKey);
      if (cached && (options?.isUsable?.(cached.text) ?? true)) return cached;
    }
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
        timeoutMs,
        options,
      );
      this.circuitBreaker.recordSuccess(this.providerName);
      if (
        cacheKey &&
        result.text.trim() &&
        (options?.isUsable?.(result.text) ?? true)
      ) {
        await this.writeCache(cacheKey, result, options);
      }
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

  // ── Caché de respuestas ──────────────────────────────────────────────────

  private cacheKey(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    options?: AiCompletionOptions,
  ): string {
    return createHash('sha256')
      .update(
        JSON.stringify([
          this.providerName,
          this.provider.modelFor?.(options) ?? '',
          systemPrompt,
          userPrompt,
          maxOutputTokens,
        ]),
      )
      .digest('hex');
  }

  private async readCache(key: string): Promise<AiCompletionResult | null> {
    if (!this.prisma) return null;
    try {
      const since = new Date(Date.now() - AI_CACHE_TTL_DAYS * 86_400_000);
      const row = await this.prisma.assessmentAiCache.findFirst({
        where: { key, createdAt: { gte: since } },
      });
      if (!row) return null;
      this.logger?.info('Assessment AI cache hit', {
        provider: row.provider,
        model: row.model,
        tokensSaved: row.tokensUsed,
      });
      return { text: row.text, tokensUsed: 0, cached: true };
    } catch {
      // Sin caché (tabla no migrada, base caída): se llama al proveedor.
      return null;
    }
  }

  private async writeCache(
    key: string,
    result: AiCompletionResult,
    options?: AiCompletionOptions,
  ): Promise<void> {
    if (!this.prisma) return;
    try {
      const data = {
        provider: this.providerName,
        model: this.provider.modelFor?.(options) ?? null,
        text: result.text,
        tokensUsed: result.tokensUsed ?? null,
        createdAt: new Date(),
      };
      await this.prisma.assessmentAiCache.upsert({
        where: { key },
        create: { key, ...data },
        update: data,
      });
      // Limpieza barata de lo vencido, para que la tabla no crezca sin fin.
      await this.prisma.assessmentAiCache.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - AI_CACHE_TTL_DAYS * 86_400_000),
          },
        },
      });
    } catch (error) {
      this.logger?.warn('Assessment AI cache write failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
