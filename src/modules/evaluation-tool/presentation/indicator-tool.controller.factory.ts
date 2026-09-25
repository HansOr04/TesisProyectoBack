import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  Type,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { PaginationQueryDto } from '../../../shared/presentation/pagination';
import { RequestContextService } from '../../identity/application/request-context.service';
import { RequireAuthenticated } from '../../identity/presentation/decorators/auth.decorators';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../../assessment-core/presentation/guards/assessment-permission.guard';
import { AssessmentAccessScopeService } from '../../assessment-core/application/assessment-access-scope.service';
import { AssessmentAiThrottlerGuard } from '../../assessment-core/presentation/guards/assessment-ai-throttler.guard';
import { ASSESSMENT_MODULE_CODES } from '../../assessment-core/domain/assessment.constants';
import { IndicatorMeasureToolService } from '../application/indicator-measure-tool.service';
import { FileExport } from '../domain/evaluation-tool.types';
import {
  CreateAssessmentEvaluationDto,
  CreateAssessmentIndicatorDto,
  CreateAssessmentSectionDto,
  CreateIndicatorMeasureDto,
  ExecutiveNarrativeDto,
  ExportPptxDto,
  ImproveObservationDto,
  ScoreKpiDto,
  UpdateAssessmentIndicatorDto,
  UpdateAssessmentSectionDto,
  UpdateIndicatorMeasureDto,
} from './dto';

export interface IndicatorToolControllerConfig {
  /** Segmento de ruta de la herramienta: "organizational" | "capacity". */
  segment: string;
  /** Segmento de ruta de las secciones: "dimensions" | "areas". */
  sectionSegment: string;
  /** Código del módulo de permisos (AppModule.code). */
  module: (typeof ASSESSMENT_MODULE_CODES)[keyof typeof ASSESSMENT_MODULE_CODES];
  /** Clase del servicio concreto que Nest inyecta. */
  service: Type<IndicatorMeasureToolService>;
}

function sendFile(res: Response, file: FileExport) {
  res.setHeader('Content-Type', file.contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${file.filename}"`,
  );
  res.send(file.data);
}

/**
 * Construye el controlador REST de una herramienta basada en KPI. Las rutas,
 * permisos y cuerpos son idénticos entre herramientas: solo cambian el
 * segmento de URL, el nombre de la sección y el módulo de permisos.
 */
export function createIndicatorToolController(
  cfg: IndicatorToolControllerConfig,
) {
  const base = `:org/assessments/${cfg.segment}`;
  const mod = cfg.module;

  @ApiTags('Herramientas por KPI')
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
  class IndicatorToolController {
    constructor(
      @Inject(cfg.service)
      readonly toolService: IndicatorMeasureToolService,
      readonly requestContext: RequestContextService,
      readonly accessScope: AssessmentAccessScopeService,
    ) {}

    // Panel general: organizaciones + última evaluación de la herramienta.
    // Un assessment_evaluator solo ve las organizaciones que tiene asignadas.
    @Get(`${base}/organisations-overview`)
    @RequireAssessmentPermission(mod, 'read')
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

    // ── Estructura ────────────────────────────────────────────────────────

    @Get(`${base}/templates`)
    @RequireAssessmentPermission(mod, 'read')
    async listTemplates(@Param('org') org: string) {
      return this.toolService.listTemplates(org);
    }

    @Get(`${base}/templates/:id`)
    @RequireAssessmentPermission(mod, 'read')
    async getTemplate(@Param('org') org: string, @Param('id') id: string) {
      return this.toolService.getTemplate(org, id);
    }

    @Post(`${base}/templates/:id/sections`)
    @RequireAssessmentPermission(mod, 'admin')
    async createSection(
      @Param('org') org: string,
      @Param('id') templateId: string,
      @Body() dto: CreateAssessmentSectionDto,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.createSection(org, templateId, dto, user?.id);
    }

    @Patch(`${base}/sections/:id`)
    @RequireAssessmentPermission(mod, 'admin')
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

    @Delete(`${base}/sections/:id`)
    @RequireAssessmentPermission(mod, 'admin')
    async deleteSection(
      @Param('org') org: string,
      @Param('id') id: string,
      @Query('confirm') confirm?: string,
    ) {
      const user = await this.requestContext.getCurrentUser();
      await this.toolService.deleteSection(
        org,
        id,
        confirm === 'true',
        user?.id,
      );
      return { success: true };
    }

    @Post(`${base}/sections/:id/indicators`)
    @RequireAssessmentPermission(mod, 'admin')
    async createIndicator(
      @Param('org') org: string,
      @Param('id') sectionId: string,
      @Body() dto: CreateAssessmentIndicatorDto,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.createIndicator(org, sectionId, dto, user?.id);
    }

    @Patch(`${base}/indicators/:id`)
    @RequireAssessmentPermission(mod, 'admin')
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

    @Delete(`${base}/indicators/:id`)
    @RequireAssessmentPermission(mod, 'admin')
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

    // ── Evaluaciones y respuestas ─────────────────────────────────────────

    @Post(`${base}/evaluations`)
    @RequireAssessmentPermission(mod, 'write')
    async createEvaluation(
      @Param('org') org: string,
      @Body() dto: CreateAssessmentEvaluationDto,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.createEvaluation(org, dto, user?.id);
    }

    @Get(`${base}/evaluations`)
    @RequireAssessmentPermission(mod, 'read')
    async listEvaluations(
      @Param('org') org: string,
      @Query() query: PaginationQueryDto,
    ) {
      return this.toolService.listEvaluations(org, query);
    }

    @Get(`${base}/evaluations/:id`)
    @RequireAssessmentPermission(mod, 'read')
    async getEvaluation(@Param('org') org: string, @Param('id') id: string) {
      return this.toolService.getEvaluation(org, id);
    }

    @Put(`${base}/evaluations/:id/responses`)
    @RequireAssessmentPermission(mod, 'write')
    async upsertResponses(
      @Param('org') org: string,
      @Param('id') id: string,
      @Body() dto: ScoreKpiDto,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.upsertResponses(org, id, dto, user?.id);
    }

    @Post(`${base}/evaluations/:id/complete`)
    @RequireAssessmentPermission(mod, 'write')
    async complete(@Param('org') org: string, @Param('id') id: string) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.complete(org, id, user?.id);
    }

    @Get(`${base}/evaluations/:id/summary`)
    @RequireAssessmentPermission(mod, 'read')
    async summary(@Param('org') org: string, @Param('id') id: string) {
      return this.toolService.summary(org, id);
    }

    @Get(`${base}/evaluations/:id/summary/export`)
    @RequireAssessmentPermission(mod, 'read')
    async summaryExport(
      @Param('org') org: string,
      @Param('id') id: string,
      @Res() res: Response,
    ) {
      const user = await this.requestContext.getCurrentUser();
      sendFile(res, await this.toolService.summaryExport(org, id, user?.id));
    }

    @Post(`${base}/evaluations/:id/summary/export-pptx`)
    @RequireAssessmentPermission(mod, 'read')
    async summaryExportPptx(
      @Param('org') org: string,
      @Param('id') id: string,
      @Body() dto: ExportPptxDto,
      @Res() res: Response,
    ) {
      const user = await this.requestContext.getCurrentUser();
      sendFile(
        res,
        await this.toolService.summaryExportPptx(
          org,
          id,
          dto.narrative,
          user?.id,
        ),
      );
    }

    @Get(`${base}/profiles/:profileId/evaluation-history`)
    @RequireAssessmentPermission(mod, 'read')
    async evaluationHistory(
      @Param('org') org: string,
      @Param('profileId') profileId: string,
    ) {
      return this.toolService.evaluationHistory(org, profileId);
    }

    // ── Plan de acción (KPI crítico → medida) ─────────────────────────────

    @Get(`${base}/evaluations/:id/measures`)
    @RequireAssessmentPermission(mod, 'read')
    async listMeasures(@Param('org') org: string, @Param('id') id: string) {
      return this.toolService.listMeasures(org, id);
    }

    @Post(`${base}/evaluations/:id/measures`)
    @RequireAssessmentPermission(mod, 'write')
    async createMeasure(
      @Param('org') org: string,
      @Param('id') id: string,
      @Body() dto: CreateIndicatorMeasureDto,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.createMeasure(org, id, dto, user?.id);
    }

    @Patch(`${base}/measures/:id`)
    @RequireAssessmentPermission(mod, 'write')
    async updateMeasureProgress(
      @Param('org') org: string,
      @Param('id') id: string,
      @Body() dto: UpdateIndicatorMeasureDto,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.updateMeasureProgress(org, id, dto, user?.id);
    }

    // ── Asistencia con IA (10 solicitudes/minuto por usuario) ─────────────

    @Post(`${base}/evaluations/:id/responses/:indicatorId/improve-observation`)
    @RequireAssessmentPermission(mod, 'write')
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
      `${base}/evaluations/:id/${cfg.sectionSegment}/:number/suggest-measures`,
    )
    @RequireAssessmentPermission(mod, 'write')
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

    @Post(`${base}/evaluations/:id/suggest-measures`)
    @RequireAssessmentPermission(mod, 'write')
    @UseGuards(AssessmentAiThrottlerGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async suggestMeasuresForEvaluation(
      @Param('org') org: string,
      @Param('id') id: string,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.suggestMeasuresForEvaluation(org, id, user?.id);
    }

    @Get(`${base}/evaluations/:id/impact-priority`)
    @RequireAssessmentPermission(mod, 'read')
    async getImpactPriority(
      @Param('org') org: string,
      @Param('id') id: string,
    ) {
      return this.toolService.getImpactPriority(org, id);
    }

    @Post(`${base}/evaluations/:id/detect-inconsistencies`)
    @RequireAssessmentPermission(mod, 'write')
    @UseGuards(AssessmentAiThrottlerGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async detectInconsistencies(
      @Param('org') org: string,
      @Param('id') id: string,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.detectInconsistencies(org, id, user?.id);
    }

    @Post(`${base}/evaluations/:id/executive-narrative`)
    @RequireAssessmentPermission(mod, 'write')
    @UseGuards(AssessmentAiThrottlerGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async generateExecutiveNarrative(
      @Param('org') org: string,
      @Param('id') id: string,
      @Body() dto: ExecutiveNarrativeDto,
    ) {
      const user = await this.requestContext.getCurrentUser();
      return this.toolService.generateExecutiveNarrative(
        org,
        id,
        dto,
        user?.id,
      );
    }
  }

  return IndicatorToolController;
}
