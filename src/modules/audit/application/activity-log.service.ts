import { Injectable, Optional } from '@nestjs/common';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  ACTIVITY_LOG_LEVELS,
  ACTIVITY_LOG_SOURCE_TYPES,
  ActivityLogInput,
  SYSTEM_USER_ID,
} from '../domain/activity-log.types';

const PREVIEW_MAX_KEYS = 6;

// Registro de auditoría en BD. Nunca lanza hacia el caso de uso que lo llama:
// una falla al auditar no debe deshacer la operación de negocio ya hecha.
@Injectable()
export class ActivityLogService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly logger?: StructuredLoggerService,
  ) {
    this.logger?.setContext({ service: 'ActivityLogService' });
  }

  async createActivityLog(data: ActivityLogInput): Promise<void> {
    try {
      const createdById = await this.resolveAuthor(data.createdById);
      const entityData = data.entityData ?? {};
      await this.prisma.activityLog.create({
        data: {
          type: data.type,
          organisation: data.organisation,
          createdById,
          sourceType: data.sourceType ?? ACTIVITY_LOG_SOURCE_TYPES.UI,
          level: data.level ?? ACTIVITY_LOG_LEVELS.INFO,
          note: data.note ?? data.type,
          data: entityData as Prisma.InputJsonValue,
          dataPreview: (data.dataPreview ??
            this.preview(entityData)) as Prisma.InputJsonValue,
          requestId: data.requestId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      this.logger?.error(`failed to write activity log "${data.type}"`, error);
    }
  }

  private async resolveAuthor(createdById?: string): Promise<string> {
    if (createdById) {
      const exists = await this.prisma.user.findUnique({
        where: { id: createdById },
        select: { id: true },
      });
      if (exists) return createdById;
    }
    return SYSTEM_USER_ID;
  }

  private preview(data: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([, v]) => typeof v !== 'object' || v === null)
        .slice(0, PREVIEW_MAX_KEYS),
    );
  }
}
