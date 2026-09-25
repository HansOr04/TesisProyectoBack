import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { MeasureCounts } from '../../../evaluation-tool/domain/evaluation-tool.types';
import {
  CreateMitigationMeasureInput,
  RiskRepository,
  RiskResponseInput,
  UpdateMitigationMeasureInput,
} from '../../domain/ports/risk.repository';

const riskEvaluationScope = (organisation: string) => ({
  organisation,
  deletedAt: null,
  template: { tool: 'RISK' as const },
});

@Injectable()
export class PrismaRiskRepository implements RiskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCountryThreshold(organisation: string, country: string) {
    const row = await this.prisma.assessmentRiskCountryParam.findUnique({
      where: { organisation_country: { organisation, country } },
    });
    return row ? Number(row.riskThreshold) : null;
  }

  async listCountryParams(organisation: string) {
    const rows = await this.prisma.assessmentRiskCountryParam.findMany({
      where: { organisation },
      orderBy: { country: 'asc' },
    });
    return rows.map((r) => ({
      country: r.country,
      riskThreshold: Number(r.riskThreshold),
      updatedAt: r.updatedAt,
    }));
  }

  async upsertCountryParam(
    organisation: string,
    country: string,
    riskThreshold: number,
    updatedBy?: string,
  ) {
    const row = await this.prisma.assessmentRiskCountryParam.upsert({
      where: { organisation_country: { organisation, country } },
      update: { riskThreshold, updatedBy },
      create: { organisation, country, riskThreshold, updatedBy },
    });
    return {
      country: row.country,
      riskThreshold: Number(row.riskThreshold),
      updatedAt: row.updatedAt,
    };
  }

  async deleteCountryParam(organisation: string, country: string) {
    await this.prisma.assessmentRiskCountryParam.deleteMany({
      where: { organisation, country },
    });
  }

  async upsertResponsesWithRisks(
    evaluationId: string,
    responses: RiskResponseInput[],
    scoredBy: string,
    criticalThreshold: number,
  ) {
    await this.prisma.$transaction([
      ...responses.map((response) =>
        this.prisma.assessmentResponse.upsert({
          where: {
            evaluationId_indicatorId: {
              evaluationId,
              indicatorId: response.indicatorId,
            },
          },
          update: {
            score: response.score,
            observation: response.observation,
            isCritical: response.score <= criticalThreshold,
            scoredBy,
            scoredAt: new Date(),
          },
          create: {
            evaluationId,
            indicatorId: response.indicatorId,
            score: response.score,
            observation: response.observation,
            isCritical: response.score <= criticalThreshold,
            scoredBy,
          },
        }),
      ),
      ...responses.map((response) =>
        this.prisma.assessmentRisk.upsert({
          where: {
            evaluationId_indicatorId: {
              evaluationId,
              indicatorId: response.indicatorId,
            },
          },
          update: {
            description: response.riskDescription,
            riskType: response.riskType,
            class: response.class,
            identifiedBy: scoredBy,
          },
          create: {
            evaluationId,
            indicatorId: response.indicatorId,
            description: response.riskDescription,
            riskType: response.riskType,
            class: response.class,
            identifiedBy: scoredBy,
          },
        }),
      ),
    ]);
  }

  listByEvaluation(evaluationId: string) {
    return this.prisma.assessmentRisk.findMany({
      where: { evaluationId },
      include: { measures: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countUnmitigatedByEvaluations(evaluationIds: string[]) {
    const result = new Map<string, number>(evaluationIds.map((id) => [id, 0]));
    if (evaluationIds.length === 0) return result;
    const risks = await this.prisma.assessmentRisk.findMany({
      where: { evaluationId: { in: evaluationIds }, class: 'NON_NEGLIGIBLE' },
      select: {
        evaluationId: true,
        measures: { where: { deletedAt: null }, select: { id: true } },
      },
    });
    for (const risk of risks) {
      if (risk.measures.length === 0) {
        result.set(risk.evaluationId, (result.get(risk.evaluationId) ?? 0) + 1);
      }
    }
    return result;
  }

  findById(organisation: string, riskId: string) {
    return this.prisma.assessmentRisk.findFirst({
      where: { id: riskId, evaluation: riskEvaluationScope(organisation) },
    });
  }

  createMeasure(input: CreateMitigationMeasureInput) {
    return this.prisma.assessmentMitigationMeasure.create({ data: input });
  }

  findMeasure(organisation: string, measureId: string) {
    return this.prisma.assessmentMitigationMeasure.findFirst({
      where: {
        id: measureId,
        deletedAt: null,
        risk: { evaluation: riskEvaluationScope(organisation) },
      },
    });
  }

  updateMeasure(measureId: string, input: UpdateMitigationMeasureInput) {
    return this.prisma.assessmentMitigationMeasure.update({
      where: { id: measureId },
      data: input,
    });
  }

  listMeasuresByEvaluation(evaluationId: string) {
    return this.prisma.assessmentMitigationMeasure.findMany({
      where: { deletedAt: null, risk: { evaluationId } },
      orderBy: { startWeek: 'asc' },
    });
  }

  async countMeasuresByEvaluations(evaluationIds: string[]) {
    const result = new Map<string, MeasureCounts>();
    if (evaluationIds.length === 0) return result;
    const measures = await this.prisma.assessmentMitigationMeasure.findMany({
      where: { deletedAt: null, risk: { evaluationId: { in: evaluationIds } } },
      select: { status: true, risk: { select: { evaluationId: true } } },
    });
    for (const measure of measures) {
      const stats = result.get(measure.risk.evaluationId) ?? {
        total: 0,
        done: 0,
      };
      stats.total += 1;
      if (measure.status === 'DONE') stats.done += 1;
      result.set(measure.risk.evaluationId, stats);
    }
    return result;
  }
}
