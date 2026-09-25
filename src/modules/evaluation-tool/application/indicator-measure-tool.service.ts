import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CRITICAL_THRESHOLD } from '../../assessment-core/domain/assessment.constants';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { AssessmentApplicabilityService } from '../../assessment-core/application/assessment-applicability.service';
import { AssessmentSessionGateway } from '../../assessment-session/infrastructure/assessment-session.gateway';
import { buildExecutiveNarrative } from '../../assessment-core/domain/assessment-narrative.util';
import { EvaluationToolDefinition } from '../domain/evaluation-tool.definition';
import {
  AiCriticalItem,
  AiMeasureSuggestion,
} from '../domain/evaluation-tool-ai.types';
import { EvaluationRepository } from '../domain/ports/evaluation.repository';
import {
  CreateIndicatorMeasureInput,
  IndicatorMeasureRepository,
  UpdateIndicatorMeasureInput,
} from '../domain/ports/indicator-measure.repository';
import { TemplateRepository } from '../domain/ports/template.repository';
import {
  EvaluationWithStructure,
  MeasureCounts,
  MeasureStatus,
} from '../domain/evaluation-tool.types';
import {
  buildSummaryExcel,
  buildSummaryPptx,
} from '../infrastructure/reports/evaluation-report.builders';
import { EvaluationToolAiService } from './evaluation-tool-ai.service';
import { EvaluationToolService } from './evaluation-tool.service';

export type CreateMeasureInput = Omit<
  CreateIndicatorMeasureInput,
  'organisation' | 'evaluationId' | 'startDate' | 'endDate' | 'updatedBy'
> & { startDate: string; endDate: string };

export type UpdateMeasureInput = Omit<
  UpdateIndicatorMeasureInput,
  'status' | 'updatedBy'
>;

// AiCriticalItem lleva solo lo que necesita el prompt de IA; weight se agrega
// acá para poder calcular impactScore (prioridad) sin otra consulta.
interface CriticalItemWithWeight extends AiCriticalItem {
  weight: number;
}

export function measureStatusFor(progressPct: number): MeasureStatus {
  if (progressPct >= 100) return 'DONE';
  if (progressPct > 0) return 'IN_PROGRESS';
  return 'PENDING';
}

/**
 * Herramienta cuyo plan de acción liga medidas directamente a KPI críticos
 * (Organizativa y de Capacidades). Añade al flujo común: medidas por
 * indicador, exportes Excel/PPTX, asistencia con IA y prioridad de impacto.
 */
export abstract class IndicatorMeasureToolService extends EvaluationToolService {
  protected constructor(
    definition: EvaluationToolDefinition,
    templates: TemplateRepository,
    evaluations: EvaluationRepository,
    protected readonly measures: IndicatorMeasureRepository,
    auditService: AssessmentAuditService,
    aiService: EvaluationToolAiService,
    applicabilityService: AssessmentApplicabilityService,
    sessionGateway: AssessmentSessionGateway,
  ) {
    super(
      definition,
      templates,
      evaluations,
      auditService,
      aiService,
      applicabilityService,
      sessionGateway,
    );
  }

  protected countMeasuresByEvaluation(
    organisation: string,
    evaluationIds: string[],
  ): Promise<Map<string, MeasureCounts>> {
    return this.measures.countByEvaluations(organisation, evaluationIds);
  }

  // ── Exportes ─────────────────────────────────────────────────────────────

  async summaryExport(
    organisation: string,
    evaluationId: string,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const { sectionScores } = await this.resolveScores(evaluation);
    const file = buildSummaryExcel(this.definition, evaluation, sectionScores);

    await this.auditService.record(
      organisation,
      'assessment-export.generate',
      { evaluationId, format: 'excel' },
      actorId,
    );
    return file;
  }

  // Reporte en diapositivas: mismo dato del resumen más un análisis de
  // calidad generado por IA (una sola llamada por export). Si la IA falla el
  // reporte se genera igual sin esas diapositivas.
  async summaryExportPptx(
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
    const measures = await this.listMeasures(organisation, evaluationId);
    const criticalResponses = evaluation.responses.filter((r) => r.isCritical);

    const insights = await this.tryGenerateReportInsights(
      organisation,
      evaluationId,
      this.buildAiReportContext(
        globalScore,
        sectionScores,
        criticalResponses.map((r) => ({
          code: r.indicator.code,
          name: r.indicator.name,
          score: r.score,
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

    const file = await buildSummaryPptx(this.definition, {
      evaluation,
      sectionScores,
      globalScore,
      measures,
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

  // ── Plan de acción (KPI crítico → medida) ────────────────────────────────

  async listMeasures(organisation: string, evaluationId: string) {
    await this.getEvaluationOrThrow(organisation, evaluationId);
    return this.measures.listByEvaluation(organisation, evaluationId);
  }

  async createMeasure(
    organisation: string,
    evaluationId: string,
    dto: CreateMeasureInput,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const response = evaluation.responses.find(
      (r) => r.indicatorId === dto.indicatorId,
    );
    if (!response || !response.isCritical) {
      throw new UnprocessableEntityException(
        'Measures can only be created for a critical KPI (score <= 5) of this evaluation',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('endDate must not be before startDate');
    }

    const measure = await this.measures.create({
      organisation,
      evaluationId,
      indicatorId: dto.indicatorId,
      name: dto.name,
      description: dto.description,
      responsible: dto.responsible,
      support: dto.support,
      startDate,
      endDate,
      budgetUsd: dto.budgetUsd,
      verificationLink: dto.verificationLink,
      expectedResult: dto.expectedResult,
      appliedImprovements: dto.appliedImprovements,
      updatedBy: actorId ?? 'system',
    });

    await this.auditService.record(
      organisation,
      'assessment-measure.create',
      { measureId: measure.id, evaluationId, indicatorId: dto.indicatorId },
      actorId,
    );

    return measure;
  }

  async updateMeasureProgress(
    organisation: string,
    measureId: string,
    dto: UpdateMeasureInput,
    actorId?: string,
  ) {
    const measure = await this.measures.findById(organisation, measureId);
    if (!measure) {
      throw new NotFoundException('Mitigation measure not found');
    }

    const status = measureStatusFor(dto.progressPct);
    const updated = await this.measures.update(measureId, {
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

  // ── Sugerencias de medidas con IA y prioridad de impacto ─────────────

  protected getCriticalItemsWithoutMeasure(
    evaluation: EvaluationWithStructure,
    section: EvaluationWithStructure['template']['sections'][number],
    indicatorsWithMeasure: Set<string>,
  ): CriticalItemWithWeight[] {
    const responseByIndicator = new Map(
      evaluation.responses.map((r) => [r.indicatorId, r]),
    );

    return section.indicators
      .map((indicator) => responseByIndicator.get(indicator.id))
      .filter(
        (response): response is (typeof evaluation.responses)[number] =>
          response !== undefined &&
          response.isCritical &&
          !indicatorsWithMeasure.has(response.indicatorId),
      )
      .map((response) => ({
        indicatorId: response.indicatorId,
        code: response.indicator.code,
        name: response.indicator.name,
        description: response.indicator.description ?? undefined,
        score: response.score,
        observation: response.observation,
        weight: Number(response.indicator.weight),
      }));
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

    const indicatorsWithMeasure = await this.measures.indicatorIdsWithMeasure(
      organisation,
      evaluationId,
    );
    const criticalItems = this.getCriticalItemsWithoutMeasure(
      evaluation,
      section,
      indicatorsWithMeasure,
    );

    const suggestions = await this.aiService.suggestMeasuresForSection(
      section.name,
      criticalItems,
    );

    await this.auditService.record(
      organisation,
      'assessment-ai.call',
      { evaluationId, capability: 'suggest-measures', sectionNumber },
      actorId,
    );

    return { suggestions };
  }

  // Plan de acción completo: llama a la IA UNA VEZ POR SECCIÓN (nunca con
  // todos los KPI críticos juntos), saltando las secciones sin KPI crítico
  // pendiente. Devuelve una sola lista ordenada por prioridad de impacto.
  async suggestMeasuresForEvaluation(
    organisation: string,
    evaluationId: string,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const indicatorsWithMeasure = await this.measures.indicatorIdsWithMeasure(
      organisation,
      evaluationId,
    );

    const allSuggestions: Array<
      AiMeasureSuggestion & {
        code: string;
        score: number;
        impactScore: number;
        sectionNumber: number;
        sectionName: string;
      }
    > = [];

    for (const section of evaluation.template.sections) {
      const criticalItems = this.getCriticalItemsWithoutMeasure(
        evaluation,
        section,
        indicatorsWithMeasure,
      );
      if (criticalItems.length === 0) continue;

      const suggestions = await this.aiService.suggestMeasuresForSection(
        section.name,
        criticalItems,
      );
      const itemByIndicatorId = new Map(
        criticalItems.map((item) => [item.indicatorId, item]),
      );

      for (const suggestion of suggestions) {
        const item = itemByIndicatorId.get(suggestion.indicatorId);
        if (!item) continue;
        allSuggestions.push({
          ...suggestion,
          code: item.code,
          score: item.score,
          // Prioridad de impacto: peso del indicador × brecha bajo el umbral
          // de criticidad — determinístico y sin costo de IA adicional.
          impactScore: item.weight * (CRITICAL_THRESHOLD - item.score),
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

  // Prioridad de impacto: ranking determinístico (peso × brecha bajo el
  // umbral) de los KPI críticos aún sin medida — no llama a la IA.
  async getImpactPriority(organisation: string, evaluationId: string) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const indicatorsWithMeasure = await this.measures.indicatorIdsWithMeasure(
      organisation,
      evaluationId,
    );

    const items = evaluation.template.sections.flatMap((section) =>
      this.getCriticalItemsWithoutMeasure(
        evaluation,
        section,
        indicatorsWithMeasure,
      ).map((item) => ({
        indicatorId: item.indicatorId,
        code: item.code,
        name: item.name,
        score: item.score,
        weight: item.weight,
        impactScore: item.weight * (CRITICAL_THRESHOLD - item.score),
        sectionNumber: section.number,
        sectionName: section.name,
      })),
    );

    items.sort((a, b) => b.impactScore - a.impactScore);

    return { items };
  }
}
