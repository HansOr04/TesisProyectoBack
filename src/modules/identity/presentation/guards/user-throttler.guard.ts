import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_CONTEXT_KEY, AuthContext } from '../../domain/auth-context';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const auth = req[AUTH_CONTEXT_KEY] as AuthContext | undefined;
    return auth ? `user:${auth.userId}` : req.ip;
  }
}
