import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  PaginationQueryDto,
  pageArgs,
  pageResult,
} from '../../../shared/presentation/pagination';

export interface ActivityLogFilter extends PaginationQueryDto {
  type?: string;
  level?: string;
  from?: string;
  to?: string;
}

// Consulta paginada de la auditoría de una organización (solo administradores).
@Injectable()
export class ActivityLogQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organisation: string, filter: ActivityLogFilter) {
    const where = {
      organisation,
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.level ? { level: filter.level } : {}),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from ? { gte: new Date(filter.from) } : {}),
              ...(filter.to ? { lte: new Date(filter.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          type: true,
          level: true,
          note: true,
          dataPreview: true,
          requestId: true,
          createdBy: { select: { id: true, email: true, name: true } },
        },
        ...pageArgs(filter),
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return pageResult(filter, items, total);
  }
}
