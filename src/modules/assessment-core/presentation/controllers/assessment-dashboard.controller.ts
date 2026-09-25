import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { AssessmentDashboardService } from '../../application/assessment-dashboard.service';
import { AssessmentDashboardExportService } from '../../infrastructure/assessment-dashboard-export.service';
import { AssessmentAccessScopeService } from '../../application/assessment-access-scope.service';
import { DashboardFilterDto } from '../dto';
import { RequestContextService } from '../../../identity/application/request-context.service';
import { RequireAuthenticated } from '../../../identity/presentation/decorators/auth.decorators';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../guards/assessment-permission.guard';

// RF-07/F6-B01/F6-B02: panel consolidado multi-herramienta.
@ApiTags('Panel consolidado')
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
export class AssessmentDashboardController {
  constructor(
    private readonly dashboardService: AssessmentDashboardService,
    private readonly exportService: AssessmentDashboardExportService,
    private readonly requestContext: RequestContextService,
    private readonly accessScope: AssessmentAccessScopeService,
  ) {}

  private async resolveScope(org: string) {
    const user = await this.requestContext.requireCurrentUser();
    const isSuperAdmin = this.requestContext.getCurrentUserIsSuperAdmin();
    return this.accessScope.resolveProfileScope(org, user.id, isSuperAdmin);
  }

  @Get(':org/assessments/dashboard')
  @RequireAssessmentPermission('assessment-core', 'read')
  async getDashboard(
    @Param('org') org: string,
    @Query() filters: DashboardFilterDto,
  ) {
    const scope = await this.resolveScope(org);
    return this.dashboardService.getDashboard(org, filters, scope);
  }

  @Get(':org/assessments/dashboard/export')
  @RequireAssessmentPermission('assessment-core', 'read')
  async exportDashboard(
    @Param('org') org: string,
    @Query() filters: DashboardFilterDto,
    @Res() res: Response,
  ) {
    const scope = await this.resolveScope(org);
    const rows = await this.dashboardService.getDashboard(org, filters, scope);
    const result = await this.exportService.buildWorkbook(rows);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.data);
  }
}
