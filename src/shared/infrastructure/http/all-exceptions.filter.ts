import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StructuredLoggerService } from '../logging/structured-logger.service';

// Respuesta de error uniforme: statusCode, message, requestId y timestamp.
// Los errores no controlados (500) se registran con stack y, en producción,
// no exponen detalles internos al cliente.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLoggerService) {
    this.logger.setContext({ service: 'HttpExceptions' });
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : null;
    const message =
      typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] } | null)?.message ??
          (status >= 500
            ? 'Error interno del servidor'
            : (exception as Error)?.message));

    if (status >= 500) {
      this.logger.error('Unhandled exception', exception, {
        requestId: request.requestId,
        method: request.method,
        url: request.originalUrl,
      });
    }

    response.status(status).json({
      statusCode: status,
      message:
        status >= 500 && process.env.NODE_ENV === 'production'
          ? 'Error interno del servidor'
          : message,
      ...(typeof body === 'object' && body !== null
        ? Object.fromEntries(
            Object.entries(body).filter(
              ([k]) => !['statusCode', 'message'].includes(k),
            ),
          )
        : {}),
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
