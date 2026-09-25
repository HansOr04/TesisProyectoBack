import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { OrganizationalStrategy } from '../domain/scoring.engine';
import { AssessmentApplicabilityService } from './assessment-applicability.service';
import { AssessmentProfileScope } from './assessment-access-scope.service';
import { DashboardFilterDto } from '../presentation/dto';

const TOOLS = ['ORGANIZATIONAL', 'CAPACITY', 'RISK'] as const;
type Tool = (typeof TOOLS)[number];

export interface AssessmentDashboardToolSummary {
  evaluationId: string;
  status: string;
  globalScore: number | null;
  startedAt: Date;
  criticalAlertCount: number;
}

export interface AssessmentDashboardRow {
  profile: {
    id: string;
    name: string;
    country: string;
    region: string | null;
    mainProduct: string;
  };
  organizational: AssessmentDashboardToolSummary | null;
  capacity: AssessmentDashboardToolSummary | null;
  risk: AssessmentDashboardToolSummary | null;
  criticalAlertCount: number;
}

const evaluationInclude = {
  template: {
    include: {
      sections: {
        where: { deletedAt: null },
        include: { indicators: { where: { deletedAt: null } } },
      },
    },
  },
  responses: true,
  risks: { include: { measures: { where: { deletedAt: null } } } },
} as const;

type EvaluationRow = {
  id: string;
  profileId: string;
  status: string;
  startedAt: Date;
  template: {
    tool: Tool;
    sections: {
      id: string;
      weight: unknown;
      indicators: { id: string; weight: unknown; active: boolean }[];
    }[];
  };
  responses: { indicatorId: string; score: number; isCritical: boolean }[];
  risks: { class: string; measures: unknown[] }[];
};

// Panel consolidado: una fila por organización con el estado de las 3
// herramientas. Consultas por lote (una por herramienta + una por tipo de
// exclusión + una por tipo de medida) en vez de N consultas por perfil, para
// que el coste no crezca con el número de organizaciones.
@Injectable()
export class AssessmentDashboardService {
  private readonly strategy = new OrganizationalStrategy();

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicabilityService: AssessmentApplicabilityService,
  ) {}

  async getDashboard(
    organisation: string,
    filters: DashboardFilterDto,
    scope: AssessmentProfileScope,
  ): Promise<AssessmentDashboardRow[]> {
    const profiles = await this.prisma.assessmentOrganisationProfile.findMany({
      where: {
        organisation,
        deletedAt: null,
        ...scope,
        ...(filters.country ? { country: filters.country } : {}),
        ...(filters.region ? { region: filters.region } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    const profileIds = profiles.map((p) => p.id);
    if (profileIds.length === 0) return [];

    // Última evaluación por perfil y herramienta, en una consulta por herramienta.
    const latestByTool = new Map<Tool, Map<string, EvaluationRow>>();
    await Promise.all(
      TOOLS.map(async (tool) => {
        const rows = (await this.prisma.assessmentEvaluation.findMany({
          where: {
            organisation,
            deletedAt: null,
            profileId: { in: profileIds },
            template: { tool },
          },
          orderBy: { createdAt: 'desc' },
          include: evaluationInclude,
        })) as unknown as EvaluationRow[];
        const byProfile = new Map<string, EvaluationRow>();
        for (const row of rows) {
          if (!byProfile.has(row.profileId)) byProfile.set(row.profileId, row);
        }
        latestByTool.set(tool, byProfile);
      }),
    );

    const [excludedSections, excludedIndicators] = await Promise.all([
      this.applicabilityService.resolveExcludedSectionIdsForProfiles(
        profileIds,
      ),
      this.applicabilityService.resolveExcludedIndicatorIdsForProfiles(
        profileIds,
      ),
    ]);

    const measuredByEvaluation = await this.loadMeasuredIndicators(
      [...(latestByTool.get('ORGANIZATIONAL')?.values() ?? [])].map(
        (e) => e.id,
      ),
      [...(latestByTool.get('CAPACITY')?.values() ?? [])].map((e) => e.id),
    );

    const rows = profiles.map((profile) => {
      const summaries = Object.fromEntries(
        TOOLS.map((tool) => {
          const evaluation = latestByTool.get(tool)?.get(profile.id);
          return [
            tool,
            evaluation
              ? this.summarize(
                  tool,
                  evaluation,
                  excludedSections.get(profile.id) ?? new Set(),
                  excludedIndicators.get(profile.id) ?? new Set(),
                  measuredByEvaluation.get(evaluation.id) ?? new Set(),
                )
              : null,
          ];
        }),
      ) as Record<Tool, AssessmentDashboardToolSummary | null>;
      const row: AssessmentDashboardRow = {
        profile: {
          id: profile.id,
          name: profile.name,
          country: profile.country,
          region: profile.region,
          mainProduct: profile.mainProduct,
        },
        organizational: summaries.ORGANIZATIONAL,
        capacity: summaries.CAPACITY,
        risk: summaries.RISK,
        criticalAlertCount:
          (summaries.ORGANIZATIONAL?.criticalAlertCount ?? 0) +
          (summaries.CAPACITY?.criticalAlertCount ?? 0) +
          (summaries.RISK?.criticalAlertCount ?? 0),
      };
      return row;
    });

    return rows.filter((row) => this.matchesFilters(row, filters));
  }

  private async loadMeasuredIndicators(
    organizationalEvaluationIds: string[],
    capacityEvaluationIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();
    const add = (rows: { evaluationId: string; indicatorId: string }[]) => {
      for (const m of rows) {
        if (!result.has(m.evaluationId)) result.set(m.evaluationId, new Set());
        result.get(m.evaluationId)!.add(m.indicatorId);
      }
    };
    const evaluationIds = [
      ...organizationalEvaluationIds,
      ...capacityEvaluationIds,
    ];
    if (evaluationIds.length > 0) {
      add(
        await this.prisma.assessmentIndicatorMeasure.findMany({
          where: { evaluationId: { in: evaluationIds }, deletedAt: null },
          select: { evaluationId: true, indicatorId: true },
        }),
      );
    }
    return result;
  }

  private summarize(
    tool: Tool,
    evaluation: EvaluationRow,
    excludedSectionIds: Set<string>,
    excludedIndicatorIds: Set<string>,
    measuredIndicatorIds: Set<string>,
  ): AssessmentDashboardToolSummary {
    const responseByIndicator = new Map(
      evaluation.responses.map((r) => [r.indicatorId, r]),
    );
    const sectionInputs = evaluation.template.sections
      .filter((s) => !excludedSectionIds.has(s.id))
      .map((section) => ({
        sectionId: section.id,
        weight: Number(section.weight),
        indicators: section.indicators
          .filter((i) => i.active && !excludedIndicatorIds.has(i.id))
          .map((i) => ({
            weight: Number(i.weight),
            score: responseByIndicator.get(i.id)?.score,
          }))
          .filter(
            (i): i is { weight: number; score: number } => i.score != null,
          ),
      }))
      .filter((s) => s.indicators.length > 0);

    const globalScore =
      sectionInputs.length > 0
        ? this.strategy.globalScore(sectionInputs)
        : null;

    const criticalAlertCount =
      tool === 'RISK'
        ? evaluation.risks.filter(
            (r) => r.class === 'NON_NEGLIGIBLE' && r.measures.length === 0,
          ).length
        : evaluation.responses.filter(
            (r) => r.isCritical && !measuredIndicatorIds.has(r.indicatorId),
          ).length;

    return {
      evaluationId: evaluation.id,
      status: evaluation.status,
      globalScore,
      startedAt: evaluation.startedAt,
      criticalAlertCount,
    };
  }

  private matchesFilters(
    row: AssessmentDashboardRow,
    filters: DashboardFilterDto,
  ): boolean {
    if (filters.tool) {
      const summary = row[filters.tool.toLowerCase() as Lowercase<Tool>];
      if (!summary) return false;
    }
    const summaries = [row.organizational, row.capacity, row.risk].filter(
      (s): s is AssessmentDashboardToolSummary => s !== null,
    );
    if (filters.status && !summaries.some((s) => s.status === filters.status))
      return false;
    if (filters.from || filters.to) {
      const from = filters.from ? new Date(filters.from) : null;
      const to = filters.to ? new Date(filters.to) : null;
      const matchesRange = summaries.some((s) => {
        if (from && s.startedAt < from) return false;
        if (to && s.startedAt > to) return false;
        return true;
      });
      if (!matchesRange) return false;
    }
    return true;
  }
}
