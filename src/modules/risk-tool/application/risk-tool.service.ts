import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CRITICAL_THRESHOLD } from '../../assessment-core/domain/assessment.constants';
import { RiskStrategy } from '../../assessment-core/domain/scoring.engine';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { AssessmentApplicabilityService } from '../../assessment-core/application/assessment-applicability.service';
import { AssessmentSessionGateway } from '../../assessment-session/infrastructure/assessment-session.gateway';
import { buildExecutiveNarrative } from '../../assessment-core/domain/assessment-narrative.util';
import {
  EvaluationToolService,
  ScoreKpiInput,
} from '../../evaluation-tool/application/evaluation-tool.service';
import { measureStatusFor } from '../../evaluation-tool/application/indicator-measure-tool.service';
import {
  EVALUATION_REPOSITORY,
  EvaluationRepository,
} from '../../evaluation-tool/domain/ports/evaluation.repository';
import {
  TEMPLATE_REPOSITORY,
  TemplateRepository,
} from '../../evaluation-tool/domain/ports/template.repository';
import {
  EvaluationWithStructure,
  MeasureCounts,
  NumericLike,
} from '../../evaluation-tool/domain/evaluation-tool.types';
import {
  CreateMitigationMeasureInput,
  RISK_REPOSITORY,
  RiskRepository,
  UpdateMitigationMeasureInput,
} from '../domain/ports/risk.repository';
import { RISK_TOOL_DEFINITION } from '../domain/risk-tool.definition';
import {
  buildMitigationPlanExcel,
  buildMitigationPlanPptx,
} from '../infrastructure/reports/risk-report.builders';
import {
  AiRiskItem,
  AiRiskMeasureSuggestion,
  RiskToolAiService,
} from './risk-tool-ai.service';

export interface RiskResponseInput {
  indicatorId: string;
  score: number;
  observation: string;
  riskDescription: string;
  riskType?: string;
}

export interface ScoreKpiRiskInput extends ScoreKpiInput {
  responses: RiskResponseInput[];
}

export type CreateRiskMeasureInput = Omit<
  CreateMitigationMeasureInput,
  'riskId' | 'startWeek' | 'endDate' | 'updatedBy'
> & { startWeek: string };

export type UpdateRiskMeasureInput = Omit<
  UpdateMitigationMeasureInput,
  'status' | 'updatedBy'
>;

// AiRiskItem lleva solo lo que necesita el prompt; riskId liga la sugerencia
// de vuelta a su riesgo al crear la medida y weight/threshold permiten calcular
// la prioridad de impacto sin otra consulta.
interface RiskItemWithId extends AiRiskItem {
  riskId: string;
  weight: number;
  threshold: number;
}

/**
 * Herramienta de Riesgos: el flujo común (plantilla, evaluación, puntuación,
 * panel, historial) viene de EvaluationToolService; acá se añade la
 * clasificación de riesgos por umbral (configurable por país), el plan de
 * mitigación con Gantt, sus exportes y las sugerencias de IA por riesgo.
 */
@Injectable()
export class RiskToolService extends EvaluationToolService {
  constructor(
    @Inject(TEMPLATE_REPOSITORY) templates: TemplateRepository,
    @Inject(EVALUATION_REPOSITORY) evaluations: EvaluationRepository,
    @Inject(RISK_REPOSITORY) private readonly risks: RiskRepository,
    auditService: AssessmentAuditService,
    private readonly riskAi: RiskToolAiService,
    applicabilityService: AssessmentApplicabilityService,
    sessionGateway: AssessmentSessionGateway,
  ) {
    super(
      RISK_TOOL_DEFINITION,
      templates,
      evaluations,
      auditService,
      riskAi,
      applicabilityService,
      sessionGateway,
    );
  }

  private get riskStrategy() {
    return this.strategy as RiskStrategy;
  }

  /**
   * El país de la organización evaluada determina el umbral de
   * despreciabilidad efectivo: parámetro por país (BD, configurable desde
   * administración) ?? umbral de la plantilla ?? 5.
   */
  private async resolveRiskThreshold(
    organisation: string,
    country: string,
    templateRiskThreshold: NumericLike | null,
  ): Promise<number> {
    const override = await this.risks.findCountryThreshold(
      organisation,
      country,
    );
    if (override !== null) return override;
    return templateRiskThreshold !== null ? Number(templateRiskThreshold) : 5;
  }

  // ── Parámetros de riesgo por país (administración) ───────────────────────

  listCountryParams(organisation: string) {
    return this.risks.listCountryParams(organisation);
  }

  async upsertCountryParam(
    organisation: string,
    country: string,
    riskThreshold: number,
    actorId?: string,
  ) {
    const saved = await this.risks.upsertCountryParam(
      organisation,
      country.toUpperCase(),
      riskThreshold,
      actorId,
    );
    await this.auditService.record(
      organisation,
      'assessment-risk.country-params-update',
      { country: saved.country, riskThreshold },
      actorId,
    );
    return saved;
  }

  async deleteCountryParam(
    organisation: string,
    country: string,
    actorId?: string,
  ) {
    await this.risks.deleteCountryParam(organisation, country.toUpperCase());
    await this.auditService.record(
      organisation,
      'assessment-risk.country-params-update',
      { country: country.toUpperCase(), riskThreshold: null },
      actorId,
    );
  }

  // ── Ganchos del flujo común ──────────────────────────────────────────────

  // Mismo flujo que la base; se redeclara solo para exigir riskDescription.
  override upsertResponses(
    organisation: string,
    evaluationId: string,
    dto: ScoreKpiRiskInput,
    actorId?: string,
  ) {
    return super.upsertResponses(organisation, evaluationId, dto, actorId);
  }

  // Respuestas y riesgos clasificados se guardan en la misma transacción.
  protected async persistResponses(
    evaluation: EvaluationWithStructure,
    dto: ScoreKpiRiskInput,
    scoredBy: string,
    actorId?: string,
  ): Promise<void> {
    const threshold = await this.resolveRiskThreshold(
      evaluation.organisation,
      evaluation.profile.country,
      evaluation.template.riskThreshold,
    );
    await this.risks.upsertResponsesWithRisks(
      evaluation.id,
      dto.responses.map((response) => ({
        ...response,
        class: this.riskStrategy.classifyRisk(response.score, threshold),
      })),
      scoredBy,
      CRITICAL_THRESHOLD,
    );
    await this.auditService.record(
      evaluation.organisation,
      'assessment-risk.upsert',
      { evaluationId: evaluation.id, count: dto.responses.length },
      actorId,
    );
  }

  // Críticos del panel = riesgos NON_NEGLIGIBLE sin medida de mitigación.
  protected countCriticalByEvaluation(
    evaluations: EvaluationWithStructure[],
  ): Promise<Map<string, number>> {
    return this.risks.countUnmitigatedByEvaluations(
      evaluations.map((e) => e.id),
    );
  }

  protected countMeasuresByEvaluation(
    _organisation: string,
    evaluationIds: string[],
  ): Promise<Map<string, MeasureCounts>> {
    return this.risks.countMeasuresByEvaluations(evaluationIds);
  }

  // ── Riesgos y plan de mitigación ─────────────────────────────────────────

  async listRisks(organisation: string, evaluationId: string) {
    await this.getEvaluationOrThrow(organisation, evaluationId);
    return this.risks.listByEvaluation(evaluationId);
  }

  private async findRiskOrThrow(organisation: string, riskId: string) {
    const risk = await this.risks.findById(organisation, riskId);
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }
    return risk;
  }

  // Solo se puede crear una medida sobre un riesgo NON_NEGLIGIBLE. endDate la
  // calcula el servicio (startWeek + durationDays), nunca el cliente.
  async createMeasure(
    organisation: string,
    riskId: string,
    dto: CreateRiskMeasureInput,
    actorId?: string,
  ) {
    const risk = await this.findRiskOrThrow(organisation, riskId);
    if (risk.class !== 'NON_NEGLIGIBLE') {
      throw new UnprocessableEntityException(
        'Mitigation measures can only be created for a NON_NEGLIGIBLE risk',
      );
    }

    const startWeek = new Date(dto.startWeek);
    const endDate = new Date(startWeek);
    endDate.setDate(endDate.getDate() + dto.durationDays);

    const measure = await this.risks.createMeasure({
      riskId,
      description: dto.description,
      responsible: dto.responsible,
      support: dto.support,
      startWeek,
      durationDays: dto.durationDays,
      endDate,
      resources: dto.resources,
      budgetUsd: dto.budgetUsd,
      verificationLink: dto.verificationLink,
      expectedResult: dto.expectedResult,
      appliedImprovements: dto.appliedImprovements,
      updatedBy: actorId ?? 'system',
    });

    await this.auditService.record(
      organisation,
      'assessment-measure.create',
      { measureId: measure.id, riskId },
      actorId,
    );

    return measure;
  }

  async updateMeasureProgress(
    organisation: string,
    measureId: string,
    dto: UpdateRiskMeasureInput,
    actorId?: string,
  ) {
    const measure = await this.risks.findMeasure(organisation, measureId);
    if (!measure) {
      throw new NotFoundException('Mitigation measure not found');
    }

    const status = measureStatusFor(dto.progressPct);
    const updated = await this.risks.updateMeasure(measureId, {
      progressPct: dto.progressPct,
      status,
      support: dto.support,
      budgetUsd: dto.budgetUsd,
      verificationLink: dto.verificationLink,
      expectedResult: dto.expectedResult,
      appliedImprovements: dto.appliedImprovements,
      updatedBy: actorId ?? 'system',
    });

    await this.auditService.record(
      organisation,
      'assessment-measure.progress',
      { measureId, progressPct: dto.progressPct, status },
      actorId,
    );

    return updated;
  }

  async gantt(organisation: string, evaluationId: string) {
    await this.getEvaluationOrThrow(organisation, evaluationId);
    const measures = await this.risks.listMeasuresByEvaluation(evaluationId);
    return measures.map((m) => ({
      measureId: m.id,
      description: m.description,
      responsible: m.responsible,
      start: m.startWeek,
      end: m.endDate,
      progressPct: m.progressPct,
      status: m.status,
    }));
  }

  // ── Exportes ─────────────────────────────────────────────────────────────

  async mitigationPlanExport(
    organisation: string,
    evaluationId: string,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const risks = await this.risks.listByEvaluation(evaluationId);
    const file = buildMitigationPlanExcel(this.definition, evaluation, risks);

    await this.auditService.record(
      organisation,
      'assessment-export.generate',
      { evaluationId, format: 'excel' },
      actorId,
    );
    return file;
  }

  async mitigationPlanExportPptx(
    organisation: string,
    evaluationId: string,
    narrative?: string,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const { sectionScores, globalScore } = await this.resolveScores(evaluation);
    const risks = await this.risks.listByEvaluation(evaluationId);
    const indicatorById = new Map(
      evaluation.template.sections
        .flatMap((s) => s.indicators)
        .map((i) => [i.id, i]),
    );
    const responseByIndicator = new Map(
      evaluation.responses.map((r) => [r.indicatorId, r]),
    );

    const insights = await this.tryGenerateReportInsights(
      organisation,
      evaluationId,
      this.buildAiReportContext(
        globalScore,
        sectionScores,
        risks
          .filter((r) => r.class === 'NON_NEGLIGIBLE')
          .map((r) => ({
            code: indicatorById.get(r.indicatorId)?.code ?? '',
            name: indicatorById.get(r.indicatorId)?.name ?? '',
            score: responseByIndicator.get(r.indicatorId)?.score ?? 0,
          })),
      ),
      actorId,
    );

    const finalNarrative =
      narrative && narrative.trim().length > 0
        ? narrative
        : buildExecutiveNarrative(evaluation.profile, sectionScores, this.tool);

    const history = await this.evaluationHistory(
      organisation,
      evaluation.profileId,
    );

    const file = await buildMitigationPlanPptx(this.definition, {
      evaluation,
      sectionScores,
      globalScore,
      risks,
      history,
      narrative: finalNarrative,
      insights,
    });

    await this.auditService.record(
      organisation,
      'assessment-export.generate',
      { evaluationId, format: 'pptx' },
      actorId,
    );
    return file;
  }

  // ── Sugerencias de medidas con IA y prioridad de impacto ─────────────────

  // Riesgos NON_NEGLIGIBLE sin medida, agrupados por número de sección, con
  // una sola consulta para toda la evaluación.
  private async getRisksWithoutMeasureBySection(
    evaluation: EvaluationWithStructure,
  ): Promise<Map<number, RiskItemWithId[]>> {
    const risks = await this.risks.listByEvaluation(evaluation.id);
    const responseByIndicator = new Map(
      evaluation.responses.map((r) => [r.indicatorId, r]),
    );
    const threshold = await this.resolveRiskThreshold(
      evaluation.organisation,
      evaluation.profile.country,
      evaluation.template.riskThreshold,
    );
    const pendingByIndicator = new Map(
      risks
        .filter((r) => r.class === 'NON_NEGLIGIBLE' && r.measures.length === 0)
        .map((r) => [r.indicatorId, r]),
    );

    const bySection = new Map<number, RiskItemWithId[]>();
    for (const section of evaluation.template.sections) {
      const items: RiskItemWithId[] = [];
      for (const indicator of section.indicators) {
        const risk = pendingByIndicator.get(indicator.id);
        if (!risk) continue;
        items.push({
          indicatorId: risk.indicatorId,
          code: indicator.code,
          name: indicator.name,
          description: indicator.description ?? undefined,
          score: responseByIndicator.get(risk.indicatorId)?.score ?? 0,
          riskDescription: risk.description,
          riskType: risk.riskType ?? undefined,
          riskId: risk.id,
          weight: Number(indicator.weight ?? 1),
          threshold,
        });
      }
      bySection.set(section.number, items);
    }
    return bySection;
  }

  async suggestMeasuresForSection(
    organisation: string,
    evaluationId: string,
    sectionNumber: number,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const section = evaluation.template.sections.find(
      (s) => s.number === sectionNumber,
    );
    if (!section) {
      throw new NotFoundException(
        `${this.sectionLabel} not found for this evaluation`,
      );
    }

    const riskItems =
      (await this.getRisksWithoutMeasureBySection(evaluation)).get(
        section.number,
      ) ?? [];
    const itemByIndicatorId = new Map(
      riskItems.map((item) => [item.indicatorId, item]),
    );

    const suggestions = await this.riskAi.suggestMeasuresForPrinciple(
      section.name,
      riskItems,
    );

    await this.auditService.record(
      organisation,
      'assessment-ai.call',
      { evaluationId, capability: 'suggest-measures', sectionNumber },
      actorId,
    );

    return {
      suggestions: suggestions
        .map((s) => {
          const item = itemByIndicatorId.get(s.indicatorId);
          return item ? { ...s, riskId: item.riskId } : null;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null),
    };
  }

  // Plan de mitigación completo: una llamada a la IA POR PRINCIPIO, saltando
  // los que no tienen riesgo pendiente; resultado ordenado por impacto.
  async suggestMeasuresForEvaluation(
    organisation: string,
    evaluationId: string,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const itemsBySection =
      await this.getRisksWithoutMeasureBySection(evaluation);

    const allSuggestions: Array<
      AiRiskMeasureSuggestion & {
        riskId: string;
        code: string;
        score: number;
        impactScore: number;
        sectionNumber: number;
        sectionName: string;
      }
    > = [];

    for (const section of evaluation.template.sections) {
      const riskItems = itemsBySection.get(section.number) ?? [];
      if (riskItems.length === 0) continue;

      const itemByIndicatorId = new Map(
        riskItems.map((item) => [item.indicatorId, item]),
      );
      const suggestions = await this.riskAi.suggestMeasuresForPrinciple(
        section.name,
        riskItems,
      );

      for (const suggestion of suggestions) {
        const item = itemByIndicatorId.get(suggestion.indicatorId);
        if (!item) continue;
        allSuggestions.push({
          ...suggestion,
          riskId: item.riskId,
          code: item.code,
          score: item.score,
          // Prioridad de impacto: peso × brecha bajo el umbral efectivo del país.
          impactScore: item.weight * (item.threshold - item.score),
          sectionNumber: section.number,
          sectionName: section.name,
        });
      }
    }

    allSuggestions.sort((a, b) => b.impactScore - a.impactScore);

    await this.auditService.record(
      organisation,
      'assessment-ai.call',
      {
        evaluationId,
        capability: 'suggest-measures',
        sectionsQueried: new Set(allSuggestions.map((s) => s.sectionNumber))
          .size,
      },
      actorId,
    );

    return { suggestions: allSuggestions };
  }

  // Ranking determinístico (peso × brecha bajo el umbral efectivo del país)
  // de los riesgos no despreciables aún sin medida — no llama a la IA.
  async getImpactPriority(organisation: string, evaluationId: string) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const itemsBySection =
      await this.getRisksWithoutMeasureBySection(evaluation);

    const items = evaluation.template.sections.flatMap((section) =>
      (itemsBySection.get(section.number) ?? []).map((item) => ({
        riskId: item.riskId,
        indicatorId: item.indicatorId,
        code: item.code,
        name: item.name,
        score: item.score,
        weight: item.weight,
        threshold: item.threshold,
        impactScore: item.weight * (item.threshold - item.score),
        sectionNumber: section.number,
        sectionName: section.name,
      })),
    );

    items.sort((a, b) => b.impactScore - a.impactScore);

    return { items };
  }
}
