import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import {
  RequireAuthenticated,
  RequireGlobalSuperAdmin,
} from '../../../identity/presentation/decorators/auth.decorators';
import { AssessmentProfilesService } from '../../application/assessment-profiles.service';
import { RequestContextService } from '../../../identity/application/request-context.service';

@ApiTags('Núcleo de evaluación')
@ApiBearerAuth()
@Controller()
@RequireAuthenticated()
export class AssessmentAdminController {
  constructor(
    private readonly profilesService: AssessmentProfilesService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('assessments/admin/all-profiles')
  @RequireGlobalSuperAdmin()
  async listAllProfiles() {
    const actor = await this.requestContext.requireCurrentUser();
    return this.profilesService.listAllForAdmin(actor.id);
  }
}
