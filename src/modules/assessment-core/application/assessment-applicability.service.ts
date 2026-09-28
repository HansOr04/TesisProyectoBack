import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AssessmentToolCode } from '../domain/assessment.constants';
import { SetAssessmentProfileApplicabilityDto } from '../presentation/dto';
import { AssessmentAuditService } from './assessment-audit.service';

export interface AssessmentProfileApplicability {
  excludedSectionIds: string[];
  excludedIndicatorIds: string[];
}

// RF-02/03/04/05: aplicabilidad por organización — un perfil puede marcar
// secciones/indicadores completos como "no aplica" (p.ej. "aplica solo si la
// organización realiza aprovechamiento forestal"), independiente de la
// plantilla compartida por el resto de organizaciones del mismo tenant.
// No depende de AssessmentProfilesService a propósito: así puede añadirse como
// provider standalone en cada módulo de herramienta (Organizativa/Riesgos/Capacity) sin
// arrastrar el resto del grafo de AssessmentCoreModule.
@Injectable()
export class AssessmentApplicabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AssessmentAuditService,
  ) {}

  private async assertProfileExists(organisation: string, profileId: string) {
    const profile = await this.prisma.assessmentOrganisationProfile.findFirst({
      where: { id: profileId, organisation, deletedAt: null },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Assessment organisation profile not found');
    }
  }

  async get(
    organisation: string,
    profileId: string,
  ): Promise<AssessmentProfileApplicability> {
    await this.assertProfileExists(organisation, profileId);
    const [sectionExclusions, indicatorExclusions] = await Promise.all([
      this.prisma.assessmentProfileSectionExclusion.findMany({
        where: { profileId },
        select: { sectionId: true },
      }),
      this.prisma.assessmentProfileIndicatorExclusion.findMany({
        where: { profileId },
        select: { indicatorId: true },
      }),
    ]);
    return {
      excludedSectionIds: sectionExclusions.map((e) => e.sectionId),
      excludedIndicatorIds: indicatorExclusions.map((e) => e.indicatorId),
    };
  }

  async set(
    organisation: string,
    profileId: string,
    dto: SetAssessmentProfileApplicabilityDto,
    updatedBy?: string,
  ): Promise<AssessmentProfileApplicability> {
    await this.assertProfileExists(organisation, profileId);

    await this.prisma.$transaction([
      this.prisma.assessmentProfileSectionExclusion.deleteMany({
        where: { profileId },
      }),
      this.prisma.assessmentProfileIndicatorExclusion.deleteMany({
        where: { profileId },
      }),
      ...(dto.excludedSectionIds.length > 0
        ? [
            this.prisma.assessmentProfileSectionExclusion.createMany({
              data: dto.excludedSectionIds.map((sectionId) => ({
                profileId,
                sectionId,
                createdBy: updatedBy ?? 'unknown',
              })),
            }),
          ]
        : []),
      ...(dto.excludedIndicatorIds.length > 0
        ? [
            this.prisma.assessmentProfileIndicatorExclusion.createMany({
              data: dto.excludedIndicatorIds.map((indicatorId) => ({
                profileId,
                indicatorId,
                createdBy: updatedBy ?? 'unknown',
              })),
            }),
          ]
        : []),
    ]);

    await this.auditService.record(
      organisation,
      'assessment-profile.applicability-update',
      {
        profileId,
        excludedSectionCount: dto.excludedSectionIds.length,
        excludedIndicatorCount: dto.excludedIndicatorIds.length,
      },
      updatedBy,
    );

    return {
      excludedSectionIds: dto.excludedSectionIds,
      excludedIndicatorIds: dto.excludedIndicatorIds,
    };
  }

  /**
   * Las exclusiones se guardan por id de sección/indicador, pero cada versión
   * de plantilla crea filas nuevas con ids nuevos. Sin expandir, marcar "no
   * aplica" sobre la plantilla activa no tendría efecto en una evaluación que
   * corre sobre una versión anterior — que es justo lo que pasaba en
   * producción: TSAPAU evaluaba con la v1 y el diálogo editaba la v2.
   *
   * Lo que identifica de verdad a un KPI entre versiones es su código, y a
   * una sección su número. Se expande por ahí, acotado siempre a la misma
   * organización y herramienta: desde que los códigos son "KPI X.Y" en las
   * tres herramientas, sin acotar por herramienta excluir "KPI 1.1" en
   * Organizativa también lo excluiría en Capacidades y en Riesgos.
   */
  private async expandExclusions(
    profileIds: string[],
  ): Promise<
    Map<string, { sectionIds: Set<string>; indicatorIds: Set<string> }>
  > {
    const result = new Map(
      profileIds.map((id) => [
        id,
        { sectionIds: new Set<string>(), indicatorIds: new Set<string>() },
      ]),
    );
    if (profileIds.length === 0) return result;

    const templateOf = {
      select: { organisation: true, tool: true },
    } as const;
    const [sectionRows, indicatorRows] = await Promise.all([
      this.prisma.assessmentProfileSectionExclusion.findMany({
        where: { profileId: { in: profileIds } },
        select: {
          profileId: true,
          section: {
            select: { number: true, template: templateOf },
          },
        },
      }),
      this.prisma.assessmentProfileIndicatorExclusion.findMany({
        where: { profileId: { in: profileIds } },
        select: {
          profileId: true,
          indicator: {
            select: {
              code: true,
              section: { select: { template: templateOf } },
            },
          },
        },
      }),
    ]);
    if (sectionRows.length === 0 && indicatorRows.length === 0) return result;

    const key = (organisation: string, tool: string) =>
      `${organisation}|${tool}`;
    const numbersByScope = new Map<string, Set<number>>();
    const codesByScope = new Map<string, Set<string>>();
    const add = <T>(map: Map<string, Set<T>>, scope: string, value: T) => {
      const set = map.get(scope) ?? new Set<T>();
      set.add(value);
      map.set(scope, set);
    };
    for (const row of sectionRows) {
      const { organisation, tool } = row.section.template;
      add(numbersByScope, key(organisation, tool), row.section.number);
    }
    for (const row of indicatorRows) {
      const { organisation, tool } = row.indicator.section.template;
      add(codesByScope, key(organisation, tool), row.indicator.code);
    }

    const scopeFilter = (map: Map<string, Set<unknown>>) =>
      [...map.keys()].map((scope) => {
        const [organisation = '', tool = ''] = scope.split('|');
        return {
          organisation,
          tool: tool as AssessmentToolCode,
          deletedAt: null,
        };
      });

    // Todas las secciones/indicadores equivalentes, en cualquier versión.
    const [sections, indicators] = await Promise.all([
      numbersByScope.size === 0
        ? []
        : this.prisma.assessmentSection.findMany({
            where: {
              deletedAt: null,
              OR: scopeFilter(numbersByScope).map((scope) => ({
                template: { is: scope },
              })),
            },
            select: {
              id: true,
              number: true,
              template: templateOf,
              indicators: { where: { deletedAt: null }, select: { id: true } },
            },
          }),
      codesByScope.size === 0
        ? []
        : this.prisma.assessmentIndicator.findMany({
            where: {
              deletedAt: null,
              OR: scopeFilter(codesByScope).map((scope) => ({
                section: { is: { template: { is: scope } } },
              })),
            },
            select: {
              id: true,
              code: true,
              section: { select: { template: templateOf } },
            },
          }),
    ]);

    const sectionsByScopeNumber = new Map<string, typeof sections>();
    for (const section of sections) {
      const k = `${key(section.template.organisation, section.template.tool)}#${section.number}`;
      sectionsByScopeNumber.set(k, [
        ...(sectionsByScopeNumber.get(k) ?? []),
        section,
      ]);
    }
    const indicatorsByScopeCode = new Map<string, string[]>();
    for (const indicator of indicators) {
      const { organisation, tool } = indicator.section.template;
      const k = `${key(organisation, tool)}#${indicator.code}`;
      indicatorsByScopeCode.set(k, [
        ...(indicatorsByScopeCode.get(k) ?? []),
        indicator.id,
      ]);
    }

    for (const row of sectionRows) {
      const target = result.get(row.profileId);
      if (!target) continue;
      const { organisation, tool } = row.section.template;
      for (const section of sectionsByScopeNumber.get(
        `${key(organisation, tool)}#${row.section.number}`,
      ) ?? []) {
        target.sectionIds.add(section.id);
        for (const indicator of section.indicators) {
          target.indicatorIds.add(indicator.id);
        }
      }
    }
    for (const row of indicatorRows) {
      const target = result.get(row.profileId);
      if (!target) continue;
      const { organisation, tool } = row.indicator.section.template;
      for (const id of indicatorsByScopeCode.get(
        `${key(organisation, tool)}#${row.indicator.code}`,
      ) ?? []) {
        target.indicatorIds.add(id);
      }
    }
    return result;
  }

  // Usado por los servicios de scoring de cada herramienta: expande la
  // exclusión por sección (todos sus indicadores) + la exclusión directa por
  // indicador en un único Set de indicatorId no aplicables para el perfil.
  async resolveExcludedIndicatorIds(profileId: string): Promise<Set<string>> {
    const expanded = await this.expandExclusions([profileId]);
    return expanded.get(profileId)?.indicatorIds ?? new Set<string>();
  }

  async resolveExcludedSectionIds(profileId: string): Promise<Set<string>> {
    const expanded = await this.expandExclusions([profileId]);
    return expanded.get(profileId)?.sectionIds ?? new Set<string>();
  }

  // Versiones por lote (evitan N+1 en paneles): { profileId → Set<id> }.
  async resolveExcludedIndicatorIdsForProfiles(
    profileIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const expanded = await this.expandExclusions(profileIds);
    return new Map(
      [...expanded.entries()].map(([id, sets]) => [id, sets.indicatorIds]),
    );
  }

  async resolveExcludedSectionIdsForProfiles(
    profileIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const expanded = await this.expandExclusions(profileIds);
    return new Map(
      [...expanded.entries()].map(([id, sets]) => [id, sets.sectionIds]),
    );
  }
}
