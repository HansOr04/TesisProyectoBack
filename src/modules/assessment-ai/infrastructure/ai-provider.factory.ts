import { HttpService } from '@nestjs/axios';
import { AiProvider } from '../domain/ports/ai-provider.port';
import { GeminiProvider } from './providers/gemini.provider';
import { NvidiaProvider } from './providers/nvidia.provider';

export interface AiProviderFactoryResult {
  provider: AiProvider;
  missingApiKey: boolean;
  requiredVariable: string;
}

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
      requiredVariable: 'NVIDIA_API_KEY',
    };
  }

  const apiKey = env.GEMINI_API_KEY ?? '';
  const model = env.GEMINI_MODEL || 'gemini-flash-latest';
  const fastModel = env.GEMINI_FAST_MODEL || 'gemini-flash-lite-latest';
  return {
    provider: new GeminiProvider(httpService, apiKey, model, fastModel),
    missingApiKey: !apiKey,
    requiredVariable: 'GEMINI_API_KEY',
  };
}
