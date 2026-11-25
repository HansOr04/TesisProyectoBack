import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export const ROTATION_GRACE_MS = 30 * 1000;

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
    client: Pick<PrismaService, 'refreshToken'> = this.prisma,
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await client.refreshToken.create({
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
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sesión expirada');
    }

    const issued = stored.revokedAt
      ? null
      : await this.prisma.$transaction(async (tx) => {
          const rotated = await tx.refreshToken.updateMany({
            where: { id: stored.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          return rotated.count === 1
            ? this.issue(stored.userId, userAgent, stored.familyId, tx)
            : null;
        });
    if (issued) return { userId: stored.userId, issued };

    if (!(await this.isConcurrentRotation(stored.familyId, stored.revokedAt))) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Sesión inválida');
    }
    return {
      userId: stored.userId,
      issued: await this.issue(stored.userId, userAgent, stored.familyId),
    };
  }

  private async isConcurrentRotation(
    familyId: string,
    revokedAt: Date | null,
  ): Promise<boolean> {
    if (revokedAt && Date.now() - revokedAt.getTime() > ROTATION_GRACE_MS) {
      return false;
    }
    const active = await this.prisma.refreshToken.count({
      where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    return active > 0;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revoke(rawToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      select: { familyId: true },
    });
    if (stored) await this.revokeFamily(stored.familyId);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

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
