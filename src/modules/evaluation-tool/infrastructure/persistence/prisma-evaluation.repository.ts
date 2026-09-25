import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import {
  ACTIVE_EVALUATION_STATUSES,
  AssessmentToolCode,
} from '../../../assessment-core/domain/assessment.constants';
import {
  EvaluationRepository,
  ProfileFilter,
  ResponseInput,
} from '../../domain/ports/evaluation.repository';
import { SectionScoreResult } from '../../domain/evaluation-tool.types';
import { templateStructureInclude } from './prisma-template.repository';

export const evaluationInclude = {
  profile: true,
  template: { include: templateStructureInclude },
  responses: { include: { indicator: true } },
};

@Injectable()
export class PrismaEvaluationRepository implements EvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfile(organisation: string, profileId: string) {
    return this.prisma.assessmentOrganisationProfile.findFirst({
      where: { id: profileId, organisation, deletedAt: null },
    });
  }

  findProfiles(organisation: string, filter: ProfileFilter) {
    return this.prisma.assessmentOrganisationProfile.findMany({
      where: { organisation, deletedAt: null, ...filter },
      orderBy: { createdAt: 'desc' },
    });
  }

  findChildProfiles(organisation: string, parentIds: string[]) {
    if (parentIds.length === 0) return Promise.resolve([]);
    return this.prisma.assessmentOrganisationProfile.findMany({
      where: {
        organisation,
        parentProfileId: { in: parentIds },
        deletedAt: null,
      },
    });
  }

  findActiveForProfile(
    organisation: string,
    tool: AssessmentToolCode,
    profileId: string,
  ) {
    return this.prisma.assessmentEvaluation.findFirst({
      where: {
        organisation,
        profileId,
        deletedAt: null,
        status: { in: [...ACTIVE_EVALUATION_STATUSES] },
        template: { tool },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(input: {
    organisation: string;
    templateId: string;
    profileId: string;
    startedBy: string;
  }) {
    return this.prisma.assessmentEvaluation.create({ data: input });
  }

  async list(
    organisation: string,
    tool: AssessmentToolCode,
    page: { skip: number; take: number },
  ) {
    const where = { organisation, deletedAt: null, template: { tool } };
    const [items, total] = await Promise.all([
      this.prisma.assessmentEvaluation.findMany({
        where,
        include: {
          profile: true,
          template: { select: { id: true, name: true, version: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...page,
      }),
      this.prisma.assessmentEvaluation.count({ where }),
    ]);
    return { items, total };
  }

  findWithStructure(
    organisation: string,
    tool: AssessmentToolCode,
    evaluationId: string,
  ) {
    return this.prisma.assessmentEvaluation.findFirst({
      where: {
        id: evaluationId,
        organisation,
        deletedAt: null,
        template: { tool },
      },
      include: evaluationInclude,
    });
  }

  findByProfiles(
    organisation: string,
    tool: AssessmentToolCode,
    profileIds: string[],
  ) {
    if (profileIds.length === 0) return Promise.resolve([]);
    return this.prisma.assessmentEvaluation.findMany({
      where: {
        organisation,
        profileId: { in: profileIds },
        deletedAt: null,
        template: { tool },
      },
      orderBy: { createdAt: 'desc' },
      include: evaluationInclude,
    });
  }

  findCompletedByProfile(
    organisation: string,
    tool: AssessmentToolCode,
    profileId: string,
  ) {
    return this.prisma.assessmentEvaluation.findMany({
      where: {
        organisation,
        profileId,
        status: 'COMPLETED',
        deletedAt: null,
        template: { tool },
      },
      orderBy: { completedAt: 'asc' },
      select: {
        id: true,
        completedAt: true,
        globalScore: true,
        sectionScores: true,
      },
    });
  }

  async upsertResponses(
    evaluationId: string,
    responses: ResponseInput[],
    scoredBy: string,
    criticalThreshold: number,
  ) {
    await this.prisma.$transaction(
      responses.map((response) =>
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
    );
  }

  async setStatus(evaluationId: string, status: 'IN_PROGRESS') {
    await this.prisma.assessmentEvaluation.update({
      where: { id: evaluationId },
      data: { status },
    });
  }

  async complete(
    evaluationId: string,
    result: { globalScore: number; sectionScores: SectionScoreResult[] },
  ) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.assessmentEvaluation.update({
        where: { id: evaluationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          globalScore: result.globalScore,
          sectionScores:
            result.sectionScores as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);
    return updated;
  }
}
