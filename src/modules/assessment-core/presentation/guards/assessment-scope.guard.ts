import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestContextService } from '../../../identity/application/request-context.service';
import {
  AssessmentAccessScopeService,
  AssessmentScopedResource,
} from '../../application/assessment-access-scope.service';

export const ASSESSMENT_SCOPE_KEY = 'assessmentScope';

interface ScopedToMetadata {
  resource: AssessmentScopedResource;
  param: string;
  from: 'params' | 'body';
}

/**
 * La ruta trabaja sobre un recurso de una organización evaluada (su id viene
 * en `param` de la ruta o del cuerpo): un evaluador solo llega a las que
 * tiene asignadas. Va después de @RequireAssessmentPermission, que decide si
 * el rol puede hacer la acción; este decide sobre qué datos.
 */
export const ScopedTo = (
  resource: AssessmentScopedResource,
  param = 'id',
  from: 'params' | 'body' = 'params',
) =>
  SetMetadata(ASSESSMENT_SCOPE_KEY, {
    resource,
    param,
    from,
  } satisfies ScopedToMetadata);

@Injectable()
export class AssessmentScopeGuard implements CanActivate {
  constructor(
    private readonly accessScope: AssessmentAccessScopeService,
    private readonly requestContext: RequestContextService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scoped = this.reflector.get<ScopedToMetadata | undefined>(
      ASSESSMENT_SCOPE_KEY,
      context.getHandler(),
    );
    if (!scoped) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organisation: string | undefined = request.params?.org;
    const id: unknown = request[scoped.from]?.[scoped.param];
    const user = await this.requestContext.getCurrentUser();
    // Sin usuario u organización ya respondió el guard de permisos; sin id
    // (cuerpo incompleto) responde la validación del DTO.
    if (!user || !organisation || typeof id !== 'string') {
      return true;
    }

    const scope = await this.accessScope.resolveProfileScope(
      organisation,
      user.id,
      this.requestContext.getCurrentUserIsSuperAdmin(),
    );
    await this.accessScope.assertInScope(
      organisation,
      scope,
      scoped.resource,
      id,
    );
    return true;
  }
}
