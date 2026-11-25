import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../../assessment-core/presentation/guards/assessment-permission.guard';
import { PaginationQueryDto } from '../../../shared/presentation/pagination';
import { RequestContextService } from '../application/request-context.service';
import { UserManagementService } from '../application/user-management.service';
import { RequireAuthenticated } from './decorators/auth.decorators';
import {
  CreateOrganisationUserDto,
  UpdateOrganisationUserDto,
  ViewerVisibilityDto,
} from './dto/user-management.dto';

@ApiTags('Usuarios')
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
export class UserManagementController {
  constructor(
    private readonly users: UserManagementService,
    private readonly requestContext: RequestContextService,
  ) {}

  private async actor() {
    const user = await this.requestContext.requireCurrentUser();
    return {
      id: user.id,
      isSuperAdmin: this.requestContext.getCurrentUserIsSuperAdmin(),
    };
  }

  @Get(':org/users')
  @RequireAssessmentPermission('assessment-core', 'admin')
  list(@Param('org') org: string, @Query() query: PaginationQueryDto) {
    return this.users.listMembers(org, query);
  }

  @Post(':org/users')
  @RequireAssessmentPermission('assessment-core', 'admin')
  async create(
    @Param('org') org: string,
    @Body() dto: CreateOrganisationUserDto,
  ) {
    return this.users.createMember(org, dto, await this.actor());
  }

  @Patch(':org/users/:id')
  @RequireAssessmentPermission('assessment-core', 'admin')
  async update(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrganisationUserDto,
  ) {
    return this.users.updateMember(org, id, dto, await this.actor());
  }

  @Put(':org/users/:id/visibility')
  @RequireAssessmentPermission('assessment-core', 'admin')
  async setVisibility(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: ViewerVisibilityDto,
  ) {
    return this.users.setViewerVisibility(org, id, dto, await this.actor());
  }

  @Delete(':org/users/:id')
  @RequireAssessmentPermission('assessment-core', 'admin')
  async remove(@Param('org') org: string, @Param('id') id: string) {
    await this.users.removeMember(org, id, await this.actor());
    return { success: true };
  }
}
