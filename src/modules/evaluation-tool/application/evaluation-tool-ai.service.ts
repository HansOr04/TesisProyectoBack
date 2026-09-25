import { Injectable, Optional } from '@nestjs/common';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import { AssessmentLlmClientService } from '../../assessment-ai/application/assessment-llm-client.service';
import {
  AiCriticalItem,
  AiEvaluatedItem,
  AiIndicatorContext,
  AiInconsistencyFinding,
  AiMeasureSuggestion,
  AiReportContext,
  AiReportInsights,
  NarrativeTone,
  parseAiInconsistencyFindings,
  parseAiMeasureSuggestions,
  parseAiReportInsights,
} from '../domain/evaluation-tool-ai.types';

// Asistencia de IA común a las herramientas: mejorar redacción de observaciones,
// sugerir medidas para KPI críticos, detectar inconsistencias, narrativa
// ejecutiva e insights para el reporte. Diseñada para bajo consumo de tokens y
// sin alucinaciones — los prompts obligan al modelo a basarse únicamente en los
// datos que se le pasan. Cada herramienta aporta solo su contexto de dominio
// (AiDomainContext); la selección de proveedor, la llamada HTTP y el circuit
// breaker viven en AssessmentLlmClientService.

export interface AiDomainContext {
  /** "fortalecimiento organizativo", "capacidades de cumplimiento normativo"… */
  domain: string;
  /** Nombre de la sección en minúsculas: "dimensión", "área", "principio". */
  sectionLabel: string;
  /** Plural: "dimensiones", "áreas", "principios". */
  sectionLabelPlural: string;
  /** Etiqueta de registro: "Organizational", "Capacity", "Risk". */
  logLabel: string;
}

export const ANTI_HALLUCINATION_RULE =
  'Basa tu respuesta ÚNICAMENTE en la información proporcionada. No inventes datos, cifras, fechas ni hechos que no estén en el texto de entrada. Si falta información, sé más genérico en vez de inventar.';

const NARRATIVE_TONE_INSTRUCTIONS: Record<NarrativeTone, string> = {
  technical:
    'Usa un tono técnico orientado a un reporte de cumplimiento, con terminología de auditoría y cumplimiento normativo.',
  informative:
    'Usa un tono divulgativo, cercano y alentador, dirigido a la propia asociación de productores, evitando jerga técnica.',
  formal:
    'Usa un tono formal orientado a compradores y operadores que requieren documentación de debida diligencia.',
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

@Injectable()
export class EvaluationToolAiService {
  constructor(
    protected readonly context: AiDomainContext,
    protected readonly llmClient: AssessmentLlmClientService,
    @Optional() protected readonly logger?: StructuredLoggerService,
  ) {
    this.logger?.setContext({ service: `${context.logLabel}ToolAiService` });
  }

  // ── Prompts de sistema (parametrizados por dominio) ──────────────────────

  protected get improveObservationPrompt(): string {
    return `Eres un asistente que mejora la redacción de observaciones de auditoría en español, para evaluaciones de ${this.context.domain} de asociaciones de productores.
${ANTI_HALLUCINATION_RULE}
Responde solo con el texto de la observación mejorada, sin explicaciones ni markdown, en 1-3 oraciones concisas y profesionales.`;
  }

  protected get suggestMeasuresPrompt(): string {
    return `Eres un asesor de planes de acción para ${this.context.domain} de asociaciones de productores bajo el marco de evaluación.
Para cada KPI crítico recibido, propone UNA medida de acción concreta y accionable que atienda la brecha descrita.
${ANTI_HALLUCINATION_RULE}
"name" debe tener máximo 10 palabras; "description" máximo 2 oraciones.
Responde EXCLUSIVAMENTE con un array JSON válido, sin texto adicional antes o después, con este formato exacto:
[{"indicatorId": "...", "name": "...", "description": "..."}]`;
  }

  protected get detectInconsistenciesPrompt(): string {
    return `Eres un auditor que revisa evaluaciones de ${this.context.domain} de asociaciones de productores en español.
Analiza la lista de KPI calificados y detecta pares o grupos de KPI cuyas calificaciones u observaciones se contradicen lógicamente entre sí (por ejemplo, un KPI con calificación alta cuya observación describe un problema grave que debería reflejarse en la calificación de otro KPI relacionado con calificación baja, o viceversa).
${ANTI_HALLUCINATION_RULE}
Si no encuentras contradicciones, responde con un array vacío.
Responde EXCLUSIVAMENTE con un array JSON válido, sin texto adicional antes o después, con este formato exacto:
[{"indicatorIds": ["id1", "id2"], "description": "..."}]`;
  }

  protected get executiveNarrativePrompt(): string {
    return `Eres un asistente que redacta resúmenes ejecutivos en español para evaluaciones de ${this.context.domain} de asociaciones de productores.
${ANTI_HALLUCINATION_RULE}
Responde solo con el texto de la narrativa, sin explicaciones ni markdown, en 3-5 oraciones.`;
  }

  protected get reportInsightsPrompt(): string {
    const s = this.context.sectionLabel;
    return `Eres un consultor senior de cumplimiento normativo que analiza evaluaciones de ${this.context.domain} de asociaciones de productores para un reporte ejecutivo en diapositivas.
${ANTI_HALLUCINATION_RULE}
Con los puntajes por ${s} y los KPI críticos recibidos, produce:
- "keyFindings": 3 a 5 hallazgos clave, cada uno una oración concisa que sintetice un patrón real de los datos (no repitas un KPI por hallazgo, busca relaciones entre ${this.context.sectionLabelPlural}).
- "sectionAnalysis": un objeto cuyas claves sean EXACTAMENTE los números de ${s} recibidos (como string) y cuyo valor sea 1-2 oraciones analizando esa ${s} específica.
- "recommendations": 3 a 5 recomendaciones estratégicas priorizadas (la más urgente primero), cada una una oración accionable.
Responde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional antes o después, con este formato exacto:
{"keyFindings": ["..."], "sectionAnalysis": {"1": "...", "2": "..."}, "recommendations": ["..."]}`;
  }

  // ── Capacidades ──────────────────────────────────────────────────────────

  // Ahorro de tokens: una sola llamada sin historial, system prompt corto y
  // fijo, solo el KPI puntual (no el resto de la evaluación) y temperature baja.
  async improveObservation(
    indicator: AiIndicatorContext,
    score: number,
    observation: string,
  ): Promise<{ improved: string }> {
    const userPrompt = [
      `KPI: ${indicator.code} — ${indicator.name}`,
      indicator.description ? `Descripción: ${indicator.description}` : null,
      `Calificación: ${score}/10`,
      `Observación original: ${observation}`,
    ]
      .filter(Boolean)
      .join('\n');

    // 1500 (no 200) porque el alias "flash" de Gemini razona internamente antes
    // de escribir la respuesta visible y esos tokens cuentan contra este tope.
    const result = await this.llmClient.complete(
      this.improveObservationPrompt,
      userPrompt,
      1500,
      0.3,
    );
    this.log('observation improved', { tokensUsed: result.tokensUsed });
    return { improved: result.text.trim() };
  }

  // Ahorro de tokens: se llama con los KPI críticos de UNA sola sección a la
  // vez — nunca con todos los KPI críticos de la evaluación completa.
  async suggestMeasuresForSection(
    sectionName: string,
    criticalItems: AiCriticalItem[],
  ): Promise<AiMeasureSuggestion[]> {
    if (criticalItems.length === 0) return [];

    const userPrompt = [
      `${capitalize(this.context.sectionLabel)}: ${sectionName}`,
      'KPI críticos:',
      ...criticalItems.map(
        (item, idx) =>
          `${idx + 1}. id="${item.indicatorId}" ${item.code} — ${item.name}` +
          `${item.description ? ` (${item.description})` : ''}. ` +
          `Calificación: ${item.score}/10. Observación: ${item.observation}`,
      ),
    ].join('\n');

    // Base de 1200 para el razonamiento interno de Gemini + 300 por ítem.
    const maxOutputTokens = Math.min(1200 + 300 * criticalItems.length, 5000);
    const result = await this.llmClient.complete(
      this.suggestMeasuresPrompt,
      userPrompt,
      maxOutputTokens,
      0.3,
    );
    this.log('measures suggested', {
      section: sectionName,
      itemCount: criticalItems.length,
      tokensUsed: result.tokensUsed,
    });
    return parseAiMeasureSuggestions(
      result.text,
      criticalItems.map((i) => i.indicatorId),
    );
  }

  // Una sola llamada por evaluación, solo al intentar completarla. La
  // observación se trunca para acotar tokens de entrada.
  async detectInconsistencies(
    items: AiEvaluatedItem[],
  ): Promise<AiInconsistencyFinding[]> {
    if (items.length < 2) return [];

    const userPrompt = [
      'KPI calificados:',
      ...items.map(
        (item, idx) =>
          `${idx + 1}. id="${item.indicatorId}" ${item.code}. Calificación: ${item.score}/10. Observación: ${item.observation.slice(0, 150)}`,
      ),
    ].join('\n');

    const maxOutputTokens = Math.min(1500 + 40 * items.length, 4000);
    const result = await this.llmClient.complete(
      this.detectInconsistenciesPrompt,
      userPrompt,
      maxOutputTokens,
      0.2,
    );
    this.log('inconsistencies checked', {
      itemCount: items.length,
      tokensUsed: result.tokensUsed,
    });
    return parseAiInconsistencyFindings(
      result.text,
      items.map((i) => i.indicatorId),
    );
  }

  // Payload liviano (solo puntajes agregados y KPI críticos, nunca las
  // observaciones completas); la instrucción de tono va en el userPrompt.
  async generateExecutiveNarrative(
    context: AiReportContext,
    tone: NarrativeTone,
  ): Promise<{ narrative: string }> {
    const userPrompt = [
      NARRATIVE_TONE_INSTRUCTIONS[tone],
      ...this.describeReportContext(context),
    ].join('\n');

    const result = await this.llmClient.complete(
      this.executiveNarrativePrompt,
      userPrompt,
      1200,
      0.4,
    );
    this.log('executive narrative generated', {
      tone,
      tokensUsed: result.tokensUsed,
    });
    return { narrative: result.text.trim() };
  }

  // Análisis de calidad para el reporte PPTX — una sola llamada por export.
  async generateReportInsights(
    context: AiReportContext,
  ): Promise<AiReportInsights> {
    const userPrompt = this.describeReportContext(context).join('\n');
    const maxOutputTokens = Math.min(
      2000 + 150 * context.sectionScores.length,
      4000,
    );
    const result = await this.llmClient.complete(
      this.reportInsightsPrompt,
      userPrompt,
      maxOutputTokens,
      0.4,
    );
    this.log('report insights generated', { tokensUsed: result.tokensUsed });
    return parseAiReportInsights(
      result.text,
      context.sectionScores.map((s) => String(s.number)),
    );
  }

  protected describeReportContext(context: AiReportContext): string[] {
    return [
      `Puntaje global: ${context.globalScore}/10`,
      `Puntajes por ${this.context.sectionLabel}:`,
      ...context.sectionScores.map(
        (s) => `- ${s.number}. ${s.name}: ${s.weightedAvg}/10`,
      ),
      context.criticalItems.length > 0
        ? `KPI críticos: ${context.criticalItems
            .map((c) => `${c.code} (${c.name}, ${c.score}/10)`)
            .join('; ')}`
        : 'No hay KPI críticos.',
    ];
  }

  protected log(event: string, data: Record<string, unknown>) {
    this.logger?.info(`${this.context.logLabel} AI: ${event}`, data);
  }
}
