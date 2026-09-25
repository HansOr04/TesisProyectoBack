import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PaginationQueryDto,
  pageArgs,
  pageResult,
} from '../../../shared/presentation/pagination';
import { SectionScoreInput } from '../../assessment-core/domain/scoring.engine';
import { CRITICAL_THRESHOLD } from '../../assessment-core/domain/assessment.constants';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { AssessmentApplicabilityService } from '../../assessment-core/application/assessment-applicability.service';
import { AssessmentProfileScope } from '../../assessment-core/application/assessment-access-scope.service';
import { AssessmentSessionGateway } from '../../assessment-session/infrastructure/assessment-session.gateway';
import { EvaluationToolDefinition } from '../domain/evaluation-tool.definition';
import {
  AiEvaluatedItem,
  AiReportContext,
  AiReportInsights,
  NarrativeTone,
} from '../domain/evaluation-tool-ai.types';
import { EvaluationToolAiService } from './evaluation-tool-ai.service';
import {
  EvaluationRepository,
  ResponseInput,
} from '../domain/ports/evaluation.repository';
import {
  DuplicateStructureError,
  IndicatorInput,
  SectionInput,
  TemplateRepository,
} from '../domain/ports/template.repository';
import {
  EvaluationWithStructure,
  MeasureCounts,
  OrganisationOverviewRow,
  ProfileRecord,
  SectionScoreResult,
  TemplateWithStructure,
} from '../domain/evaluation-tool.types';

export interface ScoreKpiInput {
  responses: ResponseInput[];
}

export interface ScoreResult {
  sectionScores: SectionScoreResult[];
  globalScore: number;
}

// Datos precargados en lote para construir el panel de organizaciones sin N+1.
export interface OverviewContext {
  latestByProfile: Map<string, EvaluationWithStructure>;
  excludedByProfile: Map<string, Set<string>>;
  criticalByEvaluation: Map<string, number>;
}

/**
 * Flujo común de una herramienta de evaluación (Template Method): plantilla
 * versionada → evaluación por perfil → calificación de KPI → cierre con
 * puntajes → panel de organizaciones e historial. Las herramientas concretas
 * aportan su EvaluationToolDefinition (código, etiquetas, estrategia) y
 * redefinen los ganchos (`persistResponses`, `countCriticalByEvaluation`,
 * `countMeasuresByEvaluation`) cuando su modelo de medidas difiere.
 *
 * No conoce el ORM: toda la persistencia entra por los puertos
 * TemplateRepository y EvaluationRepository.
 */
export abstract class EvaluationToolService {
  protected constructor(
    protected readonly definition: EvaluationToolDefinition,
    protected readonly templates: TemplateRepository,
    protected readonly evaluations: EvaluationRepository,
    protected readonly auditService: AssessmentAuditService,
    protected readonly aiService: EvaluationToolAiService,
    protected readonly applicabilityService: AssessmentApplicabilityService,
    protected readonly sessionGateway: AssessmentSessionGateway,
  ) {}

  protected get tool() {
    return this.definition.code;
  }

  protected get strategy() {
    return this.definition.strategy;
  }

  protected get sectionLabel() {
    return this.definition.section.singularEn;
  }

  // ── Ganchos redefinibles por herramienta ─────────────────────────────────

  /**
   * Persiste las respuestas de KPI. Riesgos lo redefine para clasificar y
   * guardar los riesgos en la misma transacción.
   */
  protected async persistResponses(
    evaluation: EvaluationWithStructure,
    dto: ScoreKpiInput,
    scoredBy: string,
    _actorId?: string,
  ): Promise<void> {
    await this.evaluations.upsertResponses(
      evaluation.id,
      dto.responses,
      scoredBy,
      CRITICAL_THRESHOLD,
    );
  }

  /** Críticos por evaluación para el panel (KPI críticos por defecto). */
  protected countCriticalByEvaluation(
    evaluations: EvaluationWithStructure[],
  ): Promise<Map<string, number>> {
    return Promise.resolve(
      new Map(
        evaluations.map((e) => [
          e.id,
          e.responses.filter((r) => r.isCritical).length,
        ]),
      ),
    );
  }

  /** Total/hechas de medidas por evaluación para el historial de evolución. */
  protected abstract countMeasuresByEvaluation(
    organisation: string,
    evaluationIds: string[],
  ): Promise<Map<string, MeasureCounts>>;

  // ── Estructura (administrador) ───────────────────────────────────────────

  /**
   * Trazabilidad de cambios estructurales: registra en la auditoría qué
   * entidad cambió y cada campo con su valor anterior y nuevo.
   */
  private async recordStructureChange(
    organisation: string,
    entity: 'section' | 'indicator',
    operation: 'create' | 'update' | 'delete',
    target: { id: string; templateId?: string },
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    actorId?: string,
  ) {
    const fields = Object.keys(after).filter(
      (key) =>
        after[key] !== undefined &&
        String(before[key] ?? '') !== String(after[key] ?? ''),
    );
    if (operation === 'update' && fields.length === 0) return;
    await this.auditService.record(
      organisation,
      'assessment-template.change',
      {
        tool: this.tool,
        entity,
        operation,
        entityId: target.id,
        templateId: target.templateId,
        changes: fields.map((field) => ({
          field,
          before: before[field] ?? null,
          after: after[field] ?? null,
        })),
      },
      actorId,
    );
  }

  async listTemplates(organisation: string) {
    return this.templates.findAll(organisation, this.tool);
  }

  async getTemplate(
    organisation: string,
    id: string,
  ): Promise<TemplateWithStructure> {
    const template = await this.templates.findById(organisation, this.tool, id);
    if (!template) {
      throw new NotFoundException(`${this.definition.code} template not found`);
    }
    return template;
  }

  protected async getActiveTemplate(
    organisation: string,
  ): Promise<TemplateWithStructure> {
    const template = await this.templates.findActive(organisation, this.tool);
    if (!template) {
      throw new NotFoundException(
        `No active ${this.definition.code} template found for this organisation. Run the Assessment seed first.`,
      );
    }
    return template;
  }

  /**
   * Devuelve una plantilla segura de mutar estructuralmente: la vigente si
   * ninguna evaluación la referencia, o una nueva versión clonada (la anterior
   * se desactiva) — así una edición nunca cambia lo que ve una evaluación ya
   * iniciada (regla de inmutabilidad).
   */
  protected async ensureWritableTemplate(
    organisation: string,
    templateId: string,
    actorId?: string,
  ): Promise<TemplateWithStructure> {
    const current = await this.templates.findById(
      organisation,
      this.tool,
      templateId,
    );
    if (!current) {
      throw new NotFoundException(`${this.definition.code} template not found`);
    }
    const evaluationCount = await this.templates.countEvaluations(templateId);
    if (evaluationCount === 0) {
      return current;
    }
    return this.templates.cloneAsNewVersion(current, actorId);
  }

  async createSection(
    organisation: string,
    templateId: string,
    dto: Required<Pick<SectionInput, 'number' | 'name'>> & SectionInput,
    actorId?: string,
  ) {
    const writable = await this.ensureWritableTemplate(
      organisation,
      templateId,
      actorId,
    );
    try {
      const created = await this.templates.createSection(writable.id, dto);
      await this.recordStructureChange(
        organisation,
        'section',
        'create',
        created,
        {},
        { number: dto.number, name: dto.name, weight: dto.weight ?? 1 },
        actorId,
      );
      return created;
    } catch (error) {
      if (error instanceof DuplicateStructureError) {
        throw new ConflictException(
          `${this.sectionLabel} number ${dto.number} already exists in this template`,
        );
      }
      throw error;
    }
  }

  protected async findSectionOrThrow(organisation: string, sectionId: string) {
    const section = await this.templates.findSection(
      organisation,
      this.tool,
      sectionId,
    );
    if (!section) {
      throw new NotFoundException(`${this.sectionLabel} not found`);
    }
    return section;
  }

  protected async assertSectionEditable(sectionId: string, confirm: boolean) {
    if (confirm) return;
    const scoredActive =
      await this.templates.countScoredResponsesInActiveEvaluations({
        sectionId,
      });
    if (scoredActive > 0) {
      throw new ConflictException(
        `This ${this.sectionLabel.toLowerCase()} has scored responses in an active evaluation. Pass ?confirm=true to edit anyway.`,
      );
    }
  }

  async updateSection(
    organisation: string,
    sectionId: string,
    dto: SectionInput,
    confirm: boolean,
    actorId?: string,
  ) {
    const section = await this.findSectionOrThrow(organisation, sectionId);
    await this.assertSectionEditable(sectionId, confirm);

    const writable = await this.ensureWritableTemplate(
      organisation,
      section.templateId,
      actorId,
    );
    const target =
      writable.id === section.templateId
        ? section
        : writable.sections.find((s) => s.number === section.number);
    if (!target) {
      throw new NotFoundException(
        `${this.sectionLabel} not found in the new template version`,
      );
    }
    const updated = await this.templates.updateSection(target.id, dto);
    await this.recordStructureChange(
      organisation,
      'section',
      'update',
      target,
      {
        number: target.number,
        name: target.name,
        description: target.description,
        weight: Number(target.weight),
      },
      { ...dto },
      actorId,
    );
    return updated;
  }

  async deleteSection(
    organisation: string,
    sectionId: string,
    confirm: boolean,
    actorId?: string,
  ) {
    const section = await this.findSectionOrThrow(organisation, sectionId);
    await this.assertSectionEditable(sectionId, confirm);

    const writable = await this.ensureWritableTemplate(
      organisation,
      section.templateId,
      actorId,
    );
    const target =
      writable.id === section.templateId
        ? section
        : writable.sections.find((s) => s.number === section.number);
    if (!target) {
      return;
    }
    await this.templates.softDeleteSection(target.id);
    await this.recordStructureChange(
      organisation,
      'section',
      'delete',
      target,
      { number: target.number, name: target.name },
      {},
      actorId,
    );
  }

  async createIndicator(
    organisation: string,
    sectionId: string,
    dto: Required<Pick<IndicatorInput, 'code' | 'name'>> & IndicatorInput,
    actorId?: string,
  ) {
    const section = await this.findSectionOrThrow(organisation, sectionId);
    const writable = await this.ensureWritableTemplate(
      organisation,
      section.templateId,
      actorId,
    );
    const targetSection =
      writable.id === section.templateId
        ? section
        : writable.sections.find((s) => s.number === section.number);
    if (!targetSection) {
      throw new NotFoundException(
        `${this.sectionLabel} not found in the new template version`,
      );
    }

    try {
      const created = await this.templates.createIndicator(
        targetSection.id,
        dto,
      );
      await this.recordStructureChange(
        organisation,
        'indicator',
        'create',
        { ...created, templateId: targetSection.templateId },
        {},
        { code: dto.code, name: dto.name, weight: dto.weight ?? 1 },
        actorId,
      );
      return created;
    } catch (error) {
      if (error instanceof DuplicateStructureError) {
        throw new ConflictException(
          `KPI code "${dto.code}" already exists in this ${this.sectionLabel.toLowerCase()}`,
        );
      }
      throw error;
    }
  }

  protected async findIndicatorOrThrow(
    organisation: string,
    indicatorId: string,
  ) {
    const indicator = await this.templates.findIndicator(
      organisation,
      this.tool,
      indicatorId,
    );
    if (!indicator) {
      throw new NotFoundException('KPI not found');
    }
    return indicator;
  }

  protected async assertIndicatorEditable(
    indicatorId: string,
    confirm: boolean,
  ) {
    if (confirm) return;
    const scoredActive =
      await this.templates.countScoredResponsesInActiveEvaluations({
        indicatorId,
      });
    if (scoredActive > 0) {
      throw new ConflictException(
        'This KPI has scored responses in an active evaluation. Pass ?confirm=true to edit anyway.',
      );
    }
  }

  async updateIndicator(
    organisation: string,
    indicatorId: string,
    dto: IndicatorInput,
    confirm: boolean,
    actorId?: string,
  ) {
    const indicator = await this.findIndicatorOrThrow(
      organisation,
      indicatorId,
    );
    await this.assertIndicatorEditable(indicatorId, confirm);

    const section = await this.templates.findSectionById(indicator.sectionId);
    const writable = await this.ensureWritableTemplate(
      organisation,
      section.templateId,
      actorId,
    );
    const target =
      writable.id === section.templateId
        ? indicator
        : writable.sections
            .find((s) => s.number === section.number)
            ?.indicators.find((i) => i.code === indicator.code);
    if (!target) {
      throw new NotFoundException('KPI not found in the new template version');
    }
    const updated = await this.templates.updateIndicator(target.id, dto);
    await this.recordStructureChange(
      organisation,
      'indicator',
      'update',
      { ...target, templateId: section.templateId },
      {
        code: target.code,
        name: target.name,
        description: target.description,
        helpText: target.helpText,
        scoringRubric: target.scoringRubric,
        weight: Number(target.weight),
        active: target.active,
      },
      { ...dto },
      actorId,
    );
    return updated;
  }

  async deleteIndicator(
    organisation: string,
    indicatorId: string,
    confirm: boolean,
    actorId?: string,
  ) {
    const indicator = await this.findIndicatorOrThrow(
      organisation,
      indicatorId,
    );
    await this.assertIndicatorEditable(indicatorId, confirm);

    const section = await this.templates.findSectionById(indicator.sectionId);
    const writable = await this.ensureWritableTemplate(
      organisation,
      section.templateId,
      actorId,
    );
    const target =
      writable.id === section.templateId
        ? indicator
        : writable.sections
            .find((s) => s.number === section.number)
            ?.indicators.find((i) => i.code === indicator.code);
    if (!target) {
      return;
    }
    await this.templates.softDeleteIndicator(target.id);
    await this.recordStructureChange(
      organisation,
      'indicator',
      'delete',
      { ...target, templateId: section.templateId },
      { code: target.code, name: target.name },
      {},
      actorId,
    );
  }

  // ── Evaluaciones y respuestas ────────────────────────────────────────────

  async createEvaluation(
    organisation: string,
    dto: { profileId: string },
    actorId?: string,
  ) {
    const profile = await this.evaluations.findProfile(
      organisation,
      dto.profileId,
    );
    if (!profile) {
      throw new NotFoundException('Assessment organisation profile not found');
    }

    const template = await this.getActiveTemplate(organisation);

    // Idempotencia: si ya hay una evaluación en curso para este perfil se
    // devuelve esa en vez de crear un duplicado (doble clic, recarga).
    const active = await this.evaluations.findActiveForProfile(
      organisation,
      this.tool,
      profile.id,
    );
    if (active) {
      return this.getEvaluationOrThrow(organisation, active.id);
    }

    const evaluation = await this.evaluations.create({
      organisation,
      templateId: template.id,
      profileId: profile.id,
      startedBy: actorId ?? 'system',
    });

    await this.auditService.record(
      organisation,
      'assessment-evaluation.create',
      {
        evaluationId: evaluation.id,
        profileId: profile.id,
        templateId: template.id,
      },
      actorId,
    );

    return this.getEvaluationOrThrow(organisation, evaluation.id);
  }

  async listEvaluations(
    organisation: string,
    query: PaginationQueryDto = new PaginationQueryDto(),
  ) {
    const { items, total } = await this.evaluations.list(
      organisation,
      this.tool,
      pageArgs(query),
    );
    return pageResult(query, items, total);
  }

  protected async getEvaluationOrThrow(
    organisation: string,
    evaluationId: string,
  ): Promise<EvaluationWithStructure> {
    const evaluation = await this.evaluations.findWithStructure(
      organisation,
      this.tool,
      evaluationId,
    );
    if (!evaluation) {
      throw new NotFoundException(
        `${this.definition.code} evaluation not found`,
      );
    }
    return evaluation;
  }

  async getEvaluation(organisation: string, evaluationId: string) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    return this.toEvaluationPayload(evaluation);
  }

  protected async toEvaluationPayload(evaluation: EvaluationWithStructure) {
    const [
      { sectionScores, globalScore },
      excludedSectionIds,
      excludedIndicatorIds,
    ] = await Promise.all([
      this.resolveScores(evaluation),
      this.applicabilityService.resolveExcludedSectionIds(evaluation.profileId),
      this.applicabilityService.resolveExcludedIndicatorIds(
        evaluation.profileId,
      ),
    ]);

    return {
      ...evaluation,
      sectionScores,
      globalScore,
      template: {
        ...evaluation.template,
        sections: evaluation.template.sections.map((section) => ({
          ...section,
          applicable: !excludedSectionIds.has(section.id),
          indicators: section.indicators.map((indicator) => ({
            ...indicator,
            applicable:
              !excludedSectionIds.has(section.id) &&
              !excludedIndicatorIds.has(indicator.id),
          })),
        })),
      },
    };
  }

  /** Puntajes persistidos si la evaluación está completada; si no, en vivo. */
  protected async resolveScores(
    evaluation: EvaluationWithStructure,
  ): Promise<ScoreResult> {
    if (evaluation.status === 'COMPLETED' && evaluation.sectionScores) {
      return {
        sectionScores: evaluation.sectionScores as SectionScoreResult[],
        globalScore: Number(evaluation.globalScore ?? 0),
      };
    }
    const excludedIndicatorIds =
      await this.applicabilityService.resolveExcludedIndicatorIds(
        evaluation.profileId,
      );
    return this.computeScores(
      evaluation.template,
      evaluation.responses,
      excludedIndicatorIds,
    );
  }

  protected computeScores(
    template: TemplateWithStructure,
    responses: EvaluationWithStructure['responses'],
    excludedIndicatorIds: Set<string> = new Set(),
  ): ScoreResult {
    const scoreByIndicator = new Map(
      responses.map((r) => [r.indicatorId, r.score]),
    );

    const sectionInputs: SectionScoreInput[] = template.sections.map(
      (section) => ({
        sectionId: section.id,
        weight: Number(section.weight),
        indicators: section.indicators
          .filter(
            (indicator) =>
              indicator.active &&
              !excludedIndicatorIds.has(indicator.id) &&
              scoreByIndicator.has(indicator.id),
          )
          .map((indicator) => ({
            weight: Number(indicator.weight),
            score: scoreByIndicator.get(indicator.id) as number,
          })),
      }),
    );

    const sectionScores: SectionScoreResult[] = template.sections.map(
      (section) => {
        const input = sectionInputs.find(
          (s) => s.sectionId === section.id,
        ) as SectionScoreInput;
        const weightedAvg =
          input.indicators.length > 0 ? this.strategy.sectionAverage(input) : 0;
        return {
          sectionId: section.id,
          number: section.number,
          name: section.name,
          weight: Number(section.weight),
          weightedAvg,
          critical:
            input.indicators.length > 0 &&
            this.strategy.isCritical(weightedAvg),
        };
      },
    );

    const scoredSections = sectionInputs.filter((s) => s.indicators.length > 0);
    const globalScore =
      scoredSections.length > 0 ? this.strategy.globalScore(scoredSections) : 0;

    return { sectionScores, globalScore };
  }

  async upsertResponses(
    organisation: string,
    evaluationId: string,
    dto: ScoreKpiInput,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    if (evaluation.status === 'COMPLETED' || evaluation.status === 'ARCHIVED') {
      throw new ConflictException(
        'Cannot score a completed or archived evaluation',
      );
    }

    const validIndicatorIds = new Set(
      evaluation.template.sections.flatMap((s) =>
        s.indicators.map((i) => i.id),
      ),
    );
    for (const response of dto.responses) {
      if (!validIndicatorIds.has(response.indicatorId)) {
        throw new BadRequestException(
          `Indicator ${response.indicatorId} does not belong to this evaluation's template`,
        );
      }
    }

    const scoredBy = actorId ?? 'system';
    await this.persistResponses(evaluation, dto, scoredBy, actorId);

    if (evaluation.status === 'DRAFT') {
      await this.evaluations.setStatus(evaluationId, 'IN_PROGRESS');
    }

    await this.auditService.record(
      organisation,
      'assessment-response.upsert',
      { evaluationId, count: dto.responses.length },
      actorId,
    );

    this.sessionGateway.emitScoreUpdated(evaluationId, {
      evaluationId,
      indicatorIds: dto.responses.map((r) => r.indicatorId),
      scoredBy,
    });

    return this.getEvaluation(organisation, evaluationId);
  }

  async complete(organisation: string, evaluationId: string, actorId?: string) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );

    const excludedSectionIds =
      await this.applicabilityService.resolveExcludedSectionIds(
        evaluation.profileId,
      );
    const excludedIndicatorIds =
      await this.applicabilityService.resolveExcludedIndicatorIds(
        evaluation.profileId,
      );
    const applicableIndicators = evaluation.template.sections
      .filter((s) => !excludedSectionIds.has(s.id))
      .flatMap((s) =>
        s.indicators.filter((i) => i.active && !excludedIndicatorIds.has(i.id)),
      );
    const answeredIds = new Set(evaluation.responses.map((r) => r.indicatorId));
    const missing = applicableIndicators.filter((i) => !answeredIds.has(i.id));
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Missing responses for one or more active KPI',
        missing: missing.map((i) => ({ id: i.id, code: i.code, name: i.name })),
      });
    }

    const scores = this.computeScores(
      evaluation.template,
      evaluation.responses,
      excludedIndicatorIds,
    );
    const updated = await this.evaluations.complete(evaluationId, scores);

    await this.auditService.record(
      organisation,
      'assessment-evaluation.complete',
      { evaluationId, globalScore: scores.globalScore },
      actorId,
    );

    return updated;
  }

  async summary(organisation: string, evaluationId: string) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const { sectionScores, globalScore } = await this.resolveScores(evaluation);

    const criticalIndicators = evaluation.responses
      .filter((r) => r.isCritical)
      .map((r) => ({
        indicatorId: r.indicatorId,
        code: r.indicator.code,
        name: r.indicator.name,
        score: r.score,
        observation: r.observation,
      }));

    return {
      evaluationId: evaluation.id,
      status: evaluation.status,
      globalScore,
      sectionScores,
      criticalIndicators,
    };
  }

  // ── Panel general de organizaciones ──────────────────────────────────────

  // Perfiles de primer nivel (parentProfileId: null) con su última evaluación
  // de esta herramienta. Las asociaciones Nivel 2 sin evaluación propia se
  // consolidan a partir de sus miembros.
  async organisationsOverview(
    organisation: string,
    scope: AssessmentProfileScope = {},
  ) {
    const profiles = await this.evaluations.findProfiles(organisation, {
      parentProfileId: null,
      ...scope,
    });

    const level2Ids = profiles
      .filter(
        (p) => p.type === 'ASSOCIATION' && p.associationLevel === 'LEVEL_2',
      )
      .map((p) => p.id);
    const children = await this.evaluations.findChildProfiles(
      organisation,
      level2Ids,
    );
    const childrenByParent = new Map<string, ProfileRecord[]>();
    for (const child of children) {
      const list = childrenByParent.get(child.parentProfileId as string) ?? [];
      list.push(child);
      childrenByParent.set(child.parentProfileId as string, list);
    }

    const context = await this.loadOverviewContext(organisation, [
      ...profiles.map((p) => p.id),
      ...children.map((c) => c.id),
    ]);

    const rows = profiles.map((profile) =>
      this.buildOrganisationRow(
        profile,
        context,
        childrenByParent.get(profile.id) ?? [],
      ),
    );

    const rowsWithEvaluation = rows.filter((r) => r.globalScore !== null);
    const overallCompliance =
      rowsWithEvaluation.length > 0
        ? rowsWithEvaluation.reduce(
            (sum, r) => sum + (r.globalScore as number),
            0,
          ) /
          rowsWithEvaluation.length /
          10
        : 0;

    return {
      totalOrganisations: profiles.length,
      activeEvaluations: rows.filter(
        (r) => r.status === 'DRAFT' || r.status === 'IN_PROGRESS',
      ).length,
      totalCritical: rows.reduce((sum, r) => sum + r.criticalCount, 0),
      overallCompliancePct: Math.round(overallCompliance * 100),
      organisations: rows,
    };
  }

  // Carga en lote todo lo que necesita el panel: última evaluación por perfil,
  // exclusiones de aplicabilidad para las no completadas y críticos por evaluación.
  protected async loadOverviewContext(
    organisation: string,
    profileIds: string[],
  ): Promise<OverviewContext> {
    const latestByProfile = new Map<string, EvaluationWithStructure>();
    if (profileIds.length === 0) {
      return {
        latestByProfile,
        excludedByProfile: new Map(),
        criticalByEvaluation: new Map(),
      };
    }
    const evaluations = await this.evaluations.findByProfiles(
      organisation,
      this.tool,
      profileIds,
    );
    for (const evaluation of evaluations) {
      if (!latestByProfile.has(evaluation.profileId)) {
        latestByProfile.set(evaluation.profileId, evaluation);
      }
    }
    const latest = [...latestByProfile.values()];
    const pendingProfileIds = latest
      .filter((e) => !(e.status === 'COMPLETED' && e.sectionScores))
      .map((e) => e.profileId);
    const [excludedByProfile, criticalByEvaluation] = await Promise.all([
      this.applicabilityService.resolveExcludedIndicatorIdsForProfiles(
        pendingProfileIds,
      ),
      this.countCriticalByEvaluation(latest),
    ]);
    return { latestByProfile, excludedByProfile, criticalByEvaluation };
  }

  protected buildOrganisationRow(
    profile: ProfileRecord,
    context: OverviewContext,
    children: ProfileRecord[],
  ): OrganisationOverviewRow {
    const evaluation = context.latestByProfile.get(profile.id);

    if (evaluation) {
      const { sectionScores, globalScore } =
        evaluation.status === 'COMPLETED' && evaluation.sectionScores
          ? {
              sectionScores: evaluation.sectionScores as SectionScoreResult[],
              globalScore: Number(evaluation.globalScore ?? 0),
            }
          : this.computeScores(
              evaluation.template,
              evaluation.responses,
              context.excludedByProfile.get(profile.id) ?? new Set(),
            );
      return {
        profile,
        evaluationId: evaluation.id,
        status: evaluation.status,
        globalScore,
        sectionScores,
        criticalCount: context.criticalByEvaluation.get(evaluation.id) ?? 0,
        isConsolidated: false,
      };
    }

    if (
      profile.type === 'ASSOCIATION' &&
      profile.associationLevel === 'LEVEL_2'
    ) {
      const consolidated = this.consolidateChildrenRow(
        profile,
        children,
        context,
      );
      if (consolidated) return consolidated;
    }

    return {
      profile,
      evaluationId: null,
      status: null,
      globalScore: null,
      sectionScores: [],
      criticalCount: 0,
      isConsolidated: false,
    };
  }

  // Asociación Nivel 2 sin evaluación propia: promedio de sus miembros por
  // sección, para que el panel refleje el estado agregado y no "sin evaluación".
  protected consolidateChildrenRow(
    profile: ProfileRecord,
    children: ProfileRecord[],
    context: OverviewContext,
  ): OrganisationOverviewRow | null {
    if (children.length === 0) return null;

    const childRows = children.map((child) =>
      this.buildOrganisationRow(child, context, []),
    );
    const withScore = childRows.filter((r) => r.globalScore !== null);
    if (withScore.length === 0) return null;

    const globalScore =
      withScore.reduce((sum, r) => sum + (r.globalScore as number), 0) /
      withScore.length;

    const sectionNumbers = Array.from(
      new Set(withScore.flatMap((r) => r.sectionScores.map((s) => s.number))),
    ).sort((a, b) => a - b);
    const sectionScores: SectionScoreResult[] = sectionNumbers.map((number) => {
      const values = withScore
        .map((r) => r.sectionScores.find((s) => s.number === number))
        .filter((s): s is SectionScoreResult => !!s);
      const sample = values[0];
      return {
        sectionId: sample.sectionId,
        number,
        name: sample.name,
        weight: sample.weight,
        weightedAvg:
          values.reduce((sum, s) => sum + s.weightedAvg, 0) / values.length,
        critical: values.some((s) => s.critical),
      };
    });

    return {
      profile,
      evaluationId: null,
      status: null,
      globalScore,
      sectionScores,
      criticalCount: withScore.reduce((sum, r) => sum + r.criticalCount, 0),
      isConsolidated: true,
    };
  }

  // Evolución en el tiempo: una evaluación completada = un punto; se usa para
  // el gráfico de tendencia y la diapositiva de evolución del reporte.
  async evaluationHistory(organisation: string, profileId: string) {
    const evaluations = await this.evaluations.findCompletedByProfile(
      organisation,
      this.tool,
      profileId,
    );
    const measureStats = await this.countMeasuresByEvaluation(
      organisation,
      evaluations.map((e) => e.id),
    );

    return evaluations.map((evaluation) => {
      const stats = measureStats.get(evaluation.id) ?? { total: 0, done: 0 };
      return {
        evaluationId: evaluation.id,
        completedAt: evaluation.completedAt,
        globalScore: Number(evaluation.globalScore ?? 0),
        sectionScores: (evaluation.sectionScores as SectionScoreResult[]) ?? [],
        measuresTotal: stats.total,
        measuresDone: stats.done,
      };
    });
  }
  // ── Asistencia con IA ────────────────────────────────────────────────────

  async improveObservation(
    organisation: string,
    evaluationId: string,
    indicatorId: string,
    dto: { score: number; observation: string },
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    // Lee el indicador de la plantilla (no de la respuesta): el KPI puede
    // estar aún sin guardar mientras el usuario califica en el wizard.
    const indicator = evaluation.template.sections
      .flatMap((section) => section.indicators)
      .find((i) => i.id === indicatorId);
    if (!indicator) {
      throw new NotFoundException(
        'Indicator not found in this evaluation template',
      );
    }

    const result = await this.aiService.improveObservation(
      {
        code: indicator.code,
        name: indicator.name,
        description: indicator.description ?? undefined,
      },
      dto.score,
      dto.observation,
    );

    await this.auditService.record(
      organisation,
      'assessment-ai.call',
      { evaluationId, indicatorId, capability: 'improve-observation' },
      actorId,
    );

    return result;
  }

  // Una sola llamada por evaluación al intentar completarla.
  async detectInconsistencies(
    organisation: string,
    evaluationId: string,
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const items: AiEvaluatedItem[] = evaluation.responses.map((r) => ({
      indicatorId: r.indicatorId,
      code: r.indicator.code,
      score: r.score,
      observation: r.observation,
    }));

    const findings = await this.aiService.detectInconsistencies(items);

    await this.auditService.record(
      organisation,
      'assessment-ai.call',
      { evaluationId, capability: 'detect-inconsistencies' },
      actorId,
    );

    const indicatorById = new Map(
      evaluation.template.sections
        .flatMap((s) => s.indicators)
        .map((i) => [i.id, i]),
    );

    return {
      findings: findings.map((f) => ({
        description: f.description,
        indicators: f.indicatorIds.map((id) => ({
          indicatorId: id,
          code: indicatorById.get(id)?.code ?? '',
          name: indicatorById.get(id)?.name ?? '',
        })),
      })),
    };
  }

  // Payload liviano: solo puntajes agregados y KPI críticos.
  async generateExecutiveNarrative(
    organisation: string,
    evaluationId: string,
    dto: { tone: NarrativeTone },
    actorId?: string,
  ) {
    const evaluation = await this.getEvaluationOrThrow(
      organisation,
      evaluationId,
    );
    const { sectionScores, globalScore } = await this.resolveScores(evaluation);
    const criticalItems = evaluation.responses
      .filter((r) => r.isCritical)
      .map((r) => ({
        code: r.indicator.code,
        name: r.indicator.name,
        score: r.score,
      }));

    const narrative = await this.aiService.generateExecutiveNarrative(
      this.buildAiReportContext(globalScore, sectionScores, criticalItems),
      dto.tone,
    );

    await this.auditService.record(
      organisation,
      'assessment-ai.call',
      { evaluationId, capability: 'executive-narrative', tone: dto.tone },
      actorId,
    );

    return narrative;
  }

  /** Contexto liviano (puntajes agregados + ítems críticos) para la IA. */
  protected buildAiReportContext(
    globalScore: number,
    sectionScores: SectionScoreResult[],
    criticalItems: AiReportContext['criticalItems'],
  ): AiReportContext {
    return {
      globalScore,
      sectionScores: sectionScores.map((s) => ({
        number: s.number,
        name: s.name,
        weightedAvg: s.weightedAvg,
      })),
      criticalItems,
    };
  }

  // Insights para el reporte en diapositivas: una sola llamada por export. Si
  // la IA falla (rate limit, clave inválida) el reporte se genera sin ellos.
  protected async tryGenerateReportInsights(
    organisation: string,
    evaluationId: string,
    context: AiReportContext,
    actorId?: string,
  ): Promise<AiReportInsights | null> {
    try {
      const insights = await this.aiService.generateReportInsights(context);
      await this.auditService.record(
        organisation,
        'assessment-ai.call',
        { evaluationId, capability: 'report-insights' },
        actorId,
      );
      return insights;
    } catch {
      return null;
    }
  }
}
