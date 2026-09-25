import { Injectable } from '@nestjs/common';
import { AuthorizationService } from '../../identity/application/authorization.service';

export interface AssessmentProfileScope {
  evaluatorId?: string;
}

// RF-07 (F6-B03): un usuario con rol assessment_evaluator solo debe ver los
// perfiles de organización que tiene asignados (evaluatorId), mientras que
// assessment_admin y los superadmin de la plataforma ven todos. La distinción no
// es un permiso nuevo (ambos roles ya comparten read/write) sino un recorte
// de datos, por eso se resuelve aquí y se aplica como filtro Prisma en cada
// endpoint de listado en lugar de vivir en el guard de permisos.
@Injectable()
export class AssessmentAccessScopeService {
  constructor(private readonly authorizationService: AuthorizationService) {}

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
}
