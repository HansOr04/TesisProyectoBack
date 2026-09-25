import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AccessTokenPayload } from '../domain/auth-context';
import { RefreshTokenService } from './refresh-token.service';
import {
  OAUTH_VERIFIER,
  OAuthVerifierPort,
  PASSWORD_HASHER,
  PasswordHasherPort,
  TOKEN_ISSUER,
  TokenIssuerPort,
} from '../domain/ports';

export interface AuthenticatedSession {
  accessToken: string;
  /** Solo para el controlador: va a la cookie HttpOnly, nunca al cuerpo. */
  refreshToken: string;
  refreshExpiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    isSuperAdmin: boolean;
    organisations: string[];
  };
}

// Casos de uso de autenticación. No sabe de bcrypt, JWT ni Google: habla
// con puertos (DIP) y por eso se puede probar sin red ni criptografía real.
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
    @Inject(OAUTH_VERIFIER) private readonly oauth: OAuthVerifierPort,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async loginWithPassword(
    email: string,
    password: string,
    userAgent?: string,
  ): Promise<AuthenticatedSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: { select: { organisationId: true } } },
    });
    if (!user || !user.isActive || user.deletedAt || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await this.hasher.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.buildSession(user, userAgent);
  }

  async loginWithOAuth(
    idToken: string,
    userAgent?: string,
  ): Promise<AuthenticatedSession> {
    const identity = await this.oauth.verify(idToken);

    // 1) usuario ya vinculado al proveedor; 2) usuario existente por email
    // (se vincula); 3) no existe → se rechaza: las cuentas las crea un admin
    // o el seed, para que no entre cualquiera con una cuenta de Google.
    let user = await this.prisma.user.findFirst({
      where: {
        oauthProvider: identity.provider,
        oauthSubject: identity.subject,
        deletedAt: null,
      },
      include: { memberships: { select: { organisationId: true } } },
    });
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: identity.email },
      });
      if (!byEmail || byEmail.deletedAt || !byEmail.isActive) {
        throw new UnauthorizedException(
          'No existe una cuenta para este correo. Pide a un administrador que la cree.',
        );
      }
      user = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          oauthProvider: identity.provider,
          oauthSubject: identity.subject,
          name: byEmail.name ?? identity.name,
        },
        include: { memberships: { select: { organisationId: true } } },
      });
    }
    return this.buildSession(user, userAgent);
  }

  /** Rota el refresh token y emite un nuevo token de acceso. */
  async refresh(
    rawRefreshToken: string,
    userAgent?: string,
  ): Promise<AuthenticatedSession> {
    const { userId, issued } = await this.refreshTokens.rotate(
      rawRefreshToken,
      userAgent,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { select: { organisationId: true } } },
    });
    if (!user || !user.isActive || user.deletedAt) {
      await this.refreshTokens.revokeAllForUser(userId);
      throw new UnauthorizedException('Cuenta inactiva');
    }
    return this.buildSession(user, userAgent, issued);
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      await this.refreshTokens.revoke(rawRefreshToken);
    }
  }

  oauthProviders(): { provider: string; enabled: boolean }[] {
    return [{ provider: this.oauth.provider, enabled: this.oauth.enabled }];
  }

  private async buildSession(
    user: {
      id: string;
      email: string;
      name: string | null;
      isSuperAdmin: boolean;
      memberships: { organisationId: string }[];
    },
    userAgent?: string,
    refresh?: { token: string; expiresAt: Date },
  ): Promise<AuthenticatedSession> {
    const organisations = user.memberships.map((m) => m.organisationId);
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      orgs: organisations,
    };
    const accessToken = await this.tokens.sign(payload);
    const issued =
      refresh ?? (await this.refreshTokens.issue(user.id, userAgent));
    return {
      accessToken,
      refreshToken: issued.token,
      refreshExpiresAt: issued.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
        organisations,
      },
    };
  }
}
