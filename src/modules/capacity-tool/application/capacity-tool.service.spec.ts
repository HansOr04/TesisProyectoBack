import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { AssessmentApplicabilityService } from '../../assessment-core/application/assessment-applicability.service';
import { AssessmentSessionGateway } from '../../assessment-session/infrastructure/assessment-session.gateway';
import { PrismaEvaluationRepository } from '../../evaluation-tool/infrastructure/persistence/prisma-evaluation.repository';
import { PrismaIndicatorMeasureRepository } from '../../evaluation-tool/infrastructure/persistence/prisma-indicator-measure.repository';
import { PrismaTemplateRepository } from '../../evaluation-tool/infrastructure/persistence/prisma-template.repository';
import { CAPACITY_TOOL_DEFINITION } from '../domain/capacity-tool.definition';
import { CapacityToolAiService } from './capacity-tool-ai.service';
import { CapacityToolService } from './capacity-tool.service';

type AnyRecord = Record<string, any>;

// El flujo completo se prueba una sola vez en
// evaluation-tool/application/indicator-measure-tool.service.spec.ts; acá solo
// se verifica que la Herramienta de Capacidades parametriza bien el genérico.
describe('CapacityToolService (definición de la herramienta)', () => {
  let prisma: AnyRecord;
  let service: CapacityToolService;

  beforeEach(() => {
    prisma = {
      assessmentTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      assessmentEvaluation: { count: jest.fn().mockResolvedValue(0) },
      assessmentSection: { create: jest.fn() },
    };
    const audit = { record: jest.fn() } as AnyRecord;
    const prismaService = prisma as unknown as PrismaService;
    service = new CapacityToolService(
      new PrismaTemplateRepository(
        prismaService,
        audit as unknown as AssessmentAuditService,
      ),
      new PrismaEvaluationRepository(prismaService),
      new PrismaIndicatorMeasureRepository(prismaService),
      audit as unknown as AssessmentAuditService,
      {} as CapacityToolAiService,
      {} as AssessmentApplicabilityService,
      {} as AssessmentSessionGateway,
    );
  });

  it('declares the CAPACITY tool with area-based labels', () => {
    expect(CAPACITY_TOOL_DEFINITION.code).toBe('CAPACITY');
    expect(CAPACITY_TOOL_DEFINITION.slug).toBe('capacity');
    expect(CAPACITY_TOOL_DEFINITION.section.singularEn).toBe('Area');
  });

  it('scopes template queries to the CAPACITY tool', async () => {
    await service.listTemplates('org');
    expect(prisma.assessmentTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organisation: 'org',
          tool: 'CAPACITY',
        }),
      }),
    );
  });

  it('reports duplicated sections using the tool vocabulary (area)', async () => {
    prisma.assessmentTemplate.findFirst.mockResolvedValue({
      id: 't1',
      organisation: 'org',
      tool: 'CAPACITY',
      version: 1,
      sections: [],
    });
    prisma.assessmentSection.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createSection('org', 't1', { number: 1, name: 'Área 1' }),
    ).rejects.toThrow(
      new ConflictException('Area number 1 already exists in this template'),
    );
  });
});
