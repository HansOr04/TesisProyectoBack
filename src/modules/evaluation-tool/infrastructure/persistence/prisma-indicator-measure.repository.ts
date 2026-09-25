import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import {
  CreateIndicatorMeasureInput,
  IndicatorMeasureRepository,
  UpdateIndicatorMeasureInput,
} from '../../domain/ports/indicator-measure.repository';
import { MeasureCounts } from '../../domain/evaluation-tool.types';

@Injectable()
export class PrismaIndicatorMeasureRepository implements IndicatorMeasureRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByEvaluation(organisation: string, evaluationId: string) {
    return this.prisma.assessmentIndicatorMeasure.findMany({
      where: { evaluationId, organisation, deletedAt: null },
      include: { indicator: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async indicatorIdsWithMeasure(organisation: string, evaluationId: string) {
    const rows = await this.prisma.assessmentIndicatorMeasure.findMany({
      where: { evaluationId, organisation, deletedAt: null },
      select: { indicatorId: true },
    });
    return new Set(rows.map((m) => m.indicatorId));
  }

  async countByEvaluations(organisation: string, evaluationIds: string[]) {
    const result = new Map<string, MeasureCounts>();
    if (evaluationIds.length === 0) return result;
    const groups = await this.prisma.assessmentIndicatorMeasure.groupBy({
      by: ['evaluationId', 'status'],
      where: {
        evaluationId: { in: evaluationIds },
        organisation,
        deletedAt: null,
      },
      _count: { _all: true },
    });
    for (const group of groups) {
      const stats = result.get(group.evaluationId) ?? { total: 0, done: 0 };
      stats.total += group._count._all;
      if (group.status === 'DONE') stats.done += group._count._all;
      result.set(group.evaluationId, stats);
    }
    return result;
  }

  create(input: CreateIndicatorMeasureInput) {
    return this.prisma.assessmentIndicatorMeasure.create({
      data: input,
      include: { indicator: true },
    });
  }

  findById(organisation: string, measureId: string) {
    return this.prisma.assessmentIndicatorMeasure.findFirst({
      where: { id: measureId, organisation, deletedAt: null },
      include: { indicator: true },
    });
  }

  update(measureId: string, input: UpdateIndicatorMeasureInput) {
    return this.prisma.assessmentIndicatorMeasure.update({
      where: { id: measureId },
      data: input,
      include: { indicator: true },
    });
  }
}
