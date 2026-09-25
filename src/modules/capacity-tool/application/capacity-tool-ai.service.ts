import { Injectable, Optional } from '@nestjs/common';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import { AssessmentLlmClientService } from '../../assessment-ai/application/assessment-llm-client.service';
import { EvaluationToolAiService } from '../../evaluation-tool/application/evaluation-tool-ai.service';
import { CAPACITY_AI_CONTEXT } from '../domain/capacity-tool.definition';

// Asistencia de IA de la Herramienta de Capacidades: solo aporta el contexto de
// dominio; prompts, parsers anti-alucinación y llamadas viven en la base.
@Injectable()
export class CapacityToolAiService extends EvaluationToolAiService {
  constructor(
    llmClient: AssessmentLlmClientService,
    @Optional() logger?: StructuredLoggerService,
  ) {
    super(CAPACITY_AI_CONTEXT, llmClient, logger);
  }
}
