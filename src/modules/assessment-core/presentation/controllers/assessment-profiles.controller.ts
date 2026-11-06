import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../../shared/presentation/pagination';
import { AssessmentProfilesService } from '../../application/assessment-profiles.service';
import { CreateAssessmentProfileDto, UpdateAssessmentProfileDto } from '../dto';
import { RequestContextService } from '../../../identity/application/request-context.service';
import { RequireAuthenticated } from '../../../identity/presentation/decorators/auth.decorators';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../guards/assessment-permission.guard';
import {
  AssessmentScopeGuard,
  ScopedTo,
} from '../guards/assessment-scope.guard';
import { AssessmentAccessScopeService } from '../../application/assessment-access-scope.service';
import { ConsolidatedPlanService } from '../../application/consolidated-plan.service';

@ApiTags('Perfiles de organización')
@ApiBearerAuth()
@Controller()
@RequireAuthenticated()
@UseGuards(AssessmentPermissionGuard, AssessmentScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AssessmentProfilesController {
  constructor(
    private readonly profilesService: AssessmentProfilesService,
    private readonly requestContext: RequestContextService,
    private readonly accessScope: AssessmentAccessScopeService,
    private readonly consolidatedPlan: ConsolidatedPlanService,
  ) {}

  private async resolveScope(org: string) {
    const user = await this.requestContext.requireCurrentUser();
    const isSuperAdmin = this.requestContext.getCurrentUserIsSuperAdmin();
    return this.accessScope.resolveProfileScope(org, user.id, isSuperAdmin);
  }

  @Get(':org/assessments/profiles')
  @RequireAssessmentPermission('assessment-core', 'read')
  async list(@Param('org') org: string, @Query() query: PaginationQueryDto) {
    const scope = await this.resolveScope(org);
    return this.profilesService.list(org, scope, query);
  }

  @Get(':org/assessments/profiles/:id')
  @RequireAssessmentPermission('assessment-core', 'read')
  @ScopedTo('profile')
  async getOne(@Param('org') org: string, @Param('id') id: string) {
    const scope = await this.resolveScope(org);
    return this.profilesService.get(org, id, scope);
  }

  @Get(':org/assessments/profiles/:id/children')
  @RequireAssessmentPermission('assessment-core', 'read')
  @ScopedTo('profile')
  async getChildren(@Param('org') org: string, @Param('id') id: string) {
    const scope = await this.resolveScope(org);
    return this.profilesService.getAssociationOverview(org, id, scope);
  }

  // Plan de acción consolidado de la organización: medidas de las tres
  // herramientas juntas. Pasa por get() para respetar el alcance del
  // evaluador (solo sus organizaciones asignadas).
  @Get(':org/assessments/profiles/:id/action-plan')
  @RequireAssessmentPermission('assessment-core', 'read')
  @ScopedTo('profile')
  async getActionPlan(@Param('org') org: string, @Param('id') id: string) {
    const scope = await this.resolveScope(org);
    const profile = await this.profilesService.get(org, id, scope);
    return {
      profile: { id: profile.id, name: profile.name },
      measures: await this.consolidatedPlan.profilePlan(org, profile.id),
    };
  }

  @Post(':org/assessments/profiles')
  @RequireAssessmentPermission('assessment-core', 'write')
  async create(
    @Param('org') org: string,
    @Body() dto: CreateAssessmentProfileDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    // Lo que da de alta un evaluador queda a su cargo: sin evaluador asignado
    // la organización desaparecía de su lista apenas la creaba.
    const scope = await this.resolveScope(org);
    const owned = scope.evaluatorId
      ? { ...dto, evaluatorId: scope.evaluatorId }
      : dto;
    return this.profilesService.create(org, owned, user?.id);
  }

  @Patch(':org/assessments/profiles/:id')
  @RequireAssessmentPermission('assessment-core', 'write')
  @ScopedTo('profile')
  async update(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentProfileDto,
  ) {
    // Elegir el evaluador responsable es del administrador: un evaluador que
    // cambia evaluatorId se asignaría organizaciones ajenas a sí mismo.
    const scope = await this.resolveScope(org);
    if (scope.evaluatorId && dto.evaluatorId !== undefined) {
      throw new ForbiddenException(
        'Only an administrator can assign the evaluator of a profile',
      );
    }
    const user = await this.requestContext.getCurrentUser();
    return this.profilesService.update(org, id, dto, user?.id);
  }

  @Delete(':org/assessments/profiles/:id')
  @RequireAssessmentPermission('assessment-core', 'delete')
  @ScopedTo('profile')
  async remove(
    @Param('org') org: string,
    @Param('id') id: string,
    @Query('confirm') confirm?: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    await this.profilesService.delete(org, id, confirm === 'true', user?.id);
    return { success: true };
  }
}
