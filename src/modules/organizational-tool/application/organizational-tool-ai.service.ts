import { Injectable, Optional } from '@nestjs/common';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import { AssessmentLlmClientService } from '../../assessment-ai/application/assessment-llm-client.service';
import { EvaluationToolAiService } from '../../evaluation-tool/application/evaluation-tool-ai.service';
import { ORGANIZATIONAL_AI_CONTEXT } from '../domain/organizational-tool.definition';

@Injectable()
export class OrganizationalToolAiService extends EvaluationToolAiService {
  constructor(
    llmClient: AssessmentLlmClientService,
    @Optional() logger?: StructuredLoggerService,
  ) {
    super(ORGANIZATIONAL_AI_CONTEXT, llmClient, logger);
  }
}
