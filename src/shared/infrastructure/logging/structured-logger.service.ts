import { Injectable, Scope } from '@nestjs/common';

export type LogContext = Record<string, unknown>;

// Logger estructurado (una línea JSON por evento en producción, texto legible
// en desarrollo). Instancia transitoria: cada servicio fija su propio contexto
// con setContext() sin pisar el de los demás.
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService {
  private context: LogContext = {};
  private readonly json = process.env.NODE_ENV === 'production';

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'production') return;
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorInfo =
      error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : error !== undefined
          ? { error }
          : {};
    this.write('error', message, { ...context, ...errorInfo });
  }

  private write(level: string, message: string, context?: LogContext): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...context,
    };
    const line = this.json
      ? JSON.stringify(entry)
      : `[${entry.timestamp}] ${level.toUpperCase()} ${message} ${
          Object.keys({ ...this.context, ...context }).length
            ? JSON.stringify({ ...this.context, ...context })
            : ''
        }`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }
}
