import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthorizationService } from '../../identity/application/authorization.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

export interface AssessmentProfileScope {
  evaluatorId?: string;
}

/** Recursos que cuelgan de una organización evaluada (perfil). */
export type AssessmentScopedResource =
  | 'profile'
  | 'evaluation'
  | 'indicator-measure'
  | 'risk'
  | 'mitigation-measure';

// RF-07 (F6-B03): un usuario con rol assessment_evaluator solo debe ver los
// perfiles de organización que tiene asignados (evaluatorId), mientras que
// assessment_admin y los superadmin de la plataforma ven todos. La distinción no
// es un permiso nuevo (ambos roles ya comparten read/write) sino un recorte
// de datos, por eso se resuelve aquí y se aplica como filtro Prisma en cada
// endpoint de listado en lugar de vivir en el guard de permisos. Las rutas que
// reciben el id de un recurso concreto lo comprueban con assertInScope (vía
// AssessmentScopeGuard).
@Injectable()
export class AssessmentAccessScopeService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly prisma: PrismaService,
  ) {}

  async resolveProfileScope(
    organisation: string,
    userId: string,
    isSuperAdmin: boolean,
  ): Promise<AssessmentProfileScope> {
    if (isSuperAdmin) {
      return {};
    }
    const roles = await this.authorizationService.getUserRoles(
      organisation,
      userId,
    );
    const isAssessmentAdmin = roles.some(
      (r) => r.role.code === 'assessment_admin',
    );
    if (isAssessmentAdmin) {
      return {};
    }
    return { evaluatorId: userId };
  }

  /**
   * Con alcance de evaluador, el recurso tiene que colgar de una organización
   * evaluada asignada a él. Responde 404, como la ficha de una organización
   * ajena, para no revelar que el recurso existe.
   */
  async assertInScope(
    organisation: string,
    scope: AssessmentProfileScope,
    resource: AssessmentScopedResource,
    id: string,
  ): Promise<void> {
    if (!scope.evaluatorId) {
      return;
    }
    const evaluatorId = await this.evaluatorOf(organisation, resource, id);
    if (evaluatorId !== scope.evaluatorId) {
      throw new NotFoundException('Assessment resource not found');
    }
  }

  private async evaluatorOf(
    organisation: string,
    resource: AssessmentScopedResource,
    id: string,
  ): Promise<string | null | undefined> {
    const profile = { select: { evaluatorId: true } };
    switch (resource) {
      case 'profile': {
        const row = await this.prisma.assessmentOrganisationProfile.findFirst({
          where: { id, organisation, deletedAt: null },
          select: { evaluatorId: true },
        });
        return row?.evaluatorId;
      }
      case 'evaluation': {
        const row = await this.prisma.assessmentEvaluation.findFirst({
          where: { id, organisation, deletedAt: null },
          select: { profile },
        });
        return row?.profile.evaluatorId;
      }
      case 'indicator-measure': {
        const row = await this.prisma.assessmentIndicatorMeasure.findFirst({
          where: { id, organisation, deletedAt: null },
          select: { evaluation: { select: { profile } } },
        });
        return row?.evaluation.profile.evaluatorId;
      }
      case 'risk': {
        const row = await this.prisma.assessmentRisk.findFirst({
          where: { id, evaluation: { organisation } },
          select: { evaluation: { select: { profile } } },
        });
        return row?.evaluation.profile.evaluatorId;
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
        return row?.risk.evaluation.profile.evaluatorId;
      }
    }
  }
}
