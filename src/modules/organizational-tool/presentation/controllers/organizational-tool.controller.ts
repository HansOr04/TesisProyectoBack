import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller } from '@nestjs/common';
import { ASSESSMENT_MODULE_CODES } from '../../../assessment-core/domain/assessment.constants';
import { createIndicatorToolController } from '../../../evaluation-tool/presentation/indicator-tool.controller.factory';
import { OrganizationalToolService } from '../../application/organizational-tool.service';

// Herramienta Organizativa — rutas /:org/assessments/organizational/*.
@ApiTags('Herramienta Organizativa')
@ApiBearerAuth()
@Controller()
export class OrganizationalToolController extends createIndicatorToolController(
  {
    segment: 'organizational',
    sectionSegment: 'dimensions',
    module: ASSESSMENT_MODULE_CODES.ORGANIZATIONAL,
    service: OrganizationalToolService,
  },
) {}
