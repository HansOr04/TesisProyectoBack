import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller } from '@nestjs/common';
import { ASSESSMENT_MODULE_CODES } from '../../../assessment-core/domain/assessment.constants';
import { createIndicatorToolController } from '../../../evaluation-tool/presentation/indicator-tool.controller.factory';
import { CapacityToolService } from '../../application/capacity-tool.service';

// Herramienta de Capacidades — rutas /:org/assessments/capacity/*.
@ApiTags('Herramienta de Capacidades')
@ApiBearerAuth()
@Controller()
export class CapacityToolController extends createIndicatorToolController({
  segment: 'capacity',
  sectionSegment: 'areas',
  module: ASSESSMENT_MODULE_CODES.CAPACITY,
  service: CapacityToolService,
}) {}
