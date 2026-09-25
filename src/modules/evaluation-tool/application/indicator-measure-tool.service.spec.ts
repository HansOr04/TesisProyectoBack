import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OrganizationalToolService } from '../../organizational-tool/application/organizational-tool.service';
import { OrganizationalToolAiService } from '../../organizational-tool/application/organizational-tool-ai.service';
import { PrismaTemplateRepository } from '../infrastructure/persistence/prisma-template.repository';
import { PrismaEvaluationRepository } from '../infrastructure/persistence/prisma-evaluation.repository';
import { PrismaIndicatorMeasureRepository } from '../infrastructure/persistence/prisma-indicator-measure.repository';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { AssessmentApplicabilityService } from '../../assessment-core/application/assessment-applicability.service';
import { AssessmentSessionGateway } from '../../assessment-session/infrastructure/assessment-session.gateway';
import { KpiResponseDto, ScoreKpiDto } from '../presentation/dto';

type AnyRecord = Record<string, any>;

function createPrismaMock() {
  return {
    assessmentTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    assessmentSection: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    assessmentIndicator: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    assessmentEvaluation: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    assessmentResponse: {
      count: jest.fn(),
      upsert: jest.fn(),
    },
    assessmentOrganisationProfile: {
      findFirst: jest.fn(),
    },
    assessmentIndicatorMeasure: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as AnyRecord;
}

function createAuditServiceMock() {
  return { record: jest.fn() } as AnyRecord;
}

function createAiServiceMock() {
  return {
    improveObservation: jest
      .fn()
      .mockResolvedValue({ improved: 'texto mejorado' }),
    suggestMeasuresForSection: jest.fn().mockResolvedValue([]),
    detectInconsistencies: jest.fn().mockResolvedValue([]),
    generateExecutiveNarrative: jest
      .fn()
      .mockResolvedValue({ narrative: 'narrativa generada' }),
    generateReportInsights: jest.fn().mockResolvedValue({
      keyFindings: ['Hallazgo de prueba'],
      sectionAnalysis: { '1': 'Análisis de prueba' },
      recommendations: ['Recomendación de prueba'],
    }),
  } as AnyRecord;
}

function createApplicabilityServiceMock() {
  return {
    resolveExcludedSectionIds: jest.fn().mockResolvedValue(new Set()),
    resolveExcludedIndicatorIds: jest.fn().mockResolvedValue(new Set()),
  } as AnyRecord;
}

function createSessionGatewayMock() {
  return {
    emitScoreUpdated: jest.fn(),
  } as AnyRecord;
}

const ORG = 'mh';

describe('IndicatorMeasureToolService (via OrganizationalToolService)', () => {
  let prisma: AnyRecord;
  let audit: AnyRecord;
  let ai: AnyRecord;
  let applicability: AnyRecord;
  let sessionGateway: AnyRecord;
  let service: OrganizationalToolService;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditServiceMock();
    ai = createAiServiceMock();
    applicability = createApplicabilityServiceMock();
    sessionGateway = createSessionGatewayMock();
    const prismaService = prisma as unknown as PrismaService;
    service = new OrganizationalToolService(
      new PrismaTemplateRepository(
        prismaService,
        audit as unknown as AssessmentAuditService,
      ),
      new PrismaEvaluationRepository(prismaService),
      new PrismaIndicatorMeasureRepository(prismaService),
      audit as unknown as AssessmentAuditService,
      ai as unknown as OrganizationalToolAiService,
      applicability as unknown as AssessmentApplicabilityService,
      sessionGateway as unknown as AssessmentSessionGateway,
    );
  });

  // ── DTO validation (UCA-04 business rules) ──────────────────────────────

  describe('ScoreKpiDto / KpiResponseDto validation', () => {
    it('accepts an integer score between 1 and 10 with a non-empty observation', async () => {
      const dto = plainToInstance(KpiResponseDto, {
        indicatorId: 'i1',
        score: 7,
        observation: 'Cumple parcialmente',
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it.each([0, 11, 5.5])('rejects score=%p', async (score) => {
      const dto = plainToInstance(KpiResponseDto, {
        indicatorId: 'i1',
        score,
        observation: 'obs',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects an empty observation', async () => {
      const dto = plainToInstance(KpiResponseDto, {
        indicatorId: 'i1',
        score: 8,
        observation: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'observation')).toBe(true);
    });

    it('rejects an empty responses array', async () => {
      const dto = plainToInstance(ScoreKpiDto, { responses: [] });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'responses')).toBe(true);
    });
  });

  // ── Estructura: versionado por inmutabilidad ─────────────────────────────

  describe('createSection', () => {
    it('creates directly on the active template when no evaluation references it', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue({
        id: 't1',
        organisation: ORG,
        version: 1,
        sections: [],
      });
      prisma.assessmentEvaluation.count.mockResolvedValue(0);
      prisma.assessmentSection.create.mockResolvedValue({
        id: 's1',
        templateId: 't1',
        number: 1,
      });

      await service.createSection(
        ORG,
        't1',
        { number: 1, name: 'Liderazgo y Talento Humano', weight: 1 },
        'user-1',
      );

      expect(prisma.assessmentTemplate.create).not.toHaveBeenCalled();
      expect(prisma.assessmentSection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ templateId: 't1' }),
        }),
      );
    });

    it('clones a new template version when an evaluation already references it', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue({
        id: 't1',
        organisation: ORG,
        version: 1,
        name: 'Diagnóstico',
        description: null,
        labels: null,
        sections: [
          {
            id: 's1',
            number: 1,
            name: 'Dim 1',
            description: null,
            weight: 1,
            sortOrder: 0,
            indicators: [
              {
                id: 'i1',
                code: 'AZ-1.1',
                name: 'KPI 1',
                description: null,
                weight: 1,
                active: true,
                sortOrder: 0,
              },
            ],
          },
        ],
      });
      prisma.assessmentEvaluation.count.mockResolvedValue(1);
      prisma.assessmentTemplate.create.mockResolvedValue({
        id: 't2',
        organisation: ORG,
        version: 2,
        sections: [
          {
            id: 's1-v2',
            number: 1,
            indicators: [{ id: 'i1-v2', code: 'AZ-1.1' }],
          },
        ],
      });
      prisma.assessmentSection.create.mockResolvedValue({
        id: 's2',
        templateId: 't2',
        number: 2,
      });

      await service.createSection(
        ORG,
        't1',
        { number: 2, name: 'Dim 2', weight: 1 },
        'user-1',
      );

      expect(prisma.assessmentTemplate.create).toHaveBeenCalled();
      expect(prisma.assessmentTemplate.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { active: false },
      });
      expect(audit.record).toHaveBeenCalledWith(
        ORG,
        'assessment-template.new-version',
        expect.objectContaining({
          previousTemplateId: 't1',
          newTemplateId: 't2',
        }),
        'user-1',
      );
      expect(prisma.assessmentSection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ templateId: 't2' }),
        }),
      );
    });
  });

  describe('updateSection', () => {
    const section = {
      id: 's1',
      templateId: 't1',
      number: 1,
      template: { organisation: ORG, tool: 'ORGANIZATIONAL' },
    };

    it('rejects with 409 when scored responses exist in an active evaluation and confirm is false', async () => {
      prisma.assessmentSection.findFirst.mockResolvedValue(section);
      prisma.assessmentResponse.count.mockResolvedValue(1);

      await expect(
        service.updateSection(
          ORG,
          's1',
          { name: 'Nuevo nombre' },
          false,
          'user-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.assessmentTemplate.findFirst).not.toHaveBeenCalled();
    });

    it('edits in place (no new version) when confirm=true and no other evaluations exist', async () => {
      prisma.assessmentSection.findFirst.mockResolvedValue(section);
      prisma.assessmentTemplate.findFirst.mockResolvedValue({
        id: 't1',
        organisation: ORG,
        version: 1,
        sections: [],
      });
      prisma.assessmentEvaluation.count.mockResolvedValue(0);
      prisma.assessmentSection.update.mockResolvedValue({
        id: 's1',
        name: 'Nuevo nombre',
      });

      await service.updateSection(
        ORG,
        's1',
        { name: 'Nuevo nombre' },
        true,
        'user-1',
      );

      expect(prisma.assessmentResponse.count).not.toHaveBeenCalled();
      expect(prisma.assessmentTemplate.create).not.toHaveBeenCalled();
      expect(prisma.assessmentSection.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' } }),
      );
    });
  });

  // ── Respuestas (UCA-04): coloreado automático y recálculo ───────────────

  function buildEvaluation(overrides: AnyRecord = {}) {
    return {
      id: 'e1',
      organisation: ORG,
      status: 'DRAFT',
      template: {
        id: 't1',
        sections: [
          {
            id: 's1',
            number: 1,
            name: 'Dim 1',
            weight: 2,
            indicators: [
              { id: 'i1', code: 'AZ-1.1', weight: 1, active: true },
              { id: 'i2', code: 'AZ-1.2', weight: 3, active: true },
            ],
          },
        ],
      },
      responses: [],
      sectionScores: null,
      globalScore: null,
      ...overrides,
    };
  }

  describe('upsertResponses', () => {
    it.each([
      [5, true],
      [6, false],
    ])(
      'marks isCritical=%p for score=%p at the boundary',
      async (score, expectedCritical) => {
        prisma.assessmentEvaluation.findFirst.mockResolvedValue(
          buildEvaluation(),
        );
        prisma.assessmentResponse.upsert.mockResolvedValue({});
        prisma.assessmentEvaluation.update.mockResolvedValue({});

        await service.upsertResponses(
          ORG,
          'e1',
          { responses: [{ indicatorId: 'i1', score, observation: 'obs' }] },
          'user-1',
        );

        expect(prisma.assessmentResponse.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            update: expect.objectContaining({ isCritical: expectedCritical }),
          }),
        );
      },
    );

    it('moves a DRAFT evaluation to IN_PROGRESS on first response', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildEvaluation(),
      );
      prisma.assessmentResponse.upsert.mockResolvedValue({});
      prisma.assessmentEvaluation.update.mockResolvedValue({});

      await service.upsertResponses(
        ORG,
        'e1',
        { responses: [{ indicatorId: 'i1', score: 8, observation: 'obs' }] },
        'user-1',
      );

      expect(prisma.assessmentEvaluation.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('rejects responses for an indicator outside the evaluation template', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildEvaluation(),
      );

      await expect(
        service.upsertResponses(
          ORG,
          'e1',
          {
            responses: [
              { indicatorId: 'unknown', score: 8, observation: 'obs' },
            ],
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.assessmentResponse.upsert).not.toHaveBeenCalled();
    });
  });

  describe('weighted section/global score computation', () => {
    it('computes the weighted average per section and the global score', async () => {
      const evaluation = buildEvaluation({
        status: 'IN_PROGRESS',
        responses: [
          {
            indicatorId: 'i1',
            score: 8,
            isCritical: false,
            observation: 'ok',
            indicator: { code: 'AZ-1.1', name: 'KPI 1' },
          },
          {
            indicatorId: 'i2',
            score: 4,
            isCritical: true,
            observation: 'bajo',
            indicator: { code: 'AZ-1.2', name: 'KPI 2' },
          },
        ],
      });
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      const result = await service.getEvaluation(ORG, 'e1');

      // (1*8 + 3*4) / (1+3) = 5
      expect(result.sectionScores[0].weightedAvg).toBe(5);
      expect(result.sectionScores[0].critical).toBe(true);
      expect(result.globalScore).toBe(5);
    });
  });

  describe('complete', () => {
    it('rejects with 422 when active KPI are missing a response', async () => {
      const evaluation = buildEvaluation({
        status: 'IN_PROGRESS',
        responses: [
          {
            indicatorId: 'i1',
            score: 8,
            isCritical: false,
            observation: 'ok',
            indicator: { code: 'AZ-1.1', name: 'KPI 1' },
          },
        ],
      });
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      await expect(
        service.complete(ORG, 'e1', 'user-1'),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('persists the score snapshot and marks the evaluation COMPLETED when all active KPI are answered', async () => {
      const evaluation = buildEvaluation({
        status: 'IN_PROGRESS',
        responses: [
          {
            indicatorId: 'i1',
            score: 8,
            isCritical: false,
            observation: 'ok',
            indicator: { code: 'AZ-1.1', name: 'KPI 1' },
          },
          {
            indicatorId: 'i2',
            score: 4,
            isCritical: true,
            observation: 'bajo',
            indicator: { code: 'AZ-1.2', name: 'KPI 2' },
          },
        ],
      });
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);
      prisma.assessmentEvaluation.update.mockResolvedValue({
        id: 'e1',
        status: 'COMPLETED',
      });

      await service.complete(ORG, 'e1', 'user-1');

      expect(prisma.assessmentEvaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'e1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            globalScore: 5,
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        ORG,
        'assessment-evaluation.complete',
        expect.objectContaining({ evaluationId: 'e1', globalScore: 5 }),
        'user-1',
      );
    });
  });

  describe('measures (plan de mitigación simplificado)', () => {
    const evaluation = buildEvaluation({
      status: 'IN_PROGRESS',
      responses: [
        {
          indicatorId: 'i1',
          score: 8,
          isCritical: false,
          observation: 'ok',
          indicator: { code: 'AZ-1.1', name: 'KPI 1' },
        },
        {
          indicatorId: 'i2',
          score: 4,
          isCritical: true,
          observation: 'bajo',
          indicator: { code: 'AZ-1.2', name: 'KPI 2' },
        },
      ],
    });

    it('rejects creating a measure for a non-critical KPI', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      await expect(
        service.createMeasure(
          ORG,
          'e1',
          {
            indicatorId: 'i1',
            name: 'Capacitación',
            responsible: 'Carlos',
            startDate: '2026-08-01',
            endDate: '2026-08-15',
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.assessmentIndicatorMeasure.create).not.toHaveBeenCalled();
    });

    it('creates a measure for a critical KPI and records an audit log', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);
      prisma.assessmentIndicatorMeasure.create.mockResolvedValue({ id: 'm1' });

      const result = await service.createMeasure(
        ORG,
        'e1',
        {
          indicatorId: 'i2',
          name: 'Auditoría financiera',
          responsible: 'Ana',
          startDate: '2026-08-01',
          endDate: '2026-08-15',
        },
        'user-1',
      );

      expect(result.id).toBe('m1');
      expect(prisma.assessmentIndicatorMeasure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            evaluationId: 'e1',
            indicatorId: 'i2',
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        ORG,
        'assessment-measure.create',
        expect.objectContaining({ measureId: 'm1' }),
        'user-1',
      );
    });

    it.each([
      [0, 'PENDING'],
      [50, 'IN_PROGRESS'],
      [100, 'DONE'],
    ])(
      'derives status=%s for progressPct=%s',
      async (progressPct, expectedStatus) => {
        prisma.assessmentIndicatorMeasure.findFirst.mockResolvedValue({
          id: 'm1',
          organisation: ORG,
        });
        prisma.assessmentIndicatorMeasure.update.mockResolvedValue({
          id: 'm1',
          progressPct,
          status: expectedStatus,
        });

        await service.updateMeasureProgress(
          ORG,
          'm1',
          { progressPct },
          'user-1',
        );

        expect(prisma.assessmentIndicatorMeasure.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              progressPct,
              status: expectedStatus,
            }),
          }),
        );
      },
    );
  });

  describe('AI assistance (improveObservation / suggestMeasuresForSection)', () => {
    const evaluation = buildEvaluation({
      status: 'IN_PROGRESS',
      template: {
        id: 't1',
        sections: [
          {
            id: 's1',
            number: 1,
            name: 'Dim 1',
            weight: 2,
            indicators: [
              {
                id: 'i1',
                code: 'AZ-1.1',
                name: 'KPI 1',
                description: 'desc 1',
                weight: 1,
                active: true,
              },
              {
                id: 'i2',
                code: 'AZ-1.2',
                name: 'KPI 2',
                description: 'desc 2',
                weight: 3,
                active: true,
              },
              {
                id: 'i3',
                code: 'AZ-1.3',
                name: 'KPI 3',
                description: 'desc 3',
                weight: 1,
                active: true,
              },
            ],
          },
        ],
      },
      responses: [
        {
          indicatorId: 'i1',
          score: 8,
          isCritical: false,
          observation: 'ok',
          indicator: { code: 'AZ-1.1', name: 'KPI 1', description: 'desc 1' },
        },
        {
          indicatorId: 'i2',
          score: 4,
          isCritical: true,
          observation: 'bajo',
          indicator: {
            code: 'AZ-1.2',
            name: 'KPI 2',
            description: 'desc 2',
            weight: 3,
          },
        },
      ],
    });

    it('improveObservation reads the indicator from the template and delegates to the AI service', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      const result = await service.improveObservation(ORG, 'e1', 'i2', {
        score: 4,
        observation: 'bajo',
      });

      expect(ai.improveObservation).toHaveBeenCalledWith(
        { code: 'AZ-1.2', name: 'KPI 2', description: 'desc 2' },
        4,
        'bajo',
      );
      expect(result).toEqual({ improved: 'texto mejorado' });
    });

    it('improveObservation works for a KPI that has not been saved yet (no persisted response)', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      const result = await service.improveObservation(ORG, 'e1', 'i3', {
        score: 2,
        observation: 'no hay plan estrategico',
      });

      expect(ai.improveObservation).toHaveBeenCalledWith(
        { code: 'AZ-1.3', name: 'KPI 3', description: 'desc 3' },
        2,
        'no hay plan estrategico',
      );
      expect(result).toEqual({ improved: 'texto mejorado' });
    });

    it('improveObservation throws NotFoundException for an indicator not in this evaluation template', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      await expect(
        service.improveObservation(ORG, 'e1', 'unknown', {
          score: 5,
          observation: 'x',
        }),
      ).rejects.toThrow('Indicator not found in this evaluation template');
      expect(ai.improveObservation).not.toHaveBeenCalled();
    });

    it('suggestMeasuresForSection only sends critical KPI without an existing measure', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);
      prisma.assessmentIndicatorMeasure.findMany.mockResolvedValue([]);

      await service.suggestMeasuresForSection(ORG, 'e1', 1);

      expect(ai.suggestMeasuresForSection).toHaveBeenCalledWith('Dim 1', [
        {
          indicatorId: 'i2',
          code: 'AZ-1.2',
          name: 'KPI 2',
          description: 'desc 2',
          score: 4,
          observation: 'bajo',
          weight: 3,
        },
      ]);
    });

    it('suggestMeasuresForSection excludes critical KPI that already have a measure', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);
      prisma.assessmentIndicatorMeasure.findMany.mockResolvedValue([
        { indicatorId: 'i2' },
      ]);

      await service.suggestMeasuresForSection(ORG, 'e1', 1);

      expect(ai.suggestMeasuresForSection).toHaveBeenCalledWith('Dim 1', []);
    });

    it('suggestMeasuresForSection throws NotFoundException for an unknown dimension number', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      await expect(
        service.suggestMeasuresForSection(ORG, 'e1', 99),
      ).rejects.toThrow('Dimension not found for this evaluation');
      expect(ai.suggestMeasuresForSection).not.toHaveBeenCalled();
    });

    it('suggestMeasuresForEvaluation calls the AI once per dimension with critical KPI, skips dimensions with none, and returns results sorted by priority', async () => {
      const twoDimensionEvaluation = buildEvaluation({
        status: 'IN_PROGRESS',
        template: {
          id: 't1',
          sections: [
            {
              id: 's1',
              number: 1,
              name: 'Dim 1',
              weight: 2,
              indicators: [
                {
                  id: 'i1',
                  code: 'AZ-1.1',
                  name: 'KPI 1',
                  description: 'desc 1',
                  weight: 1,
                  active: true,
                },
                {
                  id: 'i2',
                  code: 'AZ-1.2',
                  name: 'KPI 2',
                  description: 'desc 2',
                  weight: 3,
                  active: true,
                },
              ],
            },
            {
              id: 's2',
              number: 2,
              name: 'Dim 2',
              weight: 1,
              indicators: [
                {
                  id: 'i4',
                  code: 'AZ-2.1',
                  name: 'KPI 4',
                  description: 'desc 4',
                  weight: 2,
                  active: true,
                },
                {
                  id: 'i5',
                  code: 'AZ-2.2',
                  name: 'KPI 5',
                  description: 'desc 5',
                  weight: 1,
                  active: true,
                },
              ],
            },
          ],
        },
        responses: [
          {
            indicatorId: 'i1',
            score: 8,
            isCritical: false,
            observation: 'ok',
            indicator: { code: 'AZ-1.1', name: 'KPI 1', description: 'desc 1' },
          },
          {
            indicatorId: 'i2',
            score: 4,
            isCritical: true,
            observation: 'bajo',
            indicator: {
              code: 'AZ-1.2',
              name: 'KPI 2',
              description: 'desc 2',
              weight: 3,
            },
          },
          {
            indicatorId: 'i4',
            score: 2,
            isCritical: true,
            observation: 'muy bajo',
            indicator: {
              code: 'AZ-2.1',
              name: 'KPI 4',
              description: 'desc 4',
              weight: 2,
            },
          },
          {
            indicatorId: 'i5',
            score: 9,
            isCritical: false,
            observation: 'ok',
            indicator: { code: 'AZ-2.2', name: 'KPI 5', description: 'desc 5' },
          },
        ],
      });

      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        twoDimensionEvaluation,
      );
      prisma.assessmentIndicatorMeasure.findMany.mockResolvedValue([]);
      ai.suggestMeasuresForSection.mockImplementation((sectionName: string) =>
        sectionName === 'Dim 1'
          ? [{ indicatorId: 'i2', name: 'Medida 2', description: 'D2' }]
          : [{ indicatorId: 'i4', name: 'Medida 4', description: 'D4' }],
      );

      const result = await service.suggestMeasuresForEvaluation(ORG, 'e1');

      expect(ai.suggestMeasuresForSection).toHaveBeenCalledTimes(2);
      expect(ai.suggestMeasuresForSection).toHaveBeenCalledWith('Dim 1', [
        {
          indicatorId: 'i2',
          code: 'AZ-1.2',
          name: 'KPI 2',
          description: 'desc 2',
          score: 4,
          observation: 'bajo',
          weight: 3,
        },
      ]);
      expect(ai.suggestMeasuresForSection).toHaveBeenCalledWith('Dim 2', [
        {
          indicatorId: 'i4',
          code: 'AZ-2.1',
          name: 'KPI 4',
          description: 'desc 4',
          score: 2,
          observation: 'muy bajo',
          weight: 2,
        },
      ]);
      // Prioridad de impacto = peso × (umbral - score): i4 = 2*(5-2) = 6,
      // i2 = 3*(5-4) = 3 — i4 va primero pese a que i2 tiene menor peso de
      // dimensión, porque su propio peso × brecha es mayor.
      expect(result.suggestions.map((s) => s.indicatorId)).toEqual([
        'i4',
        'i2',
      ]);
      expect(result.suggestions[0]).toMatchObject({
        code: 'AZ-2.1',
        score: 2,
        impactScore: 6,
        sectionNumber: 2,
        sectionName: 'Dim 2',
      });
      expect(result.suggestions[1]).toMatchObject({
        code: 'AZ-1.2',
        score: 4,
        impactScore: 3,
      });
    });

    it('suggestMeasuresForEvaluation makes no AI call when there are no critical KPI without a measure', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);
      prisma.assessmentIndicatorMeasure.findMany.mockResolvedValue([
        { indicatorId: 'i2' },
      ]);

      const result = await service.suggestMeasuresForEvaluation(ORG, 'e1');

      expect(ai.suggestMeasuresForSection).not.toHaveBeenCalled();
      expect(result).toEqual({ suggestions: [] });
    });

    it('detectInconsistencies sends all answered KPI and resolves code/name for each finding', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);
      ai.detectInconsistencies.mockResolvedValue([
        {
          indicatorIds: ['i1', 'i2'],
          description: 'Contradicción entre KPI 1 y KPI 2.',
        },
      ]);

      const result = await service.detectInconsistencies(ORG, 'e1');

      expect(ai.detectInconsistencies).toHaveBeenCalledWith([
        { indicatorId: 'i1', code: 'AZ-1.1', score: 8, observation: 'ok' },
        { indicatorId: 'i2', code: 'AZ-1.2', score: 4, observation: 'bajo' },
      ]);
      expect(result).toEqual({
        findings: [
          {
            description: 'Contradicción entre KPI 1 y KPI 2.',
            indicators: [
              { indicatorId: 'i1', code: 'AZ-1.1', name: 'KPI 1' },
              { indicatorId: 'i2', code: 'AZ-1.2', name: 'KPI 2' },
            ],
          },
        ],
      });
    });

    it('generateExecutiveNarrative builds a lightweight context (no full observations) and forwards the tone', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      const result = await service.generateExecutiveNarrative(ORG, 'e1', {
        tone: 'informative',
      });

      expect(ai.generateExecutiveNarrative).toHaveBeenCalledWith(
        expect.objectContaining({
          criticalItems: [{ code: 'AZ-1.2', name: 'KPI 2', score: 4 }],
        }),
        'informative',
      );
      expect(result).toEqual({ narrative: 'narrativa generada' });
    });
  });

  describe('summaryExportPptx', () => {
    // pptxgenjs internally uses a dynamic `import('node:fs')` when
    // serializing, which Jest's CJS test environment can't resolve without
    // --experimental-vm-modules. We exercise the real slide-building logic
    // (data queries, addXxxSlide calls) and only stub the final binary
    // serialization step, which is third-party code, not ours to test here.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PptxGenJSCtor = require('pptxgenjs');
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      writeSpy = jest
        .spyOn(PptxGenJSCtor.prototype, 'write')
        .mockResolvedValue(Buffer.from('fake-pptx-content'));
      // La diapositiva de evolución consulta el historial de evaluaciones
      // completadas del perfil; sin historial no se agrega.
      prisma.assessmentEvaluation.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      writeSpy.mockRestore();
    });

    it('returns a non-empty pptx buffer with the expected filename and content type', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildEvaluation({
          profile: { name: 'Cooperativa Test' },
          responses: [
            {
              indicatorId: 'i2',
              score: 4,
              isCritical: true,
              observation: 'bajo',
              indicator: { code: 'AZ-1.2', name: 'KPI 2' },
            },
          ],
        }),
      );
      prisma.assessmentIndicatorMeasure.findMany.mockResolvedValue([
        { status: 'PENDING' },
        { status: 'DONE' },
      ]);

      const result = await service.summaryExportPptx(
        ORG,
        'e1',
        'Narrativa de prueba',
      );

      expect(result.filename).toBe('reporte-organizational-e1.pptx');
      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      );
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(ai.generateReportInsights).toHaveBeenCalledWith(
        expect.objectContaining({
          globalScore: expect.any(Number),
          sectionScores: expect.any(Array),
          criticalItems: expect.any(Array),
        }),
      );
    });

    it('still returns a valid pptx buffer when the AI insights call fails', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildEvaluation({ profile: { name: 'Cooperativa Test' } }),
      );
      prisma.assessmentIndicatorMeasure.findMany.mockResolvedValue([]);
      ai.generateReportInsights.mockRejectedValueOnce(
        new Error('AI unavailable'),
      );

      const result = await service.summaryExportPptx(ORG, 'e1');

      expect(result.filename).toBe('reporte-organizational-e1.pptx');
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  // ── RNF-01: 100% de los endpoints Assessment con guard de permiso ─────────────

  describe('IndicatorToolController — guard coverage', () => {
    it('decorates every HTTP route with @RequireAssessmentPermission', () => {
      const controllerPath = path.join(
        __dirname,
        '..',
        'presentation',
        'indicator-tool.controller.factory.ts',
      );
      const source = fs.readFileSync(controllerPath, 'utf8');
      const methodBlocks = source
        .split(/(?=@(?:Get|Post|Patch|Put|Delete)\()/g)
        .slice(1);

      expect(methodBlocks.length).toBeGreaterThan(0);
      for (const block of methodBlocks) {
        expect(block).toContain('@RequireAssessmentPermission(');
      }
    });
  });
});
