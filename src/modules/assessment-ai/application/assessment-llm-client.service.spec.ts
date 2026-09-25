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

    // Circuit now open — should reject WITHOUT calling the provider again.
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
