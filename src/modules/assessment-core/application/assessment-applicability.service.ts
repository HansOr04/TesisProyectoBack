import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
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

  // Usado por los servicios de scoring de cada herramienta: expande la
  // exclusión por sección (todos sus indicadores) + la exclusión directa por
  // indicador en un único Set de indicatorId no aplicables para el perfil.
  async resolveExcludedIndicatorIds(profileId: string): Promise<Set<string>> {
    const [sectionExclusions, indicatorExclusions] = await Promise.all([
      this.prisma.assessmentProfileSectionExclusion.findMany({
        where: { profileId },
        select: {
          section: { select: { indicators: { select: { id: true } } } },
        },
      }),
      this.prisma.assessmentProfileIndicatorExclusion.findMany({
        where: { profileId },
        select: { indicatorId: true },
      }),
    ]);

    const excluded = new Set<string>();
    for (const { section } of sectionExclusions) {
      for (const indicator of section.indicators) {
        excluded.add(indicator.id);
      }
    }
    for (const { indicatorId } of indicatorExclusions) {
      excluded.add(indicatorId);
    }
    return excluded;
  }

  async resolveExcludedSectionIds(profileId: string): Promise<Set<string>> {
    const sectionExclusions =
      await this.prisma.assessmentProfileSectionExclusion.findMany({
        where: { profileId },
        select: { sectionId: true },
      });
    return new Set(sectionExclusions.map((e) => e.sectionId));
  }

  // Versiones por lote (evitan N+1 en paneles): { profileId → Set<indicatorId> }.
  async resolveExcludedIndicatorIdsForProfiles(
    profileIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>(
      profileIds.map((id) => [id, new Set<string>()]),
    );
    if (profileIds.length === 0) return result;
    const [sectionExclusions, indicatorExclusions] = await Promise.all([
      this.prisma.assessmentProfileSectionExclusion.findMany({
        where: { profileId: { in: profileIds } },
        select: {
          profileId: true,
          section: { select: { indicators: { select: { id: true } } } },
        },
      }),
      this.prisma.assessmentProfileIndicatorExclusion.findMany({
        where: { profileId: { in: profileIds } },
        select: { profileId: true, indicatorId: true },
      }),
    ]);
    for (const e of sectionExclusions) {
      const set = result.get(e.profileId);
      for (const i of e.section.indicators) set?.add(i.id);
    }
    for (const e of indicatorExclusions)
      result.get(e.profileId)?.add(e.indicatorId);
    return result;
  }

  async resolveExcludedSectionIdsForProfiles(
    profileIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>(
      profileIds.map((id) => [id, new Set<string>()]),
    );
    if (profileIds.length === 0) return result;
    const rows = await this.prisma.assessmentProfileSectionExclusion.findMany({
      where: { profileId: { in: profileIds } },
      select: { profileId: true, sectionId: true },
    });
    for (const r of rows) result.get(r.profileId)?.add(r.sectionId);
    return result;
  }
}
