import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

// Lo que manda el cliente acaba en los registros: solo identificadores cortos.
const SAFE_ID = /^[\w.-]{1,64}$/;

// Correlación de logs/auditoría: respeta X-Request-Id si el cliente lo manda.
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers['x-request-id'];
    const requestId =
      typeof header === 'string' && SAFE_ID.test(header)
        ? header
        : randomUUID();
    (req as Request & { requestId: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
