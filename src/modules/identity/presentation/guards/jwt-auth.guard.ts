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
import { AUTH_CONTEXT_KEY, AuthContext } from '../../domain/auth-context';
import { TOKEN_ISSUER, TokenIssuerPort } from '../../domain/ports';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
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

/**
 * Guard global (APP_GUARD). Toda ruta HTTP debe declarar exactamente qué
 * exige: @Public(), @RequireAuthenticated() o @RequireGlobalSuperAdmin() —
 * las rutas sin declaración se rechazan, para que olvidar un decorador nunca
 * deje un endpoint abierto por accidente.
 */
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

    let auth: AuthContext;
    try {
      const payload = await this.tokens.verify(token);
      auth = {
        userId: payload.sub,
        email: payload.email,
        isSuperAdmin: payload.isSuperAdmin === true,
        organisations: payload.orgs ?? [],
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    // Un usuario desactivado o borrado pierde el acceso de inmediato aunque
    // su token no haya caducado.
    const account = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      select: { isActive: true, deletedAt: true },
    });
    if (!account || !account.isActive || account.deletedAt) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (requireSuperAdmin && !auth.isSuperAdmin) {
      throw new ForbiddenException('Superadmin access required');
    }

    const org = request.params?.org || request.params?.organisation;
    if (org && !auth.isSuperAdmin && !auth.organisations.includes(org)) {
      throw new ForbiddenException('Not a member of this organisation');
    }

    (request as any)[AUTH_CONTEXT_KEY] = auth;
    return true;
  }

  // @Public en el handler gana; un handler restringido nunca se vuelve público
  // por un @Public a nivel de clase.
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
