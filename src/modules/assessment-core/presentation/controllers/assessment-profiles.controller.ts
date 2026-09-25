import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
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
import { AssessmentAccessScopeService } from '../../application/assessment-access-scope.service';

@ApiTags('Perfiles de organización')
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
export class AssessmentProfilesController {
  constructor(
    private readonly profilesService: AssessmentProfilesService,
    private readonly requestContext: RequestContextService,
    private readonly accessScope: AssessmentAccessScopeService,
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
  async getOne(@Param('org') org: string, @Param('id') id: string) {
    const scope = await this.resolveScope(org);
    return this.profilesService.get(org, id, scope);
  }

  @Get(':org/assessments/profiles/:id/children')
  @RequireAssessmentPermission('assessment-core', 'read')
  async getChildren(@Param('org') org: string, @Param('id') id: string) {
    const scope = await this.resolveScope(org);
    return this.profilesService.getAssociationOverview(org, id, scope);
  }

  @Post(':org/assessments/profiles')
  @RequireAssessmentPermission('assessment-core', 'write')
  async create(
    @Param('org') org: string,
    @Body() dto: CreateAssessmentProfileDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.profilesService.create(org, dto, user?.id);
  }

  @Patch(':org/assessments/profiles/:id')
  @RequireAssessmentPermission('assessment-core', 'write')
  async update(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentProfileDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.profilesService.update(org, id, dto, user?.id);
  }

  @Delete(':org/assessments/profiles/:id')
  @RequireAssessmentPermission('assessment-core', 'delete')
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
