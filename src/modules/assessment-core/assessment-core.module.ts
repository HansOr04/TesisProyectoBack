import { Module } from '@nestjs/common';
import { AssessmentSessionModule } from '../assessment-session/assessment-session.module';
import { AssessmentAccessScopeService } from './application/assessment-access-scope.service';
import { AssessmentApplicabilityService } from './application/assessment-applicability.service';
import { AssessmentAuditService } from './application/assessment-audit.service';
import { AssessmentDashboardService } from './application/assessment-dashboard.service';
import { AssessmentProfilesService } from './application/assessment-profiles.service';
import { ConsolidatedPlanService } from './application/consolidated-plan.service';
import { OrganisationProvisioningService } from './application/organisation-provisioning.service';
import { AssessmentRolesService } from './application/assessment-roles.service';
import { AssessmentDashboardExportService } from './infrastructure/assessment-dashboard-export.service';
import { AssessmentAdminController } from './presentation/controllers/assessment-admin.controller';
import { AssessmentApplicabilityController } from './presentation/controllers/assessment-applicability.controller';
import { AssessmentDashboardController } from './presentation/controllers/assessment-dashboard.controller';
import { AssessmentProfilesController } from './presentation/controllers/assessment-profiles.controller';
import { AssessmentRolesController } from './presentation/controllers/assessment-roles.controller';
import { AssessmentAiThrottlerGuard } from './presentation/guards/assessment-ai-throttler.guard';
import { AssessmentPermissionGuard } from './presentation/guards/assessment-permission.guard';
import { AssessmentScopeGuard } from './presentation/guards/assessment-scope.guard';

@Module({
  imports: [AssessmentSessionModule],
  controllers: [
    AssessmentRolesController,
    AssessmentProfilesController,
    AssessmentAdminController,
    AssessmentApplicabilityController,
    AssessmentDashboardController,
  ],
  providers: [
    ConsolidatedPlanService,
    OrganisationProvisioningService,
    AssessmentRolesService,
    AssessmentProfilesService,
    AssessmentApplicabilityService,
    AssessmentAccessScopeService,
    AssessmentDashboardService,
    AssessmentDashboardExportService,
    AssessmentAuditService,
    AssessmentPermissionGuard,
    AssessmentScopeGuard,
    AssessmentAiThrottlerGuard,
  ],
  exports: [
    ConsolidatedPlanService,
    OrganisationProvisioningService,
    AssessmentRolesService,
    AssessmentProfilesService,
    AssessmentApplicabilityService,
    AssessmentAccessScopeService,
    AssessmentDashboardService,
    AssessmentAuditService,
    AssessmentPermissionGuard,
    AssessmentScopeGuard,
    AssessmentAiThrottlerGuard,
  ],
})
export class AssessmentCoreModule {}
