import { Inject, Injectable } from '@nestjs/common';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { AssessmentApplicabilityService } from '../../assessment-core/application/assessment-applicability.service';
import { AssessmentSessionGateway } from '../../assessment-session/infrastructure/assessment-session.gateway';
import { IndicatorMeasureToolService } from '../../evaluation-tool/application/indicator-measure-tool.service';
import {
  EVALUATION_REPOSITORY,
  EvaluationRepository,
} from '../../evaluation-tool/domain/ports/evaluation.repository';
import {
  INDICATOR_MEASURE_REPOSITORY,
  IndicatorMeasureRepository,
} from '../../evaluation-tool/domain/ports/indicator-measure.repository';
import {
  TEMPLATE_REPOSITORY,
  TemplateRepository,
} from '../../evaluation-tool/domain/ports/template.repository';
import { CAPACITY_TOOL_DEFINITION } from '../domain/capacity-tool.definition';
import { CapacityToolAiService } from './capacity-tool-ai.service';

// Herramienta de Capacidades: análisis de capacidades frente al marco normativo por áreas.
// Todo el flujo (plantilla versionada, evaluación, puntuación, medidas por KPI,
// exportes, IA, panel) es el genérico de IndicatorMeasureToolService; esta
// clase solo fija la definición de la herramienta y sus dependencias.
@Injectable()
export class CapacityToolService extends IndicatorMeasureToolService {
  constructor(
    @Inject(TEMPLATE_REPOSITORY) templates: TemplateRepository,
    @Inject(EVALUATION_REPOSITORY) evaluations: EvaluationRepository,
    @Inject(INDICATOR_MEASURE_REPOSITORY) measures: IndicatorMeasureRepository,
    auditService: AssessmentAuditService,
    aiService: CapacityToolAiService,
    applicabilityService: AssessmentApplicabilityService,
    sessionGateway: AssessmentSessionGateway,
  ) {
    super(
      CAPACITY_TOOL_DEFINITION,
      templates,
      evaluations,
      measures,
      auditService,
      aiService,
      applicabilityService,
      sessionGateway,
    );
  }
}
