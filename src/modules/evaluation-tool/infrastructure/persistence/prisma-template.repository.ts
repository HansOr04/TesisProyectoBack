import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import {
  ACTIVE_EVALUATION_STATUSES,
  AssessmentToolCode,
} from '../../../assessment-core/domain/assessment.constants';
import { AssessmentAuditService } from '../../../assessment-core/application/assessment-audit.service';
import {
  DuplicateStructureError,
  IndicatorInput,
  SectionInput,
  TemplateRepository,
} from '../../domain/ports/template.repository';
import { TemplateWithStructure } from '../../domain/evaluation-tool.types';

export const templateStructureInclude = {
  sections: {
    where: { deletedAt: null },
    orderBy: { number: 'asc' as const },
    include: {
      indicators: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
};

function translateUniqueViolation(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new DuplicateStructureError();
  }
  throw error;
}

@Injectable()
export class PrismaTemplateRepository implements TemplateRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AssessmentAuditService,
  ) {}

  findAll(organisation: string, tool: AssessmentToolCode) {
    return this.prisma.assessmentTemplate.findMany({
      where: { organisation, tool, deletedAt: null },
      include: templateStructureInclude,
      orderBy: { version: 'desc' },
    });
  }

  findById(organisation: string, tool: AssessmentToolCode, id: string) {
    return this.prisma.assessmentTemplate.findFirst({
      where: { id, organisation, tool, deletedAt: null },
      include: templateStructureInclude,
    });
  }

  findActive(organisation: string, tool: AssessmentToolCode) {
    return this.prisma.assessmentTemplate.findFirst({
      where: { organisation, tool, active: true, deletedAt: null },
      include: templateStructureInclude,
      orderBy: { version: 'desc' },
    });
  }

  countEvaluations(templateId: string) {
    return this.prisma.assessmentEvaluation.count({
      where: { templateId, deletedAt: null },
    });
  }

  async cloneAsNewVersion(
    current: TemplateWithStructure,
    actorId?: string,
  ): Promise<TemplateWithStructure> {
    const newTemplate = await this.prisma.assessmentTemplate.create({
      data: {
        organisation: current.organisation,
        tool: current.tool as AssessmentToolCode,
        version: current.version + 1,
        name: current.name,
        description: current.description,
        active: true,
        labels: (current.labels as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        riskThreshold:
          current.riskThreshold != null
            ? Number(current.riskThreshold)
            : undefined,
        createdBy: actorId,
        sections: {
          create: current.sections.map((section) => ({
            number: section.number,
            name: section.name,
            description: section.description,
            weight: Number(section.weight),
            sortOrder: section.sortOrder,
            indicators: {
              create: section.indicators.map((indicator) => ({
                code: indicator.code,
                name: indicator.name,
                description: indicator.description,
                helpText: indicator.helpText,
                scoringRubric: indicator.scoringRubric,
                weight: Number(indicator.weight),
                active: indicator.active,
                sortOrder: indicator.sortOrder,
              })),
            },
          })),
        },
      },
      include: templateStructureInclude,
    });

    await this.prisma.assessmentTemplate.update({
      where: { id: current.id },
      data: { active: false },
    });

    await this.auditService.record(
      current.organisation,
      'assessment-template.new-version',
      {
        previousTemplateId: current.id,
        newTemplateId: newTemplate.id,
        version: newTemplate.version,
      },
      actorId,
    );

    return newTemplate;
  }

  async createSection(
    templateId: string,
    input: Required<Pick<SectionInput, 'number' | 'name'>> & SectionInput,
  ) {
    try {
      return await this.prisma.assessmentSection.create({
        data: {
          templateId,
          number: input.number,
          name: input.name,
          description: input.description,
          weight: input.weight ?? 1,
        },
      });
    } catch (error) {
      translateUniqueViolation(error);
    }
  }

  findSection(
    organisation: string,
    tool: AssessmentToolCode,
    sectionId: string,
  ) {
    return this.prisma.assessmentSection.findFirst({
      where: {
        id: sectionId,
        deletedAt: null,
        template: { organisation, tool },
      },
      include: { template: true },
    });
  }

  findSectionById(sectionId: string) {
    return this.prisma.assessmentSection.findUniqueOrThrow({
      where: { id: sectionId },
    });
  }

  countScoredResponsesInActiveEvaluations(filter: {
    sectionId?: string;
    indicatorId?: string;
  }) {
    return this.prisma.assessmentResponse.count({
      where: {
        ...(filter.indicatorId ? { indicatorId: filter.indicatorId } : {}),
        ...(filter.sectionId
          ? { indicator: { sectionId: filter.sectionId } }
          : {}),
        evaluation: {
          status: { in: [...ACTIVE_EVALUATION_STATUSES] },
          deletedAt: null,
        },
      },
    });
  }

  updateSection(sectionId: string, input: SectionInput) {
    return this.prisma.assessmentSection.update({
      where: { id: sectionId },
      data: {
        number: input.number,
        name: input.name,
        description: input.description,
        weight: input.weight,
      },
    });
  }

  async softDeleteSection(sectionId: string) {
    await this.prisma.assessmentSection.update({
      where: { id: sectionId },
      data: { deletedAt: new Date() },
    });
  }

  async createIndicator(
    sectionId: string,
    input: Required<Pick<IndicatorInput, 'code' | 'name'>> & IndicatorInput,
  ) {
    try {
      return await this.prisma.assessmentIndicator.create({
        data: {
          sectionId,
          code: input.code,
          name: input.name,
          description: input.description,
          helpText: input.helpText,
          scoringRubric: input.scoringRubric,
          weight: input.weight ?? 1,
        },
      });
    } catch (error) {
      translateUniqueViolation(error);
    }
  }

  findIndicator(
    organisation: string,
    tool: AssessmentToolCode,
    indicatorId: string,
  ) {
    return this.prisma.assessmentIndicator.findFirst({
      where: {
        id: indicatorId,
        deletedAt: null,
        section: { template: { organisation, tool } },
      },
      include: { section: true },
    });
  }

  updateIndicator(indicatorId: string, input: IndicatorInput) {
    return this.prisma.assessmentIndicator.update({
      where: { id: indicatorId },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        helpText: input.helpText,
        scoringRubric: input.scoringRubric,
        weight: input.weight,
        active: input.active,
      },
    });
  }

  async softDeleteIndicator(indicatorId: string) {
    await this.prisma.assessmentIndicator.update({
      where: { id: indicatorId },
      data: { deletedAt: new Date() },
    });
  }
}
