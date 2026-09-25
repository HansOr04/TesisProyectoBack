import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

export interface IssuedRefreshToken {
  /** Valor opaco que viaja en la cookie HttpOnly (nunca se persiste en claro). */
  token: string;
  expiresAt: Date;
}

// Refresh tokens rotatorios: cada uso emite uno nuevo y revoca el anterior.
// Si alguien presenta un token ya rotado (robo de cookie), se revoca toda la
// familia y la sesión legítima también cae — el usuario vuelve a iniciar
// sesión, el atacante pierde el acceso.
@Injectable()
export class RefreshTokenService {
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const days = Number(config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7);
    this.ttlMs = days * 24 * 60 * 60 * 1000;
  }

  get ttlMilliseconds() {
    return this.ttlMs;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issue(
    userId: string,
    userAgent?: string,
    familyId: string = randomUUID(),
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        familyId,
        expiresAt,
        userAgent: userAgent?.slice(0, 255),
      },
    });
    return { token, expiresAt };
  }

  /** Valida y rota: devuelve el usuario y el nuevo token. */
  async rotate(
    rawToken: string,
    userAgent?: string,
  ): Promise<{ userId: string; issued: IssuedRefreshToken }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (!stored) {
      throw new UnauthorizedException('Sesión inválida');
    }
    if (stored.revokedAt) {
      // Reuso de un token ya rotado: se revoca toda la familia.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sesión inválida');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sesión expirada');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const issued = await this.issue(stored.userId, userAgent, stored.familyId);
    return { userId: stored.userId, issued };
  }

  async revoke(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Cierra todas las sesiones de un usuario (desactivación, baja). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Limpieza de tokens vencidos/revocados con más de 30 días. */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }],
      },
    });
    return result.count;
  }
}
