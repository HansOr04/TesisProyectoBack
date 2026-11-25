import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  AccessTokenPayload,
  AUTH_CONTEXT_KEY,
  AuthContext,
} from '../../domain/auth-context';
import { TOKEN_ISSUER, TokenIssuerPort } from '../../domain/ports';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import {
  loadCurrentAccount,
  resolveOrganisationAccess,
} from '../../application/organisation-access';
import {
  IS_PUBLIC_KEY,
  REQUIRE_AUTHENTICATED_KEY,
  REQUIRE_SUPERADMIN_KEY,
} from '../decorators/auth.decorators';

export function getBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim() || undefined;
  }
  return undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.isEffectivelyPublic(context);
    const requireAuthenticated =
      this.reflector.getAllAndOverride<boolean>(
        REQUIRE_AUTHENTICATED_KEY,
        targets,
      ) === true;
    const requireSuperAdmin =
      this.reflector.getAllAndOverride<boolean>(
        REQUIRE_SUPERADMIN_KEY,
        targets,
      ) === true;

    if (!isPublic && !requireAuthenticated && !requireSuperAdmin) {
      throw new ForbiddenException('Route is missing auth declaration');
    }
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = getBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const account = await loadCurrentAccount(this.prisma, payload.sub);
    if (!account) {
      throw new UnauthorizedException('Account is inactive');
    }
    const auth: AuthContext = {
      userId: payload.sub,
      email: payload.email,
      isSuperAdmin: account.isSuperAdmin,
      isPlatformSuperAdmin: account.isSuperAdmin,
      organisations: account.organisations,
    };

    const org = request.params?.org || request.params?.organisation;
    if (org) {
      const access = await resolveOrganisationAccess(this.prisma, auth, org);
      if (!access.allowed) {
        throw new ForbiddenException('Not a member of this organisation');
      }
      auth.isSuperAdmin = access.isSuperAdmin;
      if (!auth.organisations.includes(org)) {
        auth.organisations = [...auth.organisations, org];
      }
    }

    if (requireSuperAdmin && !auth.isSuperAdmin) {
      throw new ForbiddenException('Superadmin access required');
    }

    (request as any)[AUTH_CONTEXT_KEY] = auth;
    return true;
  }

  private isEffectivelyPublic(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const cls = context.getClass();
    const publicOnHandler =
      Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true;
    const restrictedOnHandler =
      Reflect.getMetadata(REQUIRE_AUTHENTICATED_KEY, handler) === true ||
      Reflect.getMetadata(REQUIRE_SUPERADMIN_KEY, handler) === true;
    if (publicOnHandler) return !restrictedOnHandler;
    if (restrictedOnHandler) return false;
    return Reflect.getMetadata(IS_PUBLIC_KEY, cls) === true;
  }
}
