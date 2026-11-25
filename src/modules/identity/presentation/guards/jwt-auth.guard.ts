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

    let payload: AccessTokenPayload;
    try {
      payload = await this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    // Permisos y membresías de la base, no del token: un usuario desactivado,
    // degradado o sacado de un proyecto pierde el acceso de inmediato.
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

    // Dentro de un proyecto, el superadministrador solo conserva el acceso
    // total si es quien lo creó; en los demás entra como cualquier miembro.
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
