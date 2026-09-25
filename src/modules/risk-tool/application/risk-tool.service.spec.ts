import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RiskToolService } from './risk-tool.service';
import { PrismaTemplateRepository } from '../../evaluation-tool/infrastructure/persistence/prisma-template.repository';
import { PrismaEvaluationRepository } from '../../evaluation-tool/infrastructure/persistence/prisma-evaluation.repository';
import { PrismaRiskRepository } from '../infrastructure/persistence/prisma-risk.repository';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { AssessmentApplicabilityService } from '../../assessment-core/application/assessment-applicability.service';
import { AssessmentSessionGateway } from '../../assessment-session/infrastructure/assessment-session.gateway';
import { RiskToolAiService } from './risk-tool-ai.service';
import { KpiResponseRiskDto, ScoreKpiRiskDto } from '../presentation/dto';

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
    assessmentRisk: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    // Parámetros por país: EC con umbral 5 (como el seed); otros sin override.
    assessmentRiskCountryParam: {
      findUnique: jest.fn(({ where }: { where: any }) =>
        Promise.resolve(
          where.organisation_country.country === 'EC'
            ? { country: 'EC', riskThreshold: 5 }
            : null,
        ),
      ),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    assessmentMitigationMeasure: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
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
    suggestMeasuresForPrinciple: jest.fn().mockResolvedValue([]),
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

describe('RiskToolService (F4-B03/B04)', () => {
  let prisma: AnyRecord;
  let audit: AnyRecord;
  let ai: AnyRecord;
  let applicability: AnyRecord;
  let sessionGateway: AnyRecord;
  let service: RiskToolService;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditServiceMock();
    ai = createAiServiceMock();
    applicability = createApplicabilityServiceMock();
    sessionGateway = createSessionGatewayMock();
    const prismaService = prisma as unknown as PrismaService;
    service = new RiskToolService(
      new PrismaTemplateRepository(
        prismaService,
        audit as unknown as AssessmentAuditService,
      ),
      new PrismaEvaluationRepository(prismaService),
      new PrismaRiskRepository(prismaService),
      audit as unknown as AssessmentAuditService,
      ai as unknown as RiskToolAiService,
      applicability as unknown as AssessmentApplicabilityService,
      sessionGateway as unknown as AssessmentSessionGateway,
    );
  });

  // ── DTO validation (RF-05 business rules) ───────────────────────────────

  describe('ScoreKpiRiskDto / KpiResponseRiskDto validation', () => {
    it('accepts a valid response with score, observation and riskDescription', async () => {
      const dto = plainToInstance(KpiResponseRiskDto, {
        indicatorId: 'i1',
        score: 7,
        observation: 'Cumple parcialmente',
        riskDescription: 'Riesgo de tenencia de tierra sin regularizar',
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('accepts riskType as optional', async () => {
      const dto = plainToInstance(KpiResponseRiskDto, {
        indicatorId: 'i1',
        score: 7,
        observation: 'obs',
        riskDescription: 'riesgo',
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it.each([0, 11, 5.5])('rejects score=%p', async (score) => {
      const dto = plainToInstance(KpiResponseRiskDto, {
        indicatorId: 'i1',
        score,
        observation: 'obs',
        riskDescription: 'riesgo',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects an empty riskDescription', async () => {
      const dto = plainToInstance(KpiResponseRiskDto, {
        indicatorId: 'i1',
        score: 8,
        observation: 'obs',
        riskDescription: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'riskDescription')).toBe(true);
    });

    it('rejects an empty responses array', async () => {
      const dto = plainToInstance(ScoreKpiRiskDto, { responses: [] });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'responses')).toBe(true);
    });
  });

  // ── Respuestas + clasificación de riesgo (RF-05) ────────────────────────

  function buildEvaluation(overrides: AnyRecord = {}) {
    return {
      id: 'e1',
      organisation: ORG,
      status: 'DRAFT',
      profile: { country: 'EC' },
      template: {
        id: 't1',
        riskThreshold: 5,
        sections: [
          {
            id: 's1',
            number: 1,
            name: 'Principio 1',
            weight: 2,
            indicators: [
              { id: 'i1', code: 'VE-1.1', weight: 1, active: true },
              { id: 'i2', code: 'VE-1.2', weight: 3, active: true },
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
      [5, 'NON_NEGLIGIBLE'],
      [6, 'NEGLIGIBLE'],
    ])(
      'classifies risk as %s for score=%p at the exact EC threshold (5)',
      async (score, expectedClass) => {
        prisma.assessmentEvaluation.findFirst.mockResolvedValue(
          buildEvaluation(),
        );
        prisma.assessmentResponse.upsert.mockResolvedValue({});
        prisma.assessmentRisk.upsert.mockResolvedValue({});
        prisma.assessmentEvaluation.update.mockResolvedValue({});

        await service.upsertResponses(
          ORG,
          'e1',
          {
            responses: [
              {
                indicatorId: 'i1',
                score,
                observation: 'obs',
                riskDescription: 'riesgo identificado',
              },
            ],
          },
          'user-1',
        );

        expect(prisma.assessmentRisk.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              evaluationId_indicatorId: {
                evaluationId: 'e1',
                indicatorId: 'i1',
              },
            },
            update: expect.objectContaining({ class: expectedClass }),
            create: expect.objectContaining({ class: expectedClass }),
          }),
        );
      },
    );

    it('falls back to the template riskThreshold when the country has no config override', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildEvaluation({
          profile: { country: 'ZZ' },
          template: {
            id: 't1',
            riskThreshold: 3,
            sections: [
              {
                id: 's1',
                number: 1,
                name: 'Principio 1',
                weight: 2,
                indicators: [
                  { id: 'i1', code: 'VE-1.1', weight: 1, active: true },
                ],
              },
            ],
          },
        }),
      );
      prisma.assessmentResponse.upsert.mockResolvedValue({});
      prisma.assessmentRisk.upsert.mockResolvedValue({});
      prisma.assessmentEvaluation.update.mockResolvedValue({});

      // score=4 > threshold(3) ⇒ NEGLIGIBLE
      await service.upsertResponses(
        ORG,
        'e1',
        {
          responses: [
            {
              indicatorId: 'i1',
              score: 4,
              observation: 'obs',
              riskDescription: 'riesgo',
            },
          ],
        },
        'user-1',
      );

      expect(prisma.assessmentRisk.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ class: 'NEGLIGIBLE' }),
        }),
      );
    });

    it('upserts both the response and the risk with description/riskType/identifiedBy', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildEvaluation(),
      );
      prisma.assessmentResponse.upsert.mockResolvedValue({});
      prisma.assessmentRisk.upsert.mockResolvedValue({});
      prisma.assessmentEvaluation.update.mockResolvedValue({});

      await service.upsertResponses(
        ORG,
        'e1',
        {
          responses: [
            {
              indicatorId: 'i1',
              score: 2,
              observation: 'obs',
              riskDescription: 'Deforestación reciente detectada',
              riskType: 'Ambiental',
            },
          ],
        },
        'user-1',
      );

      expect(prisma.assessmentResponse.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isCritical: true }),
        }),
      );
      expect(prisma.assessmentRisk.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            description: 'Deforestación reciente detectada',
            riskType: 'Ambiental',
            identifiedBy: 'user-1',
          }),
        }),
      );
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
              {
                indicatorId: 'unknown',
                score: 8,
                observation: 'obs',
                riskDescription: 'riesgo',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.assessmentResponse.upsert).not.toHaveBeenCalled();
      expect(prisma.assessmentRisk.upsert).not.toHaveBeenCalled();
    });
  });

  describe('weighted section/global score computation', () => {
    it('computes the weighted average per section and the global score (same math as Organizational)', async () => {
      const evaluation = buildEvaluation({
        status: 'IN_PROGRESS',
        responses: [
          {
            indicatorId: 'i1',
            score: 8,
            isCritical: false,
            observation: 'ok',
            indicator: { code: 'VE-1.1', name: 'KPI 1' },
          },
          {
            indicatorId: 'i2',
            score: 4,
            isCritical: true,
            observation: 'bajo',
            indicator: { code: 'VE-1.2', name: 'KPI 2' },
          },
        ],
      });
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(evaluation);

      const result = await service.getEvaluation(ORG, 'e1');

      // (1*8 + 3*4) / (1+3) = 5
      expect(result.sectionScores[0].weightedAvg).toBe(5);
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
            indicator: { code: 'VE-1.1', name: 'KPI 1' },
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
            indicator: { code: 'VE-1.1', name: 'KPI 1' },
          },
          {
            indicatorId: 'i2',
            score: 4,
            isCritical: true,
            observation: 'bajo',
            indicator: { code: 'VE-1.2', name: 'KPI 2' },
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
    });
  });

  describe('plan de mitigación (UCV-07 / RF-06)', () => {
    it('rejects creating a measure on a NEGLIGIBLE risk with 422', async () => {
      prisma.assessmentRisk.findFirst.mockResolvedValue({
        id: 'r1',
        class: 'NEGLIGIBLE',
      });

      await expect(
        service.createMeasure(
          ORG,
          'r1',
          {
            description: 'Reforestar zona degradada',
            responsible: 'Carlos',
            startWeek: '2026-08-03',
            durationDays: 30,
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.assessmentMitigationMeasure.create).not.toHaveBeenCalled();
    });

    it('creates a measure on a NON_NEGLIGIBLE risk, computing endDate and logging audit', async () => {
      prisma.assessmentRisk.findFirst.mockResolvedValue({
        id: 'r1',
        class: 'NON_NEGLIGIBLE',
      });
      prisma.assessmentMitigationMeasure.create.mockResolvedValue({ id: 'm1' });

      const result = await service.createMeasure(
        ORG,
        'r1',
        {
          description: 'Reforestar zona degradada',
          responsible: 'Carlos',
          startWeek: '2026-08-03',
          durationDays: 30,
        },
        'user-1',
      );

      expect(result.id).toBe('m1');
      expect(prisma.assessmentMitigationMeasure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            riskId: 'r1',
            durationDays: 30,
            endDate: new Date('2026-09-02'),
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        ORG,
        'assessment-measure.create',
        expect.objectContaining({ measureId: 'm1', riskId: 'r1' }),
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
        prisma.assessmentMitigationMeasure.findFirst.mockResolvedValue({
          id: 'm1',
        });
        prisma.assessmentMitigationMeasure.update.mockResolvedValue({
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

        expect(prisma.assessmentMitigationMeasure.update).toHaveBeenCalledWith(
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

  describe('gantt', () => {
    it('returns measures ordered by startWeek, mapped to the Gantt payload', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildEvaluation(),
      );
      prisma.assessmentMitigationMeasure.findMany.mockResolvedValue([
        {
          id: 'm1',
          description: 'Medida 1',
          responsible: 'Ana',
          startWeek: new Date('2026-08-03'),
          endDate: new Date('2026-08-17'),
          progressPct: 50,
          status: 'IN_PROGRESS',
        },
      ]);

      const result = await service.gantt(ORG, 'e1');

      expect(prisma.assessmentMitigationMeasure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { startWeek: 'asc' } }),
      );
      expect(result).toEqual([
        {
          measureId: 'm1',
          description: 'Medida 1',
          responsible: 'Ana',
          start: new Date('2026-08-03'),
          end: new Date('2026-08-17'),
          progressPct: 50,
          status: 'IN_PROGRESS',
        },
      ]);
    });
  });

  describe('AI assistance (improveObservation / suggestMeasuresForPrinciple / ForEvaluation)', () => {
    function buildAiEvaluation(overrides: AnyRecord = {}) {
      return {
        id: 'e1',
        organisation: ORG,
        status: 'IN_PROGRESS',
        profile: { country: 'EC' },
        template: {
          id: 't1',
          riskThreshold: 5,
          sections: [
            {
              id: 's1',
              number: 1,
              name: 'Principio 1',
              weight: 1,
              indicators: [
                {
                  id: 'i1',
                  code: 'VE-1.1',
                  name: 'KPI 1',
                  weight: 1,
                  active: true,
                },
                {
                  id: 'i2',
                  code: 'VE-1.2',
                  name: 'KPI 2',
                  weight: 1,
                  active: true,
                },
              ],
            },
            {
              id: 's2',
              number: 2,
              name: 'Principio 2',
              weight: 1,
              indicators: [
                {
                  id: 'i3',
                  code: 'VE-2.1',
                  name: 'KPI 3',
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
            score: 2,
            observation: 'obs1',
            indicator: { code: 'VE-1.1', name: 'KPI 1' },
          },
          {
            indicatorId: 'i2',
            score: 4,
            observation: 'obs2',
            indicator: { code: 'VE-1.2', name: 'KPI 2' },
          },
        ],
        sectionScores: null,
        globalScore: null,
        ...overrides,
      };
    }

    it('improveObservation reads the indicator from the template and delegates to the AI service', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation(),
      );

      const result = await service.improveObservation(ORG, 'e1', 'i1', {
        score: 2,
        observation: 'obs original',
      });

      expect(result).toEqual({ improved: 'texto mejorado' });
      expect(ai.improveObservation).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'VE-1.1', name: 'KPI 1' }),
        2,
        'obs original',
      );
    });

    it('improveObservation throws NotFoundException for an indicator not in this evaluation template', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation(),
      );

      await expect(
        service.improveObservation(ORG, 'e1', 'unknown', {
          score: 2,
          observation: 'obs',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('suggestMeasuresForPrinciple only sends NON_NEGLIGIBLE risks without a measure from the requested principle', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation(),
      );
      prisma.assessmentRisk.findMany.mockResolvedValue([
        {
          id: 'r1',
          indicatorId: 'i1',
          description: 'riesgo 1',
          riskType: 'Legal',
          class: 'NON_NEGLIGIBLE',
          measures: [],
        },
        {
          id: 'r2',
          indicatorId: 'i2',
          description: 'riesgo 2 ya cubierto',
          riskType: null,
          class: 'NON_NEGLIGIBLE',
          measures: [{ id: 'm1' }],
        },
      ]);
      ai.suggestMeasuresForPrinciple.mockResolvedValue([
        { indicatorId: 'i1', description: 'Mitigar riesgo 1' },
      ]);

      const result = await service.suggestMeasuresForSection(ORG, 'e1', 1);

      expect(ai.suggestMeasuresForPrinciple).toHaveBeenCalledWith(
        'Principio 1',
        [
          expect.objectContaining({
            indicatorId: 'i1',
            riskDescription: 'riesgo 1',
          }),
        ],
      );
      expect(result).toEqual({
        suggestions: [
          { indicatorId: 'i1', description: 'Mitigar riesgo 1', riskId: 'r1' },
        ],
      });
    });

    it('suggestMeasuresForPrinciple throws NotFoundException for an unknown principle number', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation(),
      );

      await expect(
        service.suggestMeasuresForSection(ORG, 'e1', 99),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('suggestMeasuresForEvaluation calls the AI once per principle with pending risks, skips principles with none, and returns results sorted by priority', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation(),
      );
      // Una sola consulta para toda la evaluación: el principio 2 no tiene
      // riesgos pendientes, así que la IA solo se llama para el principio 1.
      prisma.assessmentRisk.findMany.mockResolvedValue([
        {
          id: 'r1',
          indicatorId: 'i1',
          description: 'riesgo bajo',
          riskType: null,
          class: 'NON_NEGLIGIBLE',
          measures: [],
        },
      ]);

      ai.suggestMeasuresForPrinciple.mockResolvedValueOnce([
        { indicatorId: 'i1', description: 'Mitigar riesgo bajo' },
      ]);

      const result = await service.suggestMeasuresForEvaluation(ORG, 'e1');

      expect(ai.suggestMeasuresForPrinciple).toHaveBeenCalledTimes(1);
      expect(result.suggestions).toEqual([
        expect.objectContaining({
          indicatorId: 'i1',
          riskId: 'r1',
          sectionNumber: 1,
          score: 2,
        }),
      ]);
    });

    it('suggestMeasuresForEvaluation makes no AI call when there are no risks without a measure', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation(),
      );
      prisma.assessmentRisk.findMany.mockResolvedValue([]);

      const result = await service.suggestMeasuresForEvaluation(ORG, 'e1');

      expect(ai.suggestMeasuresForPrinciple).not.toHaveBeenCalled();
      expect(result).toEqual({ suggestions: [] });
    });

    it('suggestMeasuresForEvaluation orders by impactScore (weight × brecha bajo el umbral), not by score alone', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation({
          template: {
            id: 't1',
            riskThreshold: 5,
            sections: [
              {
                id: 's1',
                number: 1,
                name: 'Principio 1',
                weight: 1,
                indicators: [
                  {
                    id: 'i1',
                    code: 'VE-1.1',
                    name: 'KPI 1',
                    weight: 1,
                    active: true,
                  },
                  {
                    id: 'i2',
                    code: 'VE-1.2',
                    name: 'KPI 2',
                    weight: 4,
                    active: true,
                  },
                ],
              },
            ],
          },
        }),
      );
      prisma.assessmentRisk.findMany.mockResolvedValue([
        {
          id: 'r1',
          indicatorId: 'i1',
          description: 'riesgo con score muy bajo',
          riskType: null,
          class: 'NON_NEGLIGIBLE',
          measures: [],
        },
        {
          id: 'r2',
          indicatorId: 'i2',
          description: 'riesgo con score moderado pero peso alto',
          riskType: null,
          class: 'NON_NEGLIGIBLE',
          measures: [],
        },
      ]);
      ai.suggestMeasuresForPrinciple.mockResolvedValue([
        { indicatorId: 'i1', description: 'Mitigar 1' },
        { indicatorId: 'i2', description: 'Mitigar 2' },
      ]);

      const result = await service.suggestMeasuresForEvaluation(ORG, 'e1');

      // i1: score 2, peso 1 → impactScore = 1*(5-2) = 3
      // i2: score 4, peso 4 → impactScore = 4*(5-4) = 4 (mayor peso gana pese a score más alto)
      expect(result.suggestions.map((s) => s.indicatorId)).toEqual([
        'i2',
        'i1',
      ]);
      expect(result.suggestions[0]).toMatchObject({
        indicatorId: 'i2',
        impactScore: 4,
      });
      expect(result.suggestions[1]).toMatchObject({
        indicatorId: 'i1',
        impactScore: 3,
      });
    });

    it('detectInconsistencies sends all answered KPI and resolves code/name for each finding', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation(),
      );
      ai.detectInconsistencies.mockResolvedValue([
        {
          indicatorIds: ['i1', 'i2'],
          description: 'Contradicción entre KPI 1 y KPI 2.',
        },
      ]);

      const result = await service.detectInconsistencies(ORG, 'e1');

      expect(ai.detectInconsistencies).toHaveBeenCalledWith([
        { indicatorId: 'i1', code: 'VE-1.1', score: 2, observation: 'obs1' },
        { indicatorId: 'i2', code: 'VE-1.2', score: 4, observation: 'obs2' },
      ]);
      expect(result).toEqual({
        findings: [
          {
            description: 'Contradicción entre KPI 1 y KPI 2.',
            indicators: [
              { indicatorId: 'i1', code: 'VE-1.1', name: 'KPI 1' },
              { indicatorId: 'i2', code: 'VE-1.2', name: 'KPI 2' },
            ],
          },
        ],
      });
    });

    it('generateExecutiveNarrative builds a lightweight context (no full observations) and forwards the tone', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue(
        buildAiEvaluation(),
      );

      const result = await service.generateExecutiveNarrative(ORG, 'e1', {
        tone: 'formal',
      });

      expect(ai.generateExecutiveNarrative).toHaveBeenCalledWith(
        expect.any(Object),
        'formal',
      );
      expect(result).toEqual({ narrative: 'narrativa generada' });
    });
  });

  describe('mitigationPlanExportPptx', () => {
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
          profile: { country: 'EC', name: 'Cooperativa Test' },
        }),
      );
      prisma.assessmentRisk.findMany.mockResolvedValue([
        {
          indicatorId: 'i1',
          class: 'NON_NEGLIGIBLE',
          riskType: 'Legal',
          description: 'riesgo de prueba',
          measures: [{ status: 'PENDING' }],
        },
        {
          indicatorId: 'i2',
          class: 'NEGLIGIBLE',
          riskType: null,
          description: 'riesgo controlado',
          measures: [],
        },
      ]);

      const result = await service.mitigationPlanExportPptx(
        ORG,
        'e1',
        'Narrativa de prueba',
      );

      expect(result.filename).toBe('reporte-risk-e1.pptx');
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
        buildEvaluation({
          profile: { country: 'EC', name: 'Cooperativa Test' },
        }),
      );
      prisma.assessmentRisk.findMany.mockResolvedValue([]);
      ai.generateReportInsights.mockRejectedValueOnce(
        new Error('AI unavailable'),
      );

      const result = await service.mitigationPlanExportPptx(ORG, 'e1');

      expect(result.filename).toBe('reporte-risk-e1.pptx');
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });
});
