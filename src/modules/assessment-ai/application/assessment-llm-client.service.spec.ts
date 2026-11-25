import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import { AssessmentLlmClientService } from './assessment-llm-client.service';

type AnyRecord = Record<string, any>;

function createLoggerMock() {
  return {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as AnyRecord;
}

describe('AssessmentLlmClientService provider selection', () => {
  it('defaults to gemini and warns when GEMINI_API_KEY is missing', () => {
    delete process.env.AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    const logger = createLoggerMock();

    new AssessmentLlmClientService(
      {} as unknown as HttpService,
      logger as unknown as StructuredLoggerService,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('GEMINI_API_KEY'),
    );
  });

  it('selects nvidia and warns when NVIDIA_API_KEY is missing', () => {
    process.env.AI_PROVIDER = 'nvidia';
    delete process.env.NVIDIA_API_KEY;
    const logger = createLoggerMock();

    new AssessmentLlmClientService(
      {} as unknown as HttpService,
      logger as unknown as StructuredLoggerService,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('NVIDIA_API_KEY'),
    );
  });

  it('answers 503 without calling the provider when its key is missing', async () => {
    process.env.AI_PROVIDER = 'gemini';
    delete process.env.GEMINI_API_KEY;
    const httpService = { post: jest.fn() };
    const client = new AssessmentLlmClientService(
      httpService as unknown as HttpService,
      createLoggerMock() as unknown as StructuredLoggerService,
    );

    await expect(client.complete('system', 'user', 100, 0.2)).rejects.toThrow(
      'GEMINI_API_KEY is not set',
    );
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('does not warn when the active provider has its key configured', () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    const logger = createLoggerMock();

    new AssessmentLlmClientService(
      {} as unknown as HttpService,
      logger as unknown as StructuredLoggerService,
    );

    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('AssessmentLlmClientService circuit breaker', () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createHttpServiceMock(behavior: 'ok' | '429' | '500') {
    return {
      post: jest.fn(() => {
        if (behavior === 'ok') {
          return of({
            data: {
              candidates: [{ content: { parts: [{ text: 'ok' }] } }],
            },
          } as AnyRecord);
        }
        const status = behavior === '429' ? 429 : 500;
        return throwError(() => ({ response: { status, data: {} } }));
      }),
    } as unknown as HttpService;
  }

  it('opens the circuit after 5 consecutive failures and rejects immediately', async () => {
    const httpService = createHttpServiceMock('429');
    const client = new AssessmentLlmClientService(httpService);

    for (let i = 0; i < 5; i++) {
      await expect(client.complete('sys', 'user', 100, 0.1)).rejects.toThrow();
    }

    const callCountBeforeOpenCheck = (httpService.post as jest.Mock).mock.calls
      .length;
    await expect(client.complete('sys', 'user', 100, 0.1)).rejects.toThrow(
      /temporarily disabled/,
    );
    expect((httpService.post as jest.Mock).mock.calls.length).toBe(
      callCountBeforeOpenCheck,
    );
  });

  it('does not open the circuit on success after failures (resets counter)', async () => {
    const httpService = createHttpServiceMock('ok');
    const client = new AssessmentLlmClientService(httpService);

    const result = await client.complete('sys', 'user', 100, 0.1);

    expect(result.text).toBe('ok');
  });
});

describe('AssessmentLlmClientService response cache', () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
  });

  function setup() {
    const httpService = {
      post: jest.fn(() =>
        of({
          data: {
            candidates: [{ content: { parts: [{ text: 'nuevo' }] } }],
            usageMetadata: { totalTokenCount: 1200 },
          },
        } as AnyRecord),
      ),
    };
    const rows = new Map<string, AnyRecord>();
    const prisma = {
      assessmentAiCache: {
        findFirst: jest.fn(
          async ({ where }: AnyRecord) => rows.get(where.key) ?? null,
        ),
        upsert: jest.fn(async ({ where, create }: AnyRecord) => {
          rows.set(where.key, create);
          return create;
        }),
        deleteMany: jest.fn(async () => ({ count: 0 })),
      },
    };
    const client = new AssessmentLlmClientService(
      httpService as unknown as HttpService,
      createLoggerMock() as unknown as StructuredLoggerService,
      prisma as AnyRecord as never,
    );
    return { client, httpService, prisma };
  }

  it('reuses the stored answer for the same prompt without calling the provider', async () => {
    const { client, httpService } = setup();
    const first = await client.complete('sys', 'user', 100, 0.1, 1000, {
      cache: true,
    });
    const second = await client.complete('sys', 'user', 100, 0.1, 1000, {
      cache: true,
    });

    expect(first).toMatchObject({ text: 'nuevo', tokensUsed: 1200 });
    expect(second).toMatchObject({
      text: 'nuevo',
      tokensUsed: 0,
      cached: true,
    });
    expect(httpService.post).toHaveBeenCalledTimes(1);
  });

  it('calls the provider again when the prompt changes', async () => {
    const { client, httpService } = setup();
    await client.complete('sys', 'nota 7', 100, 0.1, 1000, { cache: true });
    await client.complete('sys', 'nota 8', 100, 0.1, 1000, { cache: true });

    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  it('does not read or write the cache unless asked', async () => {
    const { client, httpService, prisma } = setup();
    await client.complete('sys', 'user', 100, 0.1);
    await client.complete('sys', 'user', 100, 0.1);

    expect(httpService.post).toHaveBeenCalledTimes(2);
    expect(prisma.assessmentAiCache.findFirst).not.toHaveBeenCalled();
    expect(prisma.assessmentAiCache.upsert).not.toHaveBeenCalled();
  });

  it('does not store a response that the caller cannot read', async () => {
    const { client, httpService, prisma } = setup();
    const isUsable = (text: string) => text.startsWith('{');
    await client.complete('sys', 'user', 100, 0.1, 1000, {
      cache: true,
      isUsable,
    });
    await client.complete('sys', 'user', 100, 0.1, 1000, {
      cache: true,
      isUsable,
    });

    expect(prisma.assessmentAiCache.upsert).not.toHaveBeenCalled();
    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  it('joins every text part of a Gemini answer, skipping thoughts', async () => {
    const httpService = {
      post: jest.fn(() =>
        of({
          data: {
            candidates: [
              {
                content: {
                  parts: [
                    { text: 'pensando…', thought: true },
                    { text: '{"a": ' },
                    { text: '1}' },
                  ],
                },
              },
            ],
            usageMetadata: {
              totalTokenCount: 30,
              promptTokenCount: 10,
              candidatesTokenCount: 20,
            },
          },
        } as AnyRecord),
      ),
    };
    const client = new AssessmentLlmClientService(
      httpService as unknown as HttpService,
    );
    const result = await client.complete('sys', 'user', 100, 0.1);

    expect(result).toMatchObject({
      text: '{"a": 1}',
      inputTokens: 10,
      outputTokens: 20,
    });
  });
});
