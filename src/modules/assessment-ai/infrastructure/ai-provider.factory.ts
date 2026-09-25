import { HttpService } from '@nestjs/axios';
import { AiProvider } from '../domain/ports/ai-provider.port';
import { GeminiProvider } from './providers/gemini.provider';
import { NvidiaProvider } from './providers/nvidia.provider';

export interface AiProviderFactoryResult {
  provider: AiProvider;
  missingApiKey: boolean;
  /** Nombre de la variable de entorno con la API key del proveedor elegido. */
  apiKeyEnvVar: string;
}

// Factory Method: la selección del proveedor vive en un solo lugar y el
// cliente LLM no conoce las clases concretas.
export function createAiProviderFromEnv(
  httpService: HttpService,
  env: NodeJS.ProcessEnv = process.env,
): AiProviderFactoryResult {
  const providerName = (env.AI_PROVIDER || 'gemini').toLowerCase();

  if (providerName === 'nvidia') {
    const apiKey = env.NVIDIA_API_KEY ?? '';
    const model = env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';
    return {
      provider: new NvidiaProvider(httpService, apiKey, model),
      missingApiKey: !apiKey,
      apiKeyEnvVar: 'NVIDIA_API_KEY',
    };
  }

  const apiKey = env.GEMINI_API_KEY ?? '';
  const model = env.GEMINI_MODEL || 'gemini-flash-latest';
  return {
    provider: new GeminiProvider(httpService, apiKey, model),
    missingApiKey: !apiKey,
    apiKeyEnvVar: 'GEMINI_API_KEY',
  };
}
