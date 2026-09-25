import { BadGatewayException, Injectable, Optional } from '@nestjs/common';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import { AssessmentLlmClientService } from '../../assessment-ai/application/assessment-llm-client.service';
import {
  ANTI_HALLUCINATION_RULE,
  EvaluationToolAiService,
} from '../../evaluation-tool/application/evaluation-tool-ai.service';
import {
  AiIndicatorContext,
  extractJson,
} from '../../evaluation-tool/domain/evaluation-tool-ai.types';
import { RISK_AI_CONTEXT } from '../domain/risk-tool.definition';

export {
  parseAiInconsistencyFindings,
  parseAiReportInsights,
} from '../../evaluation-tool/domain/evaluation-tool-ai.types';

export interface AiRiskItem extends AiIndicatorContext {
  indicatorId: string;
  score: number;
  riskDescription: string;
  riskType?: string;
}

export interface AiRiskMeasureSuggestion {
  indicatorId: string;
  description: string;
}

const SYSTEM_PROMPT_SUGGEST_MITIGATION = `Eres un asesor de planes de mitigación de riesgos (deforestación, derechos humanos, trazabilidad) para asociaciones de productores.
Para cada riesgo no despreciable recibido, propone UNA medida de mitigación concreta y accionable que atienda el riesgo descrito.
${ANTI_HALLUCINATION_RULE}
"description" debe tener máximo 2 oraciones.
Responde EXCLUSIVAMENTE con un array JSON válido, sin texto adicional antes o después, con este formato exacto:
[{"indicatorId": "...", "description": "..."}]`;

// Asistencia de IA de la Herramienta de Riesgos: hereda las capacidades
// comunes (observaciones, inconsistencias, narrativa, insights) y añade la
// sugerencia de medidas de mitigación a partir de riesgos no despreciables.
@Injectable()
export class RiskToolAiService extends EvaluationToolAiService {
  constructor(
    llmClient: AssessmentLlmClientService,
    @Optional() logger?: StructuredLoggerService,
  ) {
    super(RISK_AI_CONTEXT, llmClient, logger);
  }

  // Se llama con los riesgos de UN solo principio a la vez.
  async suggestMeasuresForPrinciple(
    principleName: string,
    riskItems: AiRiskItem[],
  ): Promise<AiRiskMeasureSuggestion[]> {
    if (riskItems.length === 0) return [];

    const userPrompt = [
      `Principio: ${principleName}`,
      'Riesgos no despreciables:',
      ...riskItems.map(
        (item, idx) =>
          `${idx + 1}. id="${item.indicatorId}" ${item.code} — ${item.name}` +
          `${item.description ? ` (${item.description})` : ''}. ` +
          `Calificación: ${item.score}/10. Riesgo: ${item.riskDescription}` +
          `${item.riskType ? ` (tipo: ${item.riskType})` : ''}`,
      ),
    ].join('\n');

    const maxOutputTokens = Math.min(1000 + 250 * riskItems.length, 5000);
    const result = await this.llmClient.complete(
      SYSTEM_PROMPT_SUGGEST_MITIGATION,
      userPrompt,
      maxOutputTokens,
      0.3,
    );
    this.log('mitigation measures suggested', {
      principle: principleName,
      itemCount: riskItems.length,
      tokensUsed: result.tokensUsed,
    });
    return parseAiRiskMeasureSuggestions(
      result.text,
      riskItems.map((i) => i.indicatorId),
    );
  }
}

// Anti-alucinación: toda sugerencia con un indicatorId fuera de la lista
// pedida se descarta.
export function parseAiRiskMeasureSuggestions(
  raw: string,
  validIndicatorIds: string[],
): AiRiskMeasureSuggestion[] {
  const parsed = extractJson(raw, 'array');
  if (!Array.isArray(parsed)) {
    throw new BadGatewayException('AI response was not a JSON array');
  }
  const validIds = new Set(validIndicatorIds);
  return parsed.filter(
    (item): item is AiRiskMeasureSuggestion =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as AiRiskMeasureSuggestion).indicatorId === 'string' &&
      typeof (item as AiRiskMeasureSuggestion).description === 'string' &&
      validIds.has((item as AiRiskMeasureSuggestion).indicatorId),
  );
}
