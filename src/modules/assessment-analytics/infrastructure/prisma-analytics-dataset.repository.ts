import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  ASSESSMENT_TOOLS,
  AssessmentToolCode,
} from '../../assessment-core/domain/assessment.constants';
import {
  OrganizationalStrategy,
  SectionScoreInput,
} from '../../assessment-core/domain/scoring.engine';
import {
  AnalyticsDataset,
  AnalyticsDatasetPort,
  AnalyticsEvaluation,
  AnalyticsMeasure,
  AnalyticsProfileScope,
  AnalyticsToolDataset,
} from '../domain/analytics.types';

// Adaptador Prisma → dataset neutro. Recalcula puntajes con la misma
// estrategia ponderada de las herramientas para que la analítica sea
// coherente con lo que ve el evaluador en cada resumen.
@Injectable()
export class PrismaAnalyticsDatasetRepository implements AnalyticsDatasetPort {
  private readonly strategy = new OrganizationalStrategy();

  constructor(private readonly prisma: PrismaService) {}

  async load(
    organisation: string,
    scope: AnalyticsProfileScope,
  ): Promise<AnalyticsDataset> {
    const profiles = await this.prisma.assessmentOrganisationProfile.findMany({
      where: { organisation, deletedAt: null, ...scope },
      select: {
        id: true,
        name: true,
        type: true,
        country: true,
        region: true,
        mainProduct: true,
        memberCount: true,
        yearStarted: true,
      },
      orderBy: { name: 'asc' },
    });
    const profileIds = profiles.map((p) => p.id);

    const evaluations = await this.prisma.assessmentEvaluation.findMany({
      where: { organisation, deletedAt: null, profileId: { in: profileIds } },
      include: {
        template: {
          include: {
            sections: {
              where: { deletedAt: null },
              orderBy: { number: 'asc' },
              include: { indicators: { where: { deletedAt: null } } },
            },
          },
        },
        responses: { include: { indicator: { include: { section: true } } } },
        indicatorMeasures: {
          where: { deletedAt: null },
          include: { indicator: true },
        },
        risks: { include: { measures: { where: { deletedAt: null } } } },
      },
      orderBy: { startedAt: 'asc' },
    });

    const tools = {} as Record<AssessmentToolCode, AnalyticsToolDataset>;
    for (const tool of ASSESSMENT_TOOLS) {
      const toolEvaluations = evaluations.filter(
        (e) => e.template.tool === tool,
      );
      // Estructura de referencia: la plantilla más reciente usada en el tenant.
      const referenceTemplate = toolEvaluations.length
        ? toolEvaluations[toolEvaluations.length - 1].template
        : await this.prisma.assessmentTemplate.findFirst({
            where: { organisation, tool, deletedAt: null },
            orderBy: { version: 'desc' },
            include: {
              sections: {
                where: { deletedAt: null },
                orderBy: { number: 'asc' },
                include: { indicators: { where: { deletedAt: null } } },
              },
            },
          });
      const sections = (referenceTemplate?.sections ?? []).map((s) => ({
        number: s.number,
        name: s.name,
        weight: Number(s.weight),
      }));
      const indicators = (referenceTemplate?.sections ?? []).flatMap((s) =>
        s.indicators.map((i) => ({
          code: i.code,
          name: i.name,
          sectionNumber: s.number,
          weight: Number(i.weight),
        })),
      );

      tools[tool] = {
        tool,
        sections,
        indicators,
        evaluations: toolEvaluations.map((e): AnalyticsEvaluation => {
          const responses = e.responses.map((r) => ({
            indicatorCode: r.indicator.code,
            sectionNumber: r.indicator.section.number,
            score: r.score,
          }));
          const scoreByIndicatorId = new Map(
            e.responses.map((r) => [r.indicatorId, r.score]),
          );
          const sectionInputs: SectionScoreInput[] = e.template.sections.map(
            (s) => ({
              sectionId: s.id,
              weight: Number(s.weight),
              indicators: s.indicators
                .filter((i) => i.active && scoreByIndicatorId.has(i.id))
                .map((i) => ({
                  weight: Number(i.weight),
                  score: scoreByIndicatorId.get(i.id) as number,
                })),
            }),
          );
          const sectionScores: Record<number, number> = {};
          for (const s of e.template.sections) {
            const input = sectionInputs.find((x) => x.sectionId === s.id);
            if (input && input.indicators.length > 0) {
              sectionScores[s.number] = this.strategy.sectionAverage(input);
            }
          }
          const scored = sectionInputs.filter((s) => s.indicators.length > 0);
          const globalScore =
            scored.length > 0 ? this.strategy.globalScore(scored) : null;

          const riskIndicatorById = new Map(
            e.risks.map((r) => [r.id, r.indicatorId]),
          );
          const indicatorCodeById = new Map(
            e.template.sections.flatMap((s) =>
              s.indicators.map((i) => [i.id, i.code] as const),
            ),
          );
          const measures: AnalyticsMeasure[] = [
            ...e.indicatorMeasures.map((m) => ({
              indicatorCode: m.indicator.code,
              status: m.status,
              progressPct: m.progressPct,
              createdAt: m.createdAt,
            })),
            ...e.risks.flatMap((r) =>
              r.measures.map((m) => ({
                indicatorCode:
                  indicatorCodeById.get(riskIndicatorById.get(r.id) ?? '') ??
                  '',
                status: m.status,
                progressPct: m.progressPct,
                createdAt: m.createdAt,
              })),
            ),
          ];

          return {
            id: e.id,
            tool,
            profileId: e.profileId,
            status: e.status,
            startedAt: e.startedAt,
            completedAt: e.completedAt,
            globalScore,
            sectionScores,
            responses,
            measures,
          };
        }),
      };
    }

    return { profiles, tools };
  }
}
