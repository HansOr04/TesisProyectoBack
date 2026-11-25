import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AssessmentApplicabilityService } from '../../assessment-core/application/assessment-applicability.service';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { ConsolidatedPlanService } from '../../assessment-core/application/consolidated-plan.service';
import { AssessmentSessionGateway } from '../../assessment-session/infrastructure/assessment-session.gateway';
import { CapacityToolAiService } from '../../capacity-tool/application/capacity-tool-ai.service';
import { CapacityToolService } from '../../capacity-tool/application/capacity-tool.service';
import { OrganizationalToolAiService } from '../../organizational-tool/application/organizational-tool-ai.service';
import { OrganizationalToolService } from '../../organizational-tool/application/organizational-tool.service';
import { RiskToolAiService } from '../../risk-tool/application/risk-tool-ai.service';
import { RiskToolService } from '../../risk-tool/application/risk-tool.service';
import { PrismaRiskRepository } from '../../risk-tool/infrastructure/persistence/prisma-risk.repository';
import { PrismaEvaluationRepository } from '../infrastructure/persistence/prisma-evaluation.repository';
import { PrismaIndicatorMeasureRepository } from '../infrastructure/persistence/prisma-indicator-measure.repository';
import { PrismaTemplateRepository } from '../infrastructure/persistence/prisma-template.repository';

type AnyRecord = Record<string, any>;

const ORG = 'mh';
const KPIS_PER_SECTION = 10;

const profile = (id: string, extra: AnyRecord = {}) => ({
  id,
  type: 'COMPANY',
  associationLevel: null,
  parentProfileId: null,
  ...extra,
});

/** Una sección por nota; null = sección sin calificar. Todos sus KPI iguales. */
function evaluationOf(
  profileId: string,
  scores: (number | null)[],
  extra: AnyRecord = {},
) {
  const sections = scores.map((_, s) => ({
    id: `s${s + 1}`,
    number: s + 1,
    name: `Sección ${s + 1}`,
    weight: 1,
    indicators: Array.from({ length: KPIS_PER_SECTION }, (_unused, i) => ({
      id: `s${s + 1}-i${i + 1}`,
      weight: 1,
      active: true,
    })),
  }));
  const responses = scores.flatMap((score, s) =>
    score === null
      ? []
      : sections[s].indicators.map((i) => ({
          indicatorId: i.id,
          score,
          isCritical: score <= 5,
        })),
  );
  return {
    id: `e-${profileId}`,
    profileId,
    status: 'IN_PROGRESS',
    template: { sections },
    responses,
    sectionScores: null,
    globalScore: null,
    ...extra,
  };
}

describe('organisationsOverview: críticos del panel', () => {
  let prisma: AnyRecord;

  beforeEach(() => {
    prisma = {
      assessmentOrganisationProfile: { findMany: jest.fn() },
      assessmentEvaluation: { findMany: jest.fn() },
      assessmentRisk: { findMany: jest.fn() },
    };
  });

  const applicability = {
    resolveExcludedIndicatorIdsForProfiles: jest
      .fn()
      .mockResolvedValue(new Map()),
  } as unknown as AssessmentApplicabilityService;
  const audit = { record: jest.fn() } as unknown as AssessmentAuditService;
  const gateway = {} as AssessmentSessionGateway;

  const db = () => prisma as unknown as PrismaService;
  const createOrganizational = () =>
    new OrganizationalToolService(
      new PrismaTemplateRepository(db(), audit),
      new PrismaEvaluationRepository(db()),
      new PrismaIndicatorMeasureRepository(db()),
      new ConsolidatedPlanService(db()),
      audit,
      {} as OrganizationalToolAiService,
      applicability,
      gateway,
    );
  const createCapacity = () =>
    new CapacityToolService(
      new PrismaTemplateRepository(db(), audit),
      new PrismaEvaluationRepository(db()),
      new PrismaIndicatorMeasureRepository(db()),
      new ConsolidatedPlanService(db()),
      audit,
      {} as CapacityToolAiService,
      applicability,
      gateway,
    );
  const createRisk = () =>
    new RiskToolService(
      new PrismaTemplateRepository(db(), audit),
      new PrismaEvaluationRepository(db()),
      new PrismaRiskRepository(db()),
      new ConsolidatedPlanService(db()),
      audit,
      {} as RiskToolAiService,
      applicability,
      gateway,
    );

  function givenData(
    profiles: AnyRecord[],
    evaluations: AnyRecord[],
    children: AnyRecord[] = [],
  ) {
    prisma.assessmentOrganisationProfile.findMany.mockImplementation(
      ({ where }: AnyRecord) =>
        Promise.resolve(where.parentProfileId === null ? profiles : children),
    );
    prisma.assessmentEvaluation.findMany.mockResolvedValue(evaluations);
  }

  describe.each([
    ['Organizativa', createOrganizational],
    ['Capacidades', createCapacity],
  ])('Herramienta %s', (_name, create) => {
    it('cuenta secciones críticas, no los KPI críticos que contienen', async () => {
      givenData(
        [profile('p1'), profile('p2')],
        [
          evaluationOf('p1', [3, 4, 5, 6, 8, 9]),
          evaluationOf('p2', [2, 9, 9, 9, 9, 9]),
        ],
      );

      const overview = await create().organisationsOverview(ORG);

      // 4 secciones con promedio <= 5, aunque sean 40 KPI críticos.
      expect(overview.totalCritical).toBe(4);
      expect(overview.organisations.map((o) => o.criticalCount)).toEqual([
        3, 1,
      ]);
    });

    it('no cuenta una sección con algún KPI crítico y buen promedio', async () => {
      const evaluation = evaluationOf('p1', [9]);
      evaluation.responses[0] = {
        ...evaluation.responses[0],
        score: 2,
        isCritical: true,
      };
      givenData([profile('p1')], [evaluation]);

      const overview = await create().organisationsOverview(ORG);

      expect(overview.totalCritical).toBe(0);
    });

    it('no cuenta las secciones sin calificar ni las organizaciones sin evaluación', async () => {
      givenData(
        [profile('p1'), profile('p2')],
        [evaluationOf('p1', [4, null, null])],
      );

      const overview = await create().organisationsOverview(ORG);

      expect(overview.totalCritical).toBe(1);
      expect(overview.organisations[1].criticalCount).toBe(0);
    });

    it('usa los puntajes guardados de una evaluación completada', async () => {
      const section = (number: number, weightedAvg: number) => ({
        sectionId: `s${number}`,
        number,
        name: `Sección ${number}`,
        weight: 1,
        weightedAvg,
        critical: weightedAvg <= 5,
      });
      givenData(
        [profile('p1')],
        [
          evaluationOf('p1', [2, 2], {
            status: 'COMPLETED',
            sectionScores: [section(1, 4), section(2, 8)],
            globalScore: 6,
          }),
        ],
      );

      const overview = await create().organisationsOverview(ORG);

      expect(overview.totalCritical).toBe(1);
    });

    it('en una asociación consolidada cuenta las secciones de la fila, no las suma por miembro', async () => {
      const association = profile('a1', {
        type: 'ASSOCIATION',
        associationLevel: 'LEVEL_2',
      });
      givenData(
        [association],
        [
          // Promedios por sección: 4, 7 y 2 (la última sin nota en un miembro).
          evaluationOf('m1', [3, 5, 4]),
          evaluationOf('m2', [5, 9, null]),
        ],
        [
          profile('m1', { parentProfileId: 'a1' }),
          profile('m2', { parentProfileId: 'a1' }),
        ],
      );

      const overview = await create().organisationsOverview(ORG);

      const [row] = overview.organisations;
      expect(row.isConsolidated).toBe(true);
      expect(row.sectionScores.map((s) => s.critical)).toEqual([
        true,
        false,
        true,
      ]);
      expect(row.criticalCount).toBe(2);
      expect(overview.totalCritical).toBe(2);
    });

    it('no marca crítica una sección consolidada que ningún miembro calificó', async () => {
      givenData(
        [
          profile('a1', {
            type: 'ASSOCIATION',
            associationLevel: 'LEVEL_2',
          }),
        ],
        [evaluationOf('m1', [8, null])],
        [profile('m1', { parentProfileId: 'a1' })],
      );

      const overview = await create().organisationsOverview(ORG);

      expect(overview.totalCritical).toBe(0);
    });

    it('devuelve 0 cuando no hay organizaciones', async () => {
      givenData([], []);

      const overview = await create().organisationsOverview(ORG);

      expect(overview.totalCritical).toBe(0);
    });
  });

  describe('Herramienta de Riesgos', () => {
    it('cuenta los riesgos no despreciables sin medida', async () => {
      givenData(
        [profile('p1'), profile('p2')],
        [evaluationOf('p1', [3, 9]), evaluationOf('p2', [9, 9])],
      );
      prisma.assessmentRisk.findMany.mockResolvedValue([
        { evaluationId: 'e-p1', measures: [] },
        { evaluationId: 'e-p1', measures: [] },
        { evaluationId: 'e-p1', measures: [{ id: 'm1' }] },
      ]);

      const overview = await createRisk().organisationsOverview(ORG);

      expect(overview.organisations.map((o) => o.criticalCount)).toEqual([
        2, 0,
      ]);
      expect(overview.totalCritical).toBe(2);
    });

    it('en una asociación consolidada suma los riesgos de sus miembros', async () => {
      givenData(
        [
          profile('a1', {
            type: 'ASSOCIATION',
            associationLevel: 'LEVEL_2',
          }),
        ],
        [evaluationOf('m1', [3]), evaluationOf('m2', [3])],
        [
          profile('m1', { parentProfileId: 'a1' }),
          profile('m2', { parentProfileId: 'a1' }),
        ],
      );
      prisma.assessmentRisk.findMany.mockResolvedValue([
        { evaluationId: 'e-m1', measures: [] },
        { evaluationId: 'e-m2', measures: [] },
        { evaluationId: 'e-m2', measures: [] },
      ]);

      const overview = await createRisk().organisationsOverview(ORG);

      expect(overview.totalCritical).toBe(3);
    });
  });
});
