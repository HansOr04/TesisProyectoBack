import { Inject, Injectable, Optional, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { User } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AUTH_CONTEXT_KEY, AuthContext } from '../domain/auth-context';

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private cachedUser: User | null | undefined = undefined;

  constructor(
    @Optional() @Inject(REQUEST) private readonly request: Request | null,
    private readonly prisma: PrismaService,
  ) {}

  getAuthContext(): AuthContext | undefined {
    return (this.request as any)?.[AUTH_CONTEXT_KEY];
  }

  getCurrentUserId(): string | undefined {
    return this.getAuthContext()?.userId;
  }

  getCurrentUserEmail(): string | undefined {
    return this.getAuthContext()?.email;
  }

  getCurrentUserIsSuperAdmin(): boolean {
    return this.getAuthContext()?.isSuperAdmin === true;
  }

  getCurrentUserIsPlatformSuperAdmin(): boolean {
    return this.getAuthContext()?.isPlatformSuperAdmin === true;
  }

  getCurrentUserOrganisations(): string[] {
    return this.getAuthContext()?.organisations ?? [];
  }

  getRequestId(): string | undefined {
    const id = (this.request as any)?.requestId;
    return typeof id === 'string' ? id : undefined;
  }

  getRequestIp(): string | undefined {
    return this.request?.ip;
  }

  getUserAgent(): string | undefined {
    const ua = this.request?.headers['user-agent'];
    return typeof ua === 'string' ? ua : undefined;
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.cachedUser !== undefined) return this.cachedUser;
    const userId = this.getCurrentUserId();
    if (!userId) {
      this.cachedUser = null;
      return null;
    }
    this.cachedUser = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    return this.cachedUser;
  }

  async requireCurrentUser(): Promise<User> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required. No valid user in request.');
    }
    return user;
  }
}
