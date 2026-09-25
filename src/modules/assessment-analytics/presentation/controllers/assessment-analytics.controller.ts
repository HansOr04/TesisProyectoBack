import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RequestContextService } from '../../../identity/application/request-context.service';
import { RequireAuthenticated } from '../../../identity/presentation/decorators/auth.decorators';
import { AssessmentAccessScopeService } from '../../../assessment-core/application/assessment-access-scope.service';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../../../assessment-core/presentation/guards/assessment-permission.guard';
import { AssessmentAnalyticsService } from '../../application/assessment-analytics.service';
import {
  ClustersQueryDto,
  SegmentsQueryDto,
  ToolQueryDto,
} from '../dto/analytics-query.dto';

// Analítica transversal de las 3 herramientas. Misma regla de alcance que el
// dashboard: un evaluador solo analiza las organizaciones que tiene asignadas.
@ApiTags('Analítica')
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
export class AssessmentAnalyticsController {
  constructor(
    private readonly analytics: AssessmentAnalyticsService,
    private readonly requestContext: RequestContextService,
    private readonly accessScope: AssessmentAccessScopeService,
  ) {}

  private async resolveScope(org: string) {
    const user = await this.requestContext.requireCurrentUser();
    const isSuperAdmin = this.requestContext.getCurrentUserIsSuperAdmin();
    return this.accessScope.resolveProfileScope(org, user.id, isSuperAdmin);
  }

  @Get(':org/assessments/analytics/overview')
  @RequireAssessmentPermission('assessment-core', 'read')
  async overview(@Param('org') org: string) {
    return this.analytics.overview(org, await this.resolveScope(org));
  }

  @Get(':org/assessments/analytics/gaps')
  @RequireAssessmentPermission('assessment-core', 'read')
  async gaps(@Param('org') org: string, @Query() query: ToolQueryDto) {
    return this.analytics.systemicGaps(
      org,
      await this.resolveScope(org),
      query.tool,
    );
  }

  @Get(':org/assessments/analytics/correlations')
  @RequireAssessmentPermission('assessment-core', 'read')
  async correlations(@Param('org') org: string) {
    return this.analytics.correlations(org, await this.resolveScope(org));
  }

  @Get(':org/assessments/analytics/segments')
  @RequireAssessmentPermission('assessment-core', 'read')
  async segments(@Param('org') org: string, @Query() query: SegmentsQueryDto) {
    return this.analytics.segments(org, await this.resolveScope(org), query.by);
  }

  @Get(':org/assessments/analytics/effectiveness')
  @RequireAssessmentPermission('assessment-core', 'read')
  async effectiveness(@Param('org') org: string) {
    return this.analytics.measureEffectiveness(
      org,
      await this.resolveScope(org),
    );
  }

  @Get(':org/assessments/analytics/clusters')
  @RequireAssessmentPermission('assessment-core', 'read')
  async clusters(@Param('org') org: string, @Query() query: ClustersQueryDto) {
    return this.analytics.clusters(
      org,
      await this.resolveScope(org),
      query.tool,
      query.k,
    );
  }

  @Get(':org/assessments/analytics/benchmark/:profileId')
  @RequireAssessmentPermission('assessment-core', 'read')
  async benchmark(
    @Param('org') org: string,
    @Param('profileId') profileId: string,
  ) {
    return this.analytics.benchmark(
      org,
      await this.resolveScope(org),
      profileId,
    );
  }
}
