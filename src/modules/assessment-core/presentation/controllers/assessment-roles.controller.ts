import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AssessmentRolesService } from '../../application/assessment-roles.service';
import { AssignAssessmentRoleDto } from '../dto';
import { RequestContextService } from '../../../identity/application/request-context.service';
import { RequireAuthenticated } from '../../../identity/presentation/decorators/auth.decorators';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../guards/assessment-permission.guard';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller()
@RequireAuthenticated()
@UseGuards(AssessmentPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AssessmentRolesController {
  constructor(
    private readonly rolesService: AssessmentRolesService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get(':org/assessments/roles')
  @RequireAssessmentPermission('assessment-core', 'read')
  async list(@Param('org') org: string) {
    return this.rolesService.listActive(org);
  }

  @Post(':org/assessments/roles')
  @RequireAssessmentPermission('assessment-core', 'admin')
  async assign(
    @Param('org') org: string,
    @Body() dto: AssignAssessmentRoleDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.rolesService.assign(org, dto.userId, dto.roleCode, user?.id);
  }

  @Delete(':org/assessments/roles/:id')
  @RequireAssessmentPermission('assessment-core', 'admin')
  async revoke(
    @Param('org') org: string,
    @Param('id') id: string,
    @Query('confirm') confirm?: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    await this.rolesService.revoke(org, id, confirm === 'true', user?.id);
    return { success: true };
  }

  @Get(':org/assessments/roles/history/:userId')
  @RequireAssessmentPermission('assessment-core', 'admin')
  async history(@Param('org') org: string, @Param('userId') userId: string) {
    return this.rolesService.history(org, userId);
  }
}
