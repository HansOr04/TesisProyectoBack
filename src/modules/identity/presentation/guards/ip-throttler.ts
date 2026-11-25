import { ExecutionContext } from '@nestjs/common';
import { ThrottlerOptions } from '@nestjs/throttler';

export const IP_THROTTLER = 'ip';
export const AUTH_LIMIT_PER_IP = 300;

export const ipThrottler: ThrottlerOptions = {
  name: IP_THROTTLER,
  ttl: 60000,
  limit: AUTH_LIMIT_PER_IP,
  getTracker: (req) => `ip:${req.ip}`,
  skipIf: (context: ExecutionContext) =>
    !String(context.switchToHttp().getRequest().path ?? '').startsWith('/auth'),
};
