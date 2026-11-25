import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AUTH_CONTEXT_KEY } from '../../../modules/identity/domain/auth-context';
import { StructuredLoggerService } from '../logging/structured-logger.service';

/**
 * Una línea por petición: ruta, estado, duración y usuario. Sin parámetros de
 * consulta, cuerpo ni cabeceras, que pueden llevar datos de las organizaciones.
 */
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  constructor(private readonly logger: StructuredLoggerService) {
    this.logger.setContext({ service: 'Http' });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.originalUrl.split('?')[0];
    if (path === '/health') return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const request = req as Request & {
        requestId?: string;
        [AUTH_CONTEXT_KEY]?: { userId?: string };
      };
      this.logger.info('request', {
        method: req.method,
        path,
        status: res.statusCode,
        ms: Math.round(Number(process.hrtime.bigint() - start) / 1e6),
        userId: request[AUTH_CONTEXT_KEY]?.userId,
        requestId: request.requestId,
      });
    });
    next();
  }
}
