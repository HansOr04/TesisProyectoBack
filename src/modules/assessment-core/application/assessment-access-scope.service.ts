import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  ASSESSMENT_ROLE_CODES,
  readViewerVisibility,
} from '../domain/assessment.constants';

export interface AssessmentProfileScope {
  evaluatorId?: string;
  AND?: { id: { in: string[] } }[];
}

export type AssessmentScopedResource =
  | 'profile'
  | 'evaluation'
  | 'indicator-measure'
  | 'risk'
  | 'mitigation-measure';

export function isUnrestrictedScope(scope: AssessmentProfileScope): boolean {
  return !scope.evaluatorId && !scope.AND;
}

@Injectable()
export class AssessmentAccessScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveProfileScope(
    organisation: string,
    userId: string,
    isSuperAdmin: boolean,
  ): Promise<AssessmentProfileScope> {
    if (isSuperAdmin) {
      return {};
    }
    const assignments = await this.prisma.authUserRole.findMany({
      where: {
        organisation,
        userId,
        deletedAt: null,
        role: { code: { in: [...ASSESSMENT_ROLE_CODES] } },
      },
      select: { customPermissions: true, role: { select: { code: true } } },
    });
    const byCode = new Map(assignments.map((a) => [a.role.code, a]));
    if (byCode.has('assessment_admin')) {
      return {};
    }
    if (byCode.has('assessment_evaluator')) {
      return { evaluatorId: userId };
    }
    const viewer = byCode.get('assessment_viewer');
    if (viewer) {
      const visibility = readViewerVisibility(viewer.customPermissions);
      return visibility.allProfiles
        ? {}
        : { AND: [{ id: { in: visibility.profileIds } }] };
    }
    return { evaluatorId: userId };
  }

  async assertInScope(
    organisation: string,
    scope: AssessmentProfileScope,
    resource: AssessmentScopedResource,
    id: string,
  ): Promise<void> {
    if (isUnrestrictedScope(scope)) {
      return;
    }
    const profileId = await this.profileOf(organisation, resource, id);
    const visible =
      profileId &&
      (await this.prisma.assessmentOrganisationProfile.count({
        where: { id: profileId, organisation, deletedAt: null, ...scope },
      }));
    if (!visible) {
      throw new NotFoundException('Assessment resource not found');
    }
  }

  private async profileOf(
    organisation: string,
    resource: AssessmentScopedResource,
    id: string,
  ): Promise<string | null | undefined> {
    const profile = { select: { id: true } };
    switch (resource) {
      case 'profile': {
        const row = await this.prisma.assessmentOrganisationProfile.findFirst({
          where: { id, organisation, deletedAt: null },
          select: { id: true },
        });
        return row?.id;
      }
      case 'evaluation': {
        const row = await this.prisma.assessmentEvaluation.findFirst({
          where: { id, organisation, deletedAt: null },
          select: { profile },
        });
        return row?.profile.id;
      }
      case 'indicator-measure': {
        const row = await this.prisma.assessmentIndicatorMeasure.findFirst({
          where: { id, organisation, deletedAt: null },
          select: { evaluation: { select: { profile } } },
        });
        return row?.evaluation.profile.id;
      }
      case 'risk': {
        const row = await this.prisma.assessmentRisk.findFirst({
          where: { id, evaluation: { organisation } },
          select: { evaluation: { select: { profile } } },
        });
        return row?.evaluation.profile.id;
      }
      case 'mitigation-measure': {
        const row = await this.prisma.assessmentMitigationMeasure.findFirst({
          where: {
            id,
            deletedAt: null,
            risk: { evaluation: { organisation } },
          },
          select: { risk: { select: { evaluation: { select: { profile } } } } },
        });
        return row?.risk.evaluation.profile.id;
      }
    }
  }
}
