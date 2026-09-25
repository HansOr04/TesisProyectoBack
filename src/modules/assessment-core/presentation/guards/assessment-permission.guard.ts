import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../../../identity/application/authorization.service';
import { RequestContextService } from '../../../identity/application/request-context.service';

export const REQUIRE_ASSESSMENT_PERMISSION_KEY = 'requireAssessmentPermission';

/**
 * The shared PermissionGuard now authorizes purely from JWT claims against a
 * static per-role catalog (CLAIM_ROLE_PERMISSION_CATALOG) — it no longer
 * queries AuthRole/AuthUserRole. assessment_admin/assessment_evaluator are assigned via
 * RF-01 as AuthUserRole rows and aren't in that static catalog, so Assessment
 * routes keep authorizing against the database directly instead.
 */
export const RequireAssessmentPermission = (
  moduleCode: string,
  action: string,
) => SetMetadata(REQUIRE_ASSESSMENT_PERMISSION_KEY, { moduleCode, action });

@Injectable()
export class AssessmentPermissionGuard implements CanActivate {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly requestContext: RequestContextService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      { moduleCode: string; action: string } | undefined
    >(REQUIRE_ASSESSMENT_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organisation: string | undefined =
      request.params?.org || request.params?.organisation;
    const user = await this.requestContext.getCurrentUser();
    const isSuperAdmin = this.requestContext.getCurrentUserIsSuperAdmin();

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (!organisation) {
      throw new ForbiddenException('Organisation is required');
    }

    const result = await this.authorizationService.canPerformAction(
      organisation,
      user.id,
      required.moduleCode,
      required.action,
      isSuperAdmin,
    );

    if (!result.allowed) {
      throw new ForbiddenException(
        result.reason ||
          `You do not have permission to ${required.action} in ${required.moduleCode}.`,
      );
    }

    return true;
  }
}
