import { Module } from '@nestjs/common';
import { AssessmentSessionModule } from '../assessment-session/assessment-session.module';
import { AssessmentAccessScopeService } from './application/assessment-access-scope.service';
import { AssessmentApplicabilityService } from './application/assessment-applicability.service';
import { AssessmentAuditService } from './application/assessment-audit.service';
import { AssessmentDashboardService } from './application/assessment-dashboard.service';
import { AssessmentProfilesService } from './application/assessment-profiles.service';
import { AssessmentRolesService } from './application/assessment-roles.service';
import { AssessmentDashboardExportService } from './infrastructure/assessment-dashboard-export.service';
import { AssessmentAdminController } from './presentation/controllers/assessment-admin.controller';
import { AssessmentApplicabilityController } from './presentation/controllers/assessment-applicability.controller';
import { AssessmentDashboardController } from './presentation/controllers/assessment-dashboard.controller';
import { AssessmentProfilesController } from './presentation/controllers/assessment-profiles.controller';
import { AssessmentRolesController } from './presentation/controllers/assessment-roles.controller';
import { AssessmentAiThrottlerGuard } from './presentation/guards/assessment-ai-throttler.guard';
import { AssessmentPermissionGuard } from './presentation/guards/assessment-permission.guard';

// Núcleo compartido: perfiles de organización evaluada, aplicabilidad,
// roles Assessment, dashboard consolidado y auditoría. Los módulos de
// herramienta (Organizativa/Capacidades/Riesgos) importan este módulo para reutilizar
// audit/applicability/access-scope y los guards.
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
    AssessmentRolesService,
    AssessmentProfilesService,
    AssessmentApplicabilityService,
    AssessmentAccessScopeService,
    AssessmentDashboardService,
    AssessmentDashboardExportService,
    AssessmentAuditService,
    AssessmentPermissionGuard,
    AssessmentAiThrottlerGuard,
  ],
  exports: [
    AssessmentRolesService,
    AssessmentProfilesService,
    AssessmentApplicabilityService,
    AssessmentAccessScopeService,
    AssessmentDashboardService,
    AssessmentAuditService,
    AssessmentPermissionGuard,
    AssessmentAiThrottlerGuard,
  ],
})
export class AssessmentCoreModule {}
