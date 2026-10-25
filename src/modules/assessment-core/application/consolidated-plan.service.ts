import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

/**
 * Alcance del Gantt que se pide al exportar el reporte:
 * - `tool`: solo el plan de la evaluación que se está exportando.
 * - `organisation`: las tres herramientas de esa organización evaluada.
 * - `project`: todas las organizaciones del proyecto.
 */
export type ConsolidatedPlanScope = 'tool' | 'organisation' | 'project';

export const CONSOLIDATED_PLAN_SCOPES: ConsolidatedPlanScope[] = [
  'tool',
  'organisation',
  'project',
];

export interface ConsolidatedMeasure {
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  progressPct: number;
  /** Herramienta u organización de la que viene, para agrupar en el Gantt. */
  group: string;
}

/** Una medida del plan de una organización, venga de la herramienta que venga. */
export interface ProfilePlanMeasure {
  id: string;
  tool: 'ORGANIZATIONAL' | 'CAPACITY' | 'RISK';
  evaluationId: string;
  evaluationStartedAt: Date;
  indicatorCode: string;
  indicatorName: string;
  title: string;
  responsible: string;
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  progressPct: number;
  appliedImprovements: string | null;
  verificationLink: string | null;
}

const TOOL_LABEL: Record<string, string> = {
  ORGANIZATIONAL: 'Organizativa',
  CAPACITY: 'Capacidades',
  RISK: 'Riesgos',
};

/**
 * Reúne el plan de acción de varias evaluaciones en una sola lista para el
 * Gantt del reporte.
 *
 * Las medidas viven en dos tablas y no se pueden unir en SQL: las de KPI
 * (Organizativa y Capacidades) cuelgan de la evaluación, y las de mitigación
 * (Riesgos) cuelgan del riesgo. Aquí se leen las dos y se normalizan a la
 * misma forma — `startWeek` de las de riesgo es su fecha de inicio.
 */
@Injectable()
export class ConsolidatedPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async measures(
    organisation: string,
    filter: { profileId?: string; groupBy: 'tool' | 'profile' },
  ): Promise<ConsolidatedMeasure[]> {
    const evaluation = {
      deletedAt: null,
      organisation,
      ...(filter.profileId ? { profileId: filter.profileId } : {}),
    };
    const evaluationLabels = {
      profile: { select: { name: true } },
      template: { select: { tool: true } },
    } as const;

    const [indicatorMeasures, mitigationMeasures] = await Promise.all([
      this.prisma.assessmentIndicatorMeasure.findMany({
        where: { organisation, deletedAt: null, evaluation },
        select: {
          name: true,
          startDate: true,
          endDate: true,
          status: true,
          progressPct: true,
          evaluation: { select: evaluationLabels },
        },
      }),
      this.prisma.assessmentMitigationMeasure.findMany({
        where: { deletedAt: null, risk: { evaluation } },
        select: {
          description: true,
          startWeek: true,
          endDate: true,
          status: true,
          progressPct: true,
          risk: { select: { evaluation: { select: evaluationLabels } } },
        },
      }),
    ]);

    const label = (source: {
      profile: { name: string };
      template: { tool: string };
    }): string =>
      filter.groupBy === 'tool'
        ? (TOOL_LABEL[source.template.tool] ?? source.template.tool)
        : source.profile.name;

    const rows: ConsolidatedMeasure[] = [
      ...indicatorMeasures.map((m) => ({
        name: m.name,
        startDate: m.startDate,
        endDate: m.endDate,
        status: m.status,
        progressPct: m.progressPct,
        group: label(m.evaluation),
      })),
      ...mitigationMeasures.map((m) => ({
        name: m.description,
        startDate: m.startWeek,
        endDate: m.endDate,
        status: m.status,
        progressPct: m.progressPct,
        group: label(m.risk.evaluation),
      })),
    ];

    // El Gantt se lee en orden cronológico y, dentro de una misma fecha,
    // agrupado para que las barras del mismo origen queden juntas.
    return rows.sort(
      (a, b) =>
        a.startDate.getTime() - b.startDate.getTime() ||
        a.group.localeCompare(b.group) ||
        a.name.localeCompare(b.name),
    );
  }

  /**
   * Plan de acción completo de una organización evaluada: las medidas de las
   * tres herramientas, de todas sus evaluaciones, con lo necesario para verlas
   * juntas (KPI de origen, responsable, avance y lo implementado). Solo lee.
   *
   * Las medidas de riesgo no guardan el KPI: cuelgan del riesgo, que guarda
   * el id del indicador, así que los códigos se buscan aparte.
   */
  async profilePlan(
    organisation: string,
    profileId: string,
  ): Promise<ProfilePlanMeasure[]> {
    const evaluation = { deletedAt: null, organisation, profileId };
    const evaluationFields = {
      id: true,
      startedAt: true,
      template: { select: { tool: true } },
    } as const;

    const [indicatorMeasures, mitigationMeasures] = await Promise.all([
      this.prisma.assessmentIndicatorMeasure.findMany({
        where: { organisation, deletedAt: null, evaluation },
        select: {
          id: true,
          name: true,
          responsible: true,
          startDate: true,
          endDate: true,
          status: true,
          progressPct: true,
          appliedImprovements: true,
          verificationLink: true,
          indicator: { select: { code: true, name: true } },
          evaluation: { select: evaluationFields },
        },
      }),
      this.prisma.assessmentMitigationMeasure.findMany({
        where: { deletedAt: null, risk: { evaluation } },
        select: {
          id: true,
          description: true,
          responsible: true,
          startWeek: true,
          endDate: true,
          status: true,
          progressPct: true,
          appliedImprovements: true,
          verificationLink: true,
          risk: {
            select: {
              indicatorId: true,
              evaluation: { select: evaluationFields },
            },
          },
        },
      }),
    ]);

    const riskIndicatorIds = [
      ...new Set(mitigationMeasures.map((m) => m.risk.indicatorId)),
    ];
    const riskIndicators =
      riskIndicatorIds.length === 0
        ? []
        : await this.prisma.assessmentIndicator.findMany({
            where: { id: { in: riskIndicatorIds } },
            select: { id: true, code: true, name: true },
          });
    const indicatorById = new Map(riskIndicators.map((i) => [i.id, i]));

    const rows: ProfilePlanMeasure[] = [
      ...indicatorMeasures.map((m) => ({
        id: m.id,
        tool: m.evaluation.template.tool as ProfilePlanMeasure['tool'],
        evaluationId: m.evaluation.id,
        evaluationStartedAt: m.evaluation.startedAt,
        indicatorCode: m.indicator.code,
        indicatorName: m.indicator.name,
        title: m.name,
        responsible: m.responsible,
        startDate: m.startDate,
        endDate: m.endDate,
        status: m.status,
        progressPct: m.progressPct,
        appliedImprovements: m.appliedImprovements,
        verificationLink: m.verificationLink,
      })),
      ...mitigationMeasures.map((m) => {
        const indicator = indicatorById.get(m.risk.indicatorId);
        return {
          id: m.id,
          tool: 'RISK' as const,
          evaluationId: m.risk.evaluation.id,
          evaluationStartedAt: m.risk.evaluation.startedAt,
          indicatorCode: indicator?.code ?? '',
          indicatorName: indicator?.name ?? '',
          title: m.description,
          responsible: m.responsible,
          startDate: m.startWeek,
          endDate: m.endDate,
          status: m.status,
          progressPct: m.progressPct,
          appliedImprovements: m.appliedImprovements,
          verificationLink: m.verificationLink,
        };
      }),
    ];

    const toolOrder = ['ORGANIZATIONAL', 'CAPACITY', 'RISK'];
    return rows.sort(
      (a, b) =>
        toolOrder.indexOf(a.tool) - toolOrder.indexOf(b.tool) ||
        b.evaluationStartedAt.getTime() - a.evaluationStartedAt.getTime() ||
        a.startDate.getTime() - b.startDate.getTime() ||
        a.indicatorCode.localeCompare(b.indicatorCode, 'es', {
          numeric: true,
        }),
    );
  }

  /**
   * Resuelve el Gantt del reporte para un alcance dado. Devuelve `undefined`
   * en `tool` para que cada herramienta siga dibujando el suyo, que ya tiene
   * el detalle medida a medida.
   *
   * En los alcances mayores no se dibuja una barra por medida: un proyecto
   * con cuatrocientas medidas daría setenta láminas y dejaría de ser una
   * vista consolidada. Se agrega una barra por grupo —herramienta u
   * organización— que abarca desde el inicio más temprano hasta el fin más
   * tardío de su plan, con el avance promedio.
   */
  async gantt(
    organisation: string,
    scope: ConsolidatedPlanScope,
    profileId: string,
  ): Promise<
    | {
        title: string;
        nameHeader: string;
        measures: Array<{
          name: string;
          detail: string;
          startDate: Date;
          endDate: Date;
          status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
          progressPct: number;
        }>;
      }
    | undefined
  > {
    if (scope === 'tool') return undefined;
    const byOrganisation = scope === 'organisation';
    const rows = await this.measures(organisation, {
      profileId: byOrganisation ? profileId : undefined,
      groupBy: byOrganisation ? 'tool' : 'profile',
    });

    const groups = new Map<string, ConsolidatedMeasure[]>();
    for (const row of rows) {
      const list = groups.get(row.group) ?? [];
      list.push(row);
      groups.set(row.group, list);
    }

    return {
      title: byOrganisation
        ? 'Plan de Acción Consolidado — las tres herramientas'
        : 'Plan de Acción Consolidado — todo el proyecto',
      nameHeader: byOrganisation ? 'Herramienta' : 'Organización',
      measures: [...groups.entries()]
        .map(([group, list]) => {
          const done = list.filter((m) => m.status === 'DONE').length;
          const started = list.filter((m) => m.status !== 'PENDING').length;
          return {
            name: group,
            detail: `${list.length} ${list.length === 1 ? 'medida' : 'medidas'}`,
            startDate: new Date(
              Math.min(...list.map((m) => m.startDate.getTime())),
            ),
            endDate: new Date(
              Math.max(...list.map((m) => m.endDate.getTime())),
            ),
            status:
              done === list.length
                ? ('DONE' as const)
                : started === 0
                  ? ('PENDING' as const)
                  : ('IN_PROGRESS' as const),
            progressPct: Math.round(
              list.reduce((sum, m) => sum + m.progressPct, 0) / list.length,
            ),
          };
        })
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    };
  }
}
