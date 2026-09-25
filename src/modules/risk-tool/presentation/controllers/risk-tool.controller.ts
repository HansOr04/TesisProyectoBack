import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { RiskToolService } from '../../application/risk-tool.service';
import {
  CreateAssessmentEvaluationDto,
  CreateAssessmentIndicatorDto,
  CreateAssessmentRiskMeasureDto,
  CreateAssessmentSectionDto,
  ExecutiveNarrativeDto,
  ExportPptxDto,
  ImproveObservationDto,
  ScoreKpiRiskDto,
  UpdateAssessmentIndicatorDto,
  UpdateAssessmentMitigationMeasureDto,
  UpsertRiskCountryParamDto,
  UpdateAssessmentSectionDto,
} from '../dto';
import { PaginationQueryDto } from '../../../../shared/presentation/pagination';
import { RequestContextService } from '../../../identity/application/request-context.service';
import { RequireAuthenticated } from '../../../identity/presentation/decorators/auth.decorators';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../../../assessment-core/presentation/guards/assessment-permission.guard';
import { AssessmentAccessScopeService } from '../../../assessment-core/application/assessment-access-scope.service';
import { AssessmentAiThrottlerGuard } from '../../../assessment-core/presentation/guards/assessment-ai-throttler.guard';

// RF-05/RF-06: Herramienta de Riesgos — principios, KPI, evaluaciones, riesgo y plan de
// mitigación con Gantt.
@ApiTags('Herramienta de Riesgos')
@ApiBearerAuth()
@Controller()
@RequireAuthenticated()
@UseGuards(AssessmentPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RiskToolController {
  constructor(
    private readonly toolService: RiskToolService,
    private readonly requestContext: RequestContextService,
    private readonly accessScope: AssessmentAccessScopeService,
  ) {}

  // Panel general (panel general): organizaciones + última evaluación Risk.
  // RF-07/F6-B03: un assessment_evaluator solo ve las organizaciones que tiene asignadas.
  @Get(':org/assessments/risk/organisations-overview')
  @RequireAssessmentPermission('risk-tool', 'read')
  async organisationsOverview(@Param('org') org: string) {
    const user = await this.requestContext.requireCurrentUser();
    const isSuperAdmin = this.requestContext.getCurrentUserIsSuperAdmin();
    const scope = await this.accessScope.resolveProfileScope(
      org,
      user.id,
      isSuperAdmin,
    );
    return this.toolService.organisationsOverview(org, scope);
  }

  // ── Parámetros de riesgo por país (administración) ─────────────────────

  @Get(':org/assessments/risk/country-params')
  @RequireAssessmentPermission('risk-tool', 'read')
  async listCountryParams(@Param('org') org: string) {
    return this.toolService.listCountryParams(org);
  }

  @Put(':org/assessments/risk/country-params')
  @RequireAssessmentPermission('risk-tool', 'admin')
  async upsertCountryParam(
    @Param('org') org: string,
    @Body() dto: UpsertRiskCountryParamDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.upsertCountryParam(
      org,
      dto.country,
      dto.riskThreshold,
      user?.id,
    );
  }

  @Delete(':org/assessments/risk/country-params/:country')
  @RequireAssessmentPermission('risk-tool', 'admin')
  async deleteCountryParam(
    @Param('org') org: string,
    @Param('country') country: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    await this.toolService.deleteCountryParam(org, country, user?.id);
    return { success: true };
  }

  // ── Estructura ──────────────────────────────────────────────────────────

  @Get(':org/assessments/risk/templates')
  @RequireAssessmentPermission('risk-tool', 'read')
  async listTemplates(@Param('org') org: string) {
    return this.toolService.listTemplates(org);
  }

  @Get(':org/assessments/risk/templates/:id')
  @RequireAssessmentPermission('risk-tool', 'read')
  async getTemplate(@Param('org') org: string, @Param('id') id: string) {
    return this.toolService.getTemplate(org, id);
  }

  @Post(':org/assessments/risk/templates/:id/sections')
  @RequireAssessmentPermission('risk-tool', 'admin')
  async createSection(
    @Param('org') org: string,
    @Param('id') templateId: string,
    @Body() dto: CreateAssessmentSectionDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.createSection(org, templateId, dto, user?.id);
  }

  @Patch(':org/assessments/risk/sections/:id')
  @RequireAssessmentPermission('risk-tool', 'admin')
  async updateSection(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentSectionDto,
    @Query('confirm') confirm?: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.updateSection(
      org,
      id,
      dto,
      confirm === 'true',
      user?.id,
    );
  }

  @Delete(':org/assessments/risk/sections/:id')
  @RequireAssessmentPermission('risk-tool', 'admin')
  async deleteSection(
    @Param('org') org: string,
    @Param('id') id: string,
    @Query('confirm') confirm?: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    await this.toolService.deleteSection(org, id, confirm === 'true', user?.id);
    return { success: true };
  }

  @Post(':org/assessments/risk/sections/:id/indicators')
  @RequireAssessmentPermission('risk-tool', 'admin')
  async createIndicator(
    @Param('org') org: string,
    @Param('id') sectionId: string,
    @Body() dto: CreateAssessmentIndicatorDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.createIndicator(org, sectionId, dto, user?.id);
  }

  @Patch(':org/assessments/risk/indicators/:id')
  @RequireAssessmentPermission('risk-tool', 'admin')
  async updateIndicator(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentIndicatorDto,
    @Query('confirm') confirm?: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.updateIndicator(
      org,
      id,
      dto,
      confirm === 'true',
      user?.id,
    );
  }

  @Delete(':org/assessments/risk/indicators/:id')
  @RequireAssessmentPermission('risk-tool', 'admin')
  async deleteIndicator(
    @Param('org') org: string,
    @Param('id') id: string,
    @Query('confirm') confirm?: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    await this.toolService.deleteIndicator(
      org,
      id,
      confirm === 'true',
      user?.id,
    );
    return { success: true };
  }

  // ── Evaluaciones y respuestas (RF-05) ────────────────────────────────────

  @Post(':org/assessments/risk/evaluations')
  @RequireAssessmentPermission('risk-tool', 'write')
  async createEvaluation(
    @Param('org') org: string,
    @Body() dto: CreateAssessmentEvaluationDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.createEvaluation(org, dto, user?.id);
  }

  @Get(':org/assessments/risk/evaluations')
  @RequireAssessmentPermission('risk-tool', 'read')
  async listEvaluations(
    @Param('org') org: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.toolService.listEvaluations(org, query);
  }

  @Get(':org/assessments/risk/evaluations/:id')
  @RequireAssessmentPermission('risk-tool', 'read')
  async getEvaluation(@Param('org') org: string, @Param('id') id: string) {
    return this.toolService.getEvaluation(org, id);
  }

  @Put(':org/assessments/risk/evaluations/:id/responses')
  @RequireAssessmentPermission('risk-tool', 'write')
  async upsertResponses(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: ScoreKpiRiskDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.upsertResponses(org, id, dto, user?.id);
  }

  @Post(':org/assessments/risk/evaluations/:id/complete')
  @RequireAssessmentPermission('risk-tool', 'write')
  async complete(@Param('org') org: string, @Param('id') id: string) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.complete(org, id, user?.id);
  }

  @Get(':org/assessments/risk/evaluations/:id/summary')
  @RequireAssessmentPermission('risk-tool', 'read')
  async summary(@Param('org') org: string, @Param('id') id: string) {
    return this.toolService.summary(org, id);
  }

  @Get(':org/assessments/risk/profiles/:profileId/evaluation-history')
  @RequireAssessmentPermission('risk-tool', 'read')
  async evaluationHistory(
    @Param('org') org: string,
    @Param('profileId') profileId: string,
  ) {
    return this.toolService.evaluationHistory(org, profileId);
  }

  // ── Riesgos y plan de mitigación (RF-05/RF-06) ──────────────────────────

  @Get(':org/assessments/risk/evaluations/:id/risks')
  @RequireAssessmentPermission('risk-tool', 'read')
  async listRisks(@Param('org') org: string, @Param('id') id: string) {
    return this.toolService.listRisks(org, id);
  }

  @Post(':org/assessments/risk/risks/:riskId/measures')
  @RequireAssessmentPermission('risk-tool', 'write')
  async createMeasure(
    @Param('org') org: string,
    @Param('riskId') riskId: string,
    @Body() dto: CreateAssessmentRiskMeasureDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.createMeasure(org, riskId, dto, user?.id);
  }

  @Patch(':org/assessments/risk/measures/:id')
  @RequireAssessmentPermission('risk-tool', 'write')
  async updateMeasureProgress(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentMitigationMeasureDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.updateMeasureProgress(org, id, dto, user?.id);
  }

  @Get(':org/assessments/risk/evaluations/:id/gantt')
  @RequireAssessmentPermission('risk-tool', 'read')
  async gantt(@Param('org') org: string, @Param('id') id: string) {
    return this.toolService.gantt(org, id);
  }

  @Get(':org/assessments/risk/evaluations/:id/mitigation-plan/export')
  @RequireAssessmentPermission('risk-tool', 'read')
  async mitigationPlanExport(
    @Param('org') org: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const user = await this.requestContext.getCurrentUser();
    const result = await this.toolService.mitigationPlanExport(
      org,
      id,
      user?.id,
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.data);
  }

  @Post(':org/assessments/risk/evaluations/:id/mitigation-plan/export-pptx')
  @RequireAssessmentPermission('risk-tool', 'read')
  async mitigationPlanExportPptx(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: ExportPptxDto,
    @Res() res: Response,
  ) {
    const user = await this.requestContext.getCurrentUser();
    const result = await this.toolService.mitigationPlanExportPptx(
      org,
      id,
      dto.narrative,
      user?.id,
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.data);
  }

  // ── Asistencia con IA ────────────────────────────────────────────────────
  // LLM10: 10 solicitudes/minuto por usuario en toda esta sección.

  @Post(
    ':org/assessments/risk/evaluations/:id/responses/:indicatorId/improve-observation',
  )
  @RequireAssessmentPermission('risk-tool', 'write')
  @UseGuards(AssessmentAiThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async improveObservation(
    @Param('org') org: string,
    @Param('id') id: string,
    @Param('indicatorId') indicatorId: string,
    @Body() dto: ImproveObservationDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.improveObservation(
      org,
      id,
      indicatorId,
      dto,
      user?.id,
    );
  }

  @Post(
    ':org/assessments/risk/evaluations/:id/principles/:number/suggest-measures',
  )
  @RequireAssessmentPermission('risk-tool', 'write')
  @UseGuards(AssessmentAiThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async suggestMeasuresForSection(
    @Param('org') org: string,
    @Param('id') id: string,
    @Param('number') number: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.suggestMeasuresForSection(
      org,
      id,
      Number(number),
      user?.id,
    );
  }

  @Post(':org/assessments/risk/evaluations/:id/suggest-measures')
  @RequireAssessmentPermission('risk-tool', 'write')
  @UseGuards(AssessmentAiThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async suggestMeasuresForEvaluation(
    @Param('org') org: string,
    @Param('id') id: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.suggestMeasuresForEvaluation(org, id, user?.id);
  }

  // 5.ª capacidad de la Alternativa 1: ranking determinístico, sin costo de
  // IA — por eso vive fuera de la sección de asistencia con IA (sin throttle
  // ni auditoría de assessment-ai.call).
  @Get(':org/assessments/risk/evaluations/:id/impact-priority')
  @RequireAssessmentPermission('risk-tool', 'read')
  async getImpactPriority(@Param('org') org: string, @Param('id') id: string) {
    return this.toolService.getImpactPriority(org, id);
  }

  @Post(':org/assessments/risk/evaluations/:id/detect-inconsistencies')
  @RequireAssessmentPermission('risk-tool', 'write')
  @UseGuards(AssessmentAiThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async detectInconsistencies(
    @Param('org') org: string,
    @Param('id') id: string,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.detectInconsistencies(org, id, user?.id);
  }

  @Post(':org/assessments/risk/evaluations/:id/executive-narrative')
  @RequireAssessmentPermission('risk-tool', 'write')
  @UseGuards(AssessmentAiThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async generateExecutiveNarrative(
    @Param('org') org: string,
    @Param('id') id: string,
    @Body() dto: ExecutiveNarrativeDto,
  ) {
    const user = await this.requestContext.getCurrentUser();
    return this.toolService.generateExecutiveNarrative(org, id, dto, user?.id);
  }
}
