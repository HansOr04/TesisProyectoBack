import { AssessmentDashboardService } from './assessment-dashboard.service';
import { AssessmentApplicabilityService } from './assessment-applicability.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

type AnyRecord = Record<string, any>;

const ORG = 'mh';

function baseTemplate() {
  return {
    sections: [
      {
        id: 'sec1',
        weight: 1,
        indicators: [
          { id: 'ind1', weight: 5, active: true },
          { id: 'ind2', weight: 5, active: true },
        ],
      },
    ],
  };
}

function createApplicabilityMock() {
  const emptyFor = async (ids: string[]) =>
    new Map(ids.map((id) => [id, new Set<string>()]));
  return {
    resolveExcludedSectionIdsForProfiles: jest.fn(emptyFor),
    resolveExcludedIndicatorIdsForProfiles: jest.fn(emptyFor),
  } as AnyRecord;
}

// El servicio pide la lista de evaluaciones por herramienta (findMany) y toma
// la más reciente por perfil; este helper convierte "una evaluación por
// herramienta" (como se expresaban los casos) en esa lista.
function mockEvaluations(
  prisma: AnyRecord,
  byTool: (tool: string) => AnyRecord | null,
  profileId = 'p1',
) {
  prisma.assessmentEvaluation.findMany.mockImplementation(
    async ({ where }: AnyRecord) => {
      const ev = byTool(where.template.tool);
      return ev ? [{ profileId, risks: [], ...ev }] : [];
    },
  );
}

describe('AssessmentDashboardService', () => {
  let prisma: AnyRecord;
  let applicability: AnyRecord;
  let service: AssessmentDashboardService;

  const profile1 = {
    id: 'p1',
    name: 'Cooperativa A',
    country: 'EC',
    region: 'Costa',
    mainProduct: 'cacao',
  };

  beforeEach(() => {
    applicability = createApplicabilityMock();
    prisma = {
      assessmentOrganisationProfile: { findMany: jest.fn() },
      assessmentEvaluation: { findMany: jest.fn().mockResolvedValue([]) },
      assessmentIndicatorMeasure: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new AssessmentDashboardService(
      prisma as unknown as PrismaService,
      applicability as unknown as AssessmentApplicabilityService,
    );
  });

  it('returns one row per profile with a null tool summary when no evaluation exists', async () => {
    prisma.assessmentOrganisationProfile.findMany.mockResolvedValue([profile1]);
    prisma.assessmentEvaluation.findMany.mockResolvedValue([]);

    const rows = await service.getDashboard(ORG, {}, {});

    expect(rows).toHaveLength(1);
    expect(rows[0].profile.name).toBe('Cooperativa A');
    expect(rows[0].organizational).toBeNull();
    expect(rows[0].capacity).toBeNull();
    expect(rows[0].risk).toBeNull();
    expect(rows[0].criticalAlertCount).toBe(0);
  });

  it('passes country/region filters and evaluator scope into the profile query', async () => {
    prisma.assessmentOrganisationProfile.findMany.mockResolvedValue([]);

    await service.getDashboard(
      ORG,
      { country: 'EC', region: 'Costa' },
      { evaluatorId: 'user-1' },
    );

    expect(prisma.assessmentOrganisationProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organisation: ORG,
          country: 'EC',
          region: 'Costa',
          evaluatorId: 'user-1',
        }),
      }),
    );
  });

  it('computes globalScore and an unaddressed-critical-KPI alert for Organizational', async () => {
    prisma.assessmentOrganisationProfile.findMany.mockResolvedValue([profile1]);
    mockEvaluations(prisma, (tool) =>
      tool !== 'ORGANIZATIONAL'
        ? null
        : {
            id: 'ev1',
            status: 'IN_PROGRESS',
            startedAt: new Date('2026-01-01'),
            template: baseTemplate(),
            responses: [
              { indicatorId: 'ind1', score: 3, isCritical: true },
              { indicatorId: 'ind2', score: 9, isCritical: false },
            ],
          },
    );
    prisma.assessmentIndicatorMeasure.findMany.mockResolvedValue([]);

    const rows = await service.getDashboard(ORG, {}, {});

    expect(rows[0].organizational).toEqual(
      expect.objectContaining({
        evaluationId: 'ev1',
        status: 'IN_PROGRESS',
        globalScore: 6, // weighted avg of 3 and 9, equal weight
        criticalAlertCount: 1, // ind1 is critical and has no measure
      }),
    );
    expect(rows[0].criticalAlertCount).toBe(1);
  });

  it('does not count a critical Organizational KPI that already has a measure', async () => {
    prisma.assessmentOrganisationProfile.findMany.mockResolvedValue([profile1]);
    mockEvaluations(prisma, (tool) =>
      tool !== 'ORGANIZATIONAL'
        ? null
        : {
            id: 'ev1',
            status: 'IN_PROGRESS',
            startedAt: new Date('2026-01-01'),
            template: baseTemplate(),
            responses: [{ indicatorId: 'ind1', score: 3, isCritical: true }],
          },
    );
    prisma.assessmentIndicatorMeasure.findMany.mockResolvedValue([
      { evaluationId: 'ev1', indicatorId: 'ind1' },
    ]);

    const rows = await service.getDashboard(ORG, {}, {});

    expect(rows[0].organizational?.criticalAlertCount).toBe(0);
  });

  it('counts a NON_NEGLIGIBLE Risk risk without a measure as a critical alert', async () => {
    prisma.assessmentOrganisationProfile.findMany.mockResolvedValue([profile1]);
    mockEvaluations(prisma, (tool) =>
      tool !== 'RISK'
        ? null
        : {
            id: 'ev-risk',
            status: 'COMPLETED',
            startedAt: new Date('2026-01-01'),
            template: baseTemplate(),
            responses: [],
            risks: [
              { class: 'NON_NEGLIGIBLE', measures: [] },
              { class: 'NON_NEGLIGIBLE', measures: [{ id: 'm1' }] },
              { class: 'NEGLIGIBLE', measures: [] },
            ],
          },
    );

    const rows = await service.getDashboard(ORG, {}, {});

    expect(rows[0].risk?.criticalAlertCount).toBe(1);
  });

  it('filters out profiles where the requested tool has no evaluation', async () => {
    prisma.assessmentOrganisationProfile.findMany.mockResolvedValue([profile1]);
    prisma.assessmentEvaluation.findMany.mockResolvedValue([]);

    const rows = await service.getDashboard(ORG, { tool: 'RISK' }, {});

    expect(rows).toHaveLength(0);
  });

  it('filters by status across the 3 tools', async () => {
    prisma.assessmentOrganisationProfile.findMany.mockResolvedValue([profile1]);
    mockEvaluations(prisma, (tool) =>
      tool !== 'ORGANIZATIONAL'
        ? null
        : {
            id: 'ev1',
            status: 'COMPLETED',
            startedAt: new Date('2026-01-01'),
            template: { sections: [] },
            responses: [],
          },
    );

    const matching = await service.getDashboard(
      ORG,
      { status: 'COMPLETED' },
      {},
    );
    expect(matching).toHaveLength(1);

    const nonMatching = await service.getDashboard(
      ORG,
      { status: 'DRAFT' },
      {},
    );
    expect(nonMatching).toHaveLength(0);
  });

  it('filters by date range across the 3 tools', async () => {
    prisma.assessmentOrganisationProfile.findMany.mockResolvedValue([profile1]);
    mockEvaluations(prisma, (tool) =>
      tool !== 'ORGANIZATIONAL'
        ? null
        : {
            id: 'ev1',
            status: 'IN_PROGRESS',
            startedAt: new Date('2026-06-15'),
            template: { sections: [] },
            responses: [],
          },
    );

    const inRange = await service.getDashboard(
      ORG,
      { from: '2026-06-01', to: '2026-06-30' },
      {},
    );
    expect(inRange).toHaveLength(1);

    const outOfRange = await service.getDashboard(
      ORG,
      { from: '2026-07-01', to: '2026-07-31' },
      {},
    );
    expect(outOfRange).toHaveLength(0);
  });
});
