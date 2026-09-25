import { Inject, Injectable, Optional, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { User } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AUTH_CONTEXT_KEY, AuthContext } from '../domain/auth-context';

// Acceso a la petición actual (usuario autenticado, ip, request-id) sin
// pasar todo por parámetros de controlador. Request-scoped en HTTP; en
// tests/scripts se inyecta sin REQUEST y devuelve valores vacíos.
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

  getCurrentUserOrganisations(): string[] {
    return this.getAuthContext()?.organisations ?? [];
  }

  getRequestId(): string | undefined {
    const id = (this.request as any)?.requestId;
    return typeof id === 'string' ? id : undefined;
  }

  getRequestIp(): string | undefined {
    if (!this.request) return undefined;
    const forwarded = this.request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim();
    }
    return this.request.ip;
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
