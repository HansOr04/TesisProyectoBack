import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AssessmentApplicabilityService } from '../../application/assessment-applicability.service';
import { SetAssessmentProfileApplicabilityDto } from '../dto';
import { RequestContextService } from '../../../identity/application/request-context.service';
import { RequireAuthenticated } from '../../../identity/presentation/decorators/auth.decorators';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../guards/assessment-permission.guard';

@ApiTags('Aplicabilidad de KPI')
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
export class AssessmentApplicabilityController {
  constructor(
    private readonly applicabilityService: AssessmentApplicabilityService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get(':org/assessments/profiles/:id/applicability')
  @RequireAssessmentPermission('assessment-core', 'read')
  async get(@Param('org') org: string, @Param('id') id: string) {
    return this.applicabilityService.get(org, id);
  }

  @Put(':org/assessments/profiles/:id/applicability')
  @RequireAssessmentPermission('assessment-core', 'write')
  async set(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: SetAssessmentProfileApplicabilityDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.applicabilityService.set(org, id, dto, user?.id);
  }
}
