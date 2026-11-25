import { Injectable, Optional } from '@nestjs/common';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import {
  AiCompletionResult,
  AssessmentLlmClientService,
} from '../../assessment-ai/application/assessment-llm-client.service';
import {
  AiCriticalItem,
  AiEvaluatedItem,
  AiIndicatorContext,
  AiInconsistencyFinding,
  AiMeasureSuggestion,
  AiReportContext,
  AiKpiContext,
  AiReportInsights,
  AiSwot,
  NarrativeTone,
  parseAiInconsistencyFindings,
  parseAiMeasureSuggestions,
  parseAiReportInsights,
  parseAiSwot,
  countryName,
} from '../domain/evaluation-tool-ai.types';

export interface AiDomainContext {
  domain: string;
  sectionLabel: string;
  sectionLabelPlural: string;
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

function readable(parse: () => unknown): boolean {
  try {
    parse();
    return true;
  } catch {
    return false;
  }
}

function usageOf(result: AiCompletionResult) {
  return {
    cached: !!result.cached,
    tokensUsed: result.tokensUsed,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    finishReason: result.finishReason,
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const REPORT_AI_BUDGET_MS = 8_000;
const MIN_ATTEMPT_MS = 2_000;

@Injectable()
export class EvaluationToolAiService {
  constructor(
    protected readonly context: AiDomainContext,
    protected readonly llmClient: AssessmentLlmClientService,
    @Optional() protected readonly logger?: StructuredLoggerService,
  ) {
    this.logger?.setContext({ service: `${context.logLabel}ToolAiService` });
  }

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
    return `Eres un consultor senior que analiza evaluaciones de ${this.context.domain} de asociaciones de productores para un reporte ejecutivo en diapositivas.
${ANTI_HALLUCINATION_RULE}
Con los puntajes por ${s}, los KPI mejor y peor calificados de cada ${s} y los KPI críticos recibidos, produce:
- "keyFindings": 3 hallazgos clave, cada uno una oración concisa que sintetice un patrón real de los datos (no repitas un KPI por hallazgo, busca relaciones entre ${this.context.sectionLabelPlural}).
- "sectionAnalysis": un objeto cuyas claves sean EXACTAMENTE los números de ${s} recibidos (como string) y cuyo valor sea UNA oración de máximo 25 palabras analizando esa ${s} específica.
- "strengths": máximo 4 fortalezas principales de la organización en general; cada una {"title": 2 a 4 palabras, "detail": una oración de máximo 20 palabras}.
- "gaps": máximo 4 brechas críticas de la organización en general, con el mismo formato.
- "conclusion": 1 o 2 oraciones (máximo 45 palabras) con la lectura de cierre: cómo va la asociación y qué debe priorizar.
- "sectionInsights": un objeto cuyas claves sean EXACTAMENTE los números de ${s} recibidos y cuyo valor sea {"strengths": [...], "gaps": [...]}, con máximo 2 puntos cada uno en el formato {"title": 2 a 4 palabras, "detail": máximo 15 palabras}, basados en los KPI de esa ${s}. Si una ${s} no tiene fortalezas o brechas claras, deja la lista vacía.
- "recommendations": 3 recomendaciones estratégicas priorizadas (la más urgente primero), cada una una oración accionable de máximo 25 palabras.
Sé conciso: no repitas la misma idea en varios campos.
Responde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional antes o después, con este formato exacto:
{"keyFindings": ["..."], "sectionAnalysis": {"1": "..."}, "strengths": [{"title": "...", "detail": "..."}], "gaps": [{"title": "...", "detail": "..."}], "conclusion": "...", "sectionInsights": {"1": {"strengths": [{"title": "...", "detail": "..."}], "gaps": [{"title": "...", "detail": "..."}]}}, "recommendations": ["..."]}`;
  }

  protected get swotPrompt(): string {
    return `Eres un consultor de desarrollo de cadenas de valor que prepara el análisis FODA de una asociación de productores a partir de su evaluación de ${this.context.domain}.
Fortalezas y debilidades: básalas ÚNICAMENTE en los puntajes y KPI recibidos; no inventes datos, cifras ni hechos de la organización.
Oportunidades: oportunidades de mercado reales para una organización de este tipo, producto y tamaño.
Amenazas: amenazas propias del contexto del país indicado (clima, precios internacionales, regulación, mercado, institucionalidad), sin inventar cifras ni fechas.
Máximo 4 puntos por cuadrante; cada punto es una sola oración en español de máximo 20 palabras.
Responde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional antes o después, con este formato exacto:
{"strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."], "threats": ["..."]}`;
  }

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

    const result = await this.llmClient.complete(
      this.improveObservationPrompt,
      userPrompt,
      1500,
      0.3,
    );
    this.log('observation improved', { tokensUsed: result.tokensUsed });
    return { improved: result.text.trim() };
  }

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
      undefined,
      { fast: true },
    );
    this.log('executive narrative generated', {
      tone,
      tokensUsed: result.tokensUsed,
    });
    return { narrative: result.text.trim() };
  }

  async generateReportInsights(
    context: AiReportContext,
  ): Promise<AiReportInsights> {
    const sectionNumbers = context.sectionScores.map((s) => String(s.number));
    const userPrompt = [
      ...this.describeReportContext(context, 'pct', false),
      ...this.describeSectionDetails(context),
    ].join('\n');
    const maxOutputTokens = Math.min(
      1800 + 300 * context.sectionScores.length,
      4500,
    );
    return this.completeReportJson(
      'report insights',
      this.reportInsightsPrompt,
      userPrompt,
      maxOutputTokens,
      0.4,
      (text) => parseAiReportInsights(text, sectionNumbers),
    );
  }

  async generateSwot(context: AiReportContext): Promise<AiSwot> {
    const userPrompt = [
      ...this.describeProfile(context),
      ...this.describeReportContext(context, 'pct', false),
      ...this.describeSectionDetails(context, { observations: false, max: 2 }),
    ].join('\n');
    return this.completeReportJson(
      'swot',
      this.swotPrompt,
      userPrompt,
      1500,
      0.5,
      parseAiSwot,
    );
  }

  private async completeReportJson<T>(
    capability: string,
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
    parse: (text: string) => T,
  ): Promise<T> {
    const started = Date.now();
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const remaining = REPORT_AI_BUDGET_MS - (Date.now() - started);
      if (attempt > 1 && remaining < MIN_ATTEMPT_MS) break;
      const result = await this.llmClient.complete(
        systemPrompt,
        userPrompt,
        maxOutputTokens,
        temperature,
        remaining,
        {
          fast: true,
          cache: true,
          json: true,
          isUsable: (text) => readable(() => parse(text)),
        },
      );
      this.log(`${capability} generated`, { ...usageOf(result), attempt });
      try {
        return this.parseOrWarn(capability, result.text, parse);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  protected describeProfile(context: AiReportContext): string[] {
    const p = context.profile;
    if (!p) return [];
    return [
      `Organización: ${p.name}`,
      p.type ? `Tipo: ${p.type}` : '',
      `País: ${countryName(p.country)}${p.region ? ` (${p.region})` : ''}`,
      p.mainProduct ? `Producto principal: ${p.mainProduct}` : '',
      p.memberCount ? `Socios: ${p.memberCount}` : '',
    ].filter(Boolean);
  }

  protected describeSectionDetails(
    context: AiReportContext,
    opts: { observations?: boolean; max?: number } = {},
  ): string[] {
    if (!context.sectionDetails?.length) return [];
    const withObservations = opts.observations ?? true;
    const max = opts.max ?? 3;
    const kpi = (k: AiKpiContext) =>
      `${k.code} ${k.name} (${Math.round(k.score * 10)} %)${withObservations && k.observation ? `: ${k.observation}` : ''}`;
    return context.sectionDetails.flatMap((d) => [
      `${capitalize(this.context.sectionLabel)} ${d.number}:`,
      ...d.best.slice(0, max).map((k) => `  + ${kpi(k)}`),
      ...d.worst.slice(0, max).map((k) => `  - ${kpi(k)}`),
    ]);
  }

  protected describeReportContext(
    context: AiReportContext,
    scale: 'score' | 'pct' = 'score',
    withCriticalList = true,
  ): string[] {
    const fmt = (score: number) =>
      scale === 'pct' ? `${Math.round(score * 10)} %` : `${score}/10`;
    return [
      `${scale === 'pct' ? 'Resultado global' : 'Puntaje global'}: ${fmt(context.globalScore)}`,
      `${scale === 'pct' ? 'Resultados' : 'Puntajes'} por ${this.context.sectionLabel}:`,
      ...context.sectionScores.map(
        (s) => `- ${s.number}. ${s.name}: ${fmt(s.weightedAvg)}`,
      ),
      !withCriticalList
        ? `KPI críticos: ${context.criticalItems.length}`
        : context.criticalItems.length > 0
          ? `KPI críticos: ${context.criticalItems
              .map((c) => `${c.code} (${c.name}, ${fmt(c.score)})`)
              .join('; ')}`
          : 'No hay KPI críticos.',
    ];
  }

  protected parseOrWarn<T>(
    capability: string,
    text: string,
    parse: (text: string) => T,
  ): T {
    try {
      return parse(text);
    } catch (error) {
      this.logger?.warn(
        `${this.context.logLabel} AI: unreadable ${capability} response`,
        {
          length: text.length,
          tail: text.slice(-120),
          reason: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  protected log(event: string, data: Record<string, unknown>) {
    this.logger?.info(`${this.context.logLabel} AI: ${event}`, data);
  }
}
