import * as XLSX from 'xlsx';
import {
  createExcelWorksheetFromJson,
  writeExcelBuffer,
} from '../../../../shared/infrastructure/reports/excel-cell.util';
import {
  addBarChartSlide,
  addClosingSlide,
  addCoverSlide,
  addEvolutionSlide,
  addExecutiveSummarySlide,
  addKeyFindingsSlide,
  addKpiStatusSlide,
  addRecommendationsSlide,
  addTimelineSlide,
  createReportPptx,
  KpiPlanStatus,
  writePptxBuffer,
} from '../../../../shared/infrastructure/reports/pptx-report.util';
import { AiReportInsights } from '../../domain/evaluation-tool-ai.types';
import { EvaluationToolDefinition } from '../../domain/evaluation-tool.definition';
import {
  EvaluationWithStructure,
  FileExport,
  IndicatorMeasureRecord,
  SectionScoreResult,
} from '../../domain/evaluation-tool.types';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  ARCHIVED: 'Archivada',
};

export function scoreLevelLabel(score: number): string {
  if (score <= 5) return 'Bajo';
  if (score < 7) return 'Medio';
  return 'Alto';
}

export const EXCEL_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const PPTX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** Resumen por sección + KPI críticos de una evaluación, en dos hojas. */
export async function buildSummaryExcel(
  definition: EvaluationToolDefinition,
  evaluation: EvaluationWithStructure,
  sectionScores: SectionScoreResult[],
): Promise<FileExport> {
  const weightTotal = sectionScores.reduce((sum, s) => sum + s.weight, 0) || 1;
  const sectionKey = definition.section.singular.toLowerCase();

  const sectionRows = sectionScores.map((s) => {
    const section = evaluation.template.sections.find(
      (sec) => sec.id === s.sectionId,
    );
    const indicatorIds = new Set(section?.indicators.map((i) => i.id) ?? []);
    const sectionResponses = evaluation.responses.filter((r) =>
      indicatorIds.has(r.indicatorId),
    );
    return {
      [sectionKey]: `${s.number}. ${s.name}`,
      pesoPct: Math.round((s.weight / weightTotal) * 100),
      promedio: s.weightedAvg,
      kpiEvaluados: sectionResponses.length,
      kpiCriticos: sectionResponses.filter((r) => r.isCritical).length,
    };
  });

  const criticalRows = evaluation.responses
    .filter((r) => r.isCritical)
    .map((r) => ({
      kpi: r.indicator.code,
      nombre: r.indicator.name,
      calificacion: r.score,
      observacion: r.observation,
    }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    createExcelWorksheetFromJson(sectionRows),
    `Resumen por ${definition.section.singular}`,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    createExcelWorksheetFromJson(criticalRows),
    'KPI Críticos',
  );
  const buffer = await writeExcelBuffer(workbook);

  return {
    filename: `resumen-${definition.slug}-${evaluation.id}.xlsx`,
    contentType: EXCEL_CONTENT_TYPE,
    data: buffer,
  };
}

export interface SummaryPptxInput {
  evaluation: EvaluationWithStructure;
  sectionScores: SectionScoreResult[];
  globalScore: number;
  measures: IndicatorMeasureRecord[];
  history: {
    completedAt: Date | null;
    globalScore: number;
    measuresTotal: number;
    measuresDone: number;
  }[];
  narrative: string;
  insights: AiReportInsights | null;
}

/** Reporte en diapositivas: portada, resumen, hallazgos, puntajes, KPI, plan, evolución. */
export async function buildSummaryPptx(
  definition: EvaluationToolDefinition,
  input: SummaryPptxInput,
): Promise<FileExport> {
  const { evaluation, sectionScores, globalScore, measures, insights } = input;
  const criticalResponses = evaluation.responses.filter((r) => r.isCritical);
  const sectionLabel = definition.section.singular;

  const pptx = createReportPptx(
    `${definition.displayName} — ${evaluation.profile.name}`,
  );

  addCoverSlide(pptx, {
    tool: definition.displayName,
    orgName: evaluation.profile.name,
    subtitle: definition.report.subtitle,
    status: STATUS_LABEL[evaluation.status] ?? evaluation.status,
    date: new Date().toLocaleDateString('es-EC'),
  });

  addExecutiveSummarySlide(pptx, {
    title: 'Resumen Ejecutivo',
    globalScore,
    level: `${definition.report.scoreLevelPrefix} ${scoreLevelLabel(globalScore)}`,
    statCards: [
      { value: String(evaluation.responses.length), label: 'KPI Evaluados' },
      { value: String(criticalResponses.length), label: 'KPI Críticos' },
      {
        value: `${sectionScores.length}/${evaluation.template.sections.length}`,
        label: `${definition.section.plural} Evaluadas`,
      },
    ],
    narrative: input.narrative,
  });

  if (insights && insights.keyFindings.length > 0) {
    addKeyFindingsSlide(pptx, {
      title: 'Hallazgos Clave',
      findings: insights.keyFindings,
    });
  }

  const analysisText = insights
    ? sectionScores
        .map((s) => insights.sectionAnalysis[String(s.number)])
        .filter((text): text is string => Boolean(text))
        .join(' ')
    : undefined;
  const weightTotal = sectionScores.reduce((sum, x) => sum + x.weight, 0) || 1;
  addBarChartSlide(pptx, {
    title: `Puntaje por ${sectionLabel}`,
    seriesName: 'Promedio',
    categories: sectionScores.map((s) => `${s.number}. ${s.name}`),
    values: sectionScores.map((s) => s.weightedAvg),
    tableColumns: [sectionLabel, 'Peso', 'Promedio'],
    tableRows: sectionScores.map((s) => [
      `${s.number}. ${s.name}`,
      `${Math.round((s.weight / weightTotal) * 100)}%`,
      s.weightedAvg.toFixed(1),
    ]),
    analysisText: analysisText || undefined,
  });

  const measuresByIndicator = new Map<string, IndicatorMeasureRecord[]>();
  for (const measure of measures) {
    const list = measuresByIndicator.get(measure.indicatorId) ?? [];
    list.push(measure);
    measuresByIndicator.set(measure.indicatorId, list);
  }
  const planStatusFor = (indicatorId: string): KpiPlanStatus => {
    const linked = measuresByIndicator.get(indicatorId) ?? [];
    if (linked.length === 0) return 'unresolved';
    return linked.some((m) => m.status === 'DONE') ? 'resolved' : 'in_progress';
  };
  addKpiStatusSlide(pptx, {
    title: 'KPI Críticos',
    items: criticalResponses.map((r) => ({
      code: r.indicator.code,
      name: r.indicator.name,
      score: r.score,
      planStatus: planStatusFor(r.indicatorId),
    })),
  });

  addTimelineSlide(pptx, {
    title: 'Avance del Plan de Acción',
    measures: measures.map((m) => ({
      name: m.name,
      startDate: m.startDate,
      endDate: m.endDate,
      status: m.status,
      progressPct: m.progressPct,
    })),
  });

  if (input.history.length > 1) {
    addEvolutionSlide(pptx, {
      title: 'Evolución en el Tiempo',
      points: input.history
        .filter((h) => h.completedAt)
        .map((h) => ({
          date: h.completedAt as Date,
          globalScore: h.globalScore,
          measuresTotal: h.measuresTotal,
          measuresDone: h.measuresDone,
        })),
    });
  }

  if (insights && insights.recommendations.length > 0) {
    addRecommendationsSlide(pptx, {
      title: 'Recomendaciones Estratégicas',
      recommendations: insights.recommendations,
    });
  }

  addClosingSlide(
    pptx,
    `Reporte generado automáticamente por la plataforma — ${definition.displayName}.`,
  );

  return {
    filename: `reporte-${definition.slug}-${evaluation.id}.pptx`,
    contentType: PPTX_CONTENT_TYPE,
    data: await writePptxBuffer(pptx),
  };
}
