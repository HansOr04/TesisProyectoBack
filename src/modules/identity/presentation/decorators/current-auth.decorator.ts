import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AUTH_CONTEXT_KEY, AuthContext } from '../../domain/auth-context';

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request[AUTH_CONTEXT_KEY];
  },
);
