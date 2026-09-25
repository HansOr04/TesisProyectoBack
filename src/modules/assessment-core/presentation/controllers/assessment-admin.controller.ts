import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import {
  RequireAuthenticated,
  RequireGlobalSuperAdmin,
} from '../../../identity/presentation/decorators/auth.decorators';
import { AssessmentProfilesService } from '../../application/assessment-profiles.service';

// RF-08: vista cross-organización para el Administrador de plataforma.
// A diferencia del resto de assessment-core (todo `:org/assessments/...`), esta ruta no
// está scoped a una organización, por eso usa el guard global de claims
// (RequireGlobalSuperAdmin) en lugar de AssessmentPermissionGuard, que exige un
// `:org` para resolver permisos por organización.
@ApiTags('Núcleo de evaluación')
@ApiBearerAuth()
@Controller()
@RequireAuthenticated()
export class AssessmentAdminController {
  constructor(private readonly profilesService: AssessmentProfilesService) {}

  @Get('assessments/admin/all-profiles')
  @RequireGlobalSuperAdmin()
  async listAllProfiles() {
    return this.profilesService.listAllForAdmin();
  }
}
