import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';

// Política de retención de la auditoría: los registros más antiguos que
// ACTIVITY_LOG_RETENTION_MONTHS (24 por defecto) se purgan cada noche. Los
// refresh tokens vencidos/revocados se limpian en la misma pasada.
@Injectable()
export class AuditRetentionService {
  private readonly retentionMonths: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    @Optional() private readonly logger?: StructuredLoggerService,
  ) {
    this.retentionMonths = Number(
      config.get('ACTIVITY_LOG_RETENTION_MONTHS') ?? 24,
    );
    this.logger?.setContext({ service: 'AuditRetentionService' });
  }

  get cutoffDate(): Date {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - this.retentionMonths);
    return cutoff;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runScheduled(): Promise<void> {
    try {
      const result = await this.purge();
      this.logger?.info('audit retention run', result);
    } catch (error) {
      this.logger?.error('audit retention failed', error);
    }
  }

  async purge(): Promise<{ activityLogs: number; refreshTokens: number }> {
    const cutoff = this.cutoffDate;
    const [logs, tokens] = await Promise.all([
      this.prisma.activityLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }),
      this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              revokedAt: {
                lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      }),
    ]);
    return { activityLogs: logs.count, refreshTokens: tokens.count };
  }
}
