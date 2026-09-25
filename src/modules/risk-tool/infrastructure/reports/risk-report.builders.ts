import * as XLSX from 'xlsx';
import {
  createExcelWorksheetFromJson,
  writeExcelBuffer,
} from '../../../../shared/infrastructure/reports/excel-cell.util';
import {
  addBarChartSlide,
  addClosingSlide,
  addCoverSlide,
  addDonutChartSlide,
  addEvolutionSlide,
  addExecutiveSummarySlide,
  addKeyFindingsSlide,
  addKpiStatusSlide,
  addRecommendationsSlide,
  addTimelineSlide,
  createReportPptx,
  KpiPlanStatus,
  REPORT_COLORS,
  writePptxBuffer,
} from '../../../../shared/infrastructure/reports/pptx-report.util';
import { AiReportInsights } from '../../../evaluation-tool/domain/evaluation-tool-ai.types';
import { EvaluationToolDefinition } from '../../../evaluation-tool/domain/evaluation-tool.definition';
import {
  EvaluationWithStructure,
  FileExport,
  SectionScoreResult,
} from '../../../evaluation-tool/domain/evaluation-tool.types';
import {
  EXCEL_CONTENT_TYPE,
  PPTX_CONTENT_TYPE,
  scoreLevelLabel,
} from '../../../evaluation-tool/infrastructure/reports/evaluation-report.builders';
import { RiskWithMeasures } from '../../domain/risk-tool.types';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  ARCHIVED: 'Archivada',
};

/** Plan de mitigación: una fila por medida (o por riesgo sin medida). */
export async function buildMitigationPlanExcel(
  definition: EvaluationToolDefinition,
  evaluation: EvaluationWithStructure,
  risks: RiskWithMeasures[],
): Promise<FileExport> {
  const indicatorById = new Map(
    evaluation.template.sections
      .flatMap((s) => s.indicators)
      .map((i) => [i.id, i]),
  );

  const rows = risks.flatMap<Record<string, unknown>>((risk) => {
    const base = {
      kpi: indicatorById.get(risk.indicatorId)?.code ?? '',
      riesgo: risk.description,
      tipoDeRiesgo: risk.riskType ?? '',
      clasificacion: risk.class,
    };
    if (risk.measures.length === 0) {
      return [
        {
          ...base,
          medida: '',
          responsable: '',
          inicioSemana: '',
          duracionDias: '',
          fechaFin: '',
          avancePct: '',
          estado: '',
        },
      ];
    }
    return risk.measures.map((measure) => ({
      ...base,
      medida: measure.description,
      responsable: measure.responsible,
      inicioSemana: measure.startWeek.toISOString().slice(0, 10),
      duracionDias: measure.durationDays,
      fechaFin: measure.endDate.toISOString().slice(0, 10),
      avancePct: measure.progressPct,
      estado: measure.status,
    }));
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    createExcelWorksheetFromJson(rows),
    'Plan de Mitigación',
  );
  const buffer = await writeExcelBuffer(workbook);

  return {
    filename: `plan-mitigacion-${definition.slug}-${evaluation.id}.xlsx`,
    contentType: EXCEL_CONTENT_TYPE,
    data: buffer,
  };
}

export interface MitigationPptxInput {
  evaluation: EvaluationWithStructure;
  sectionScores: SectionScoreResult[];
  globalScore: number;
  risks: RiskWithMeasures[];
  history: {
    completedAt: Date | null;
    globalScore: number;
    measuresTotal: number;
    measuresDone: number;
  }[];
  narrative: string;
  insights: AiReportInsights | null;
}

export async function buildMitigationPlanPptx(
  definition: EvaluationToolDefinition,
  input: MitigationPptxInput,
): Promise<FileExport> {
  const { evaluation, sectionScores, globalScore, risks, insights } = input;
  const nonNegligibleRisks = risks.filter((r) => r.class === 'NON_NEGLIGIBLE');
  const indicatorById = new Map(
    evaluation.template.sections
      .flatMap((s) => s.indicators)
      .map((i) => [i.id, i]),
  );
  const responseByIndicator = new Map(
    evaluation.responses.map((r) => [r.indicatorId, r]),
  );
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
      {
        value: String(nonNegligibleRisks.length),
        label: 'Riesgos No Despreciables',
      },
      { value: String(risks.length), label: 'Riesgos Identificados' },
      {
        value: `${sectionScores.length}/${evaluation.template.sections.length}`,
        label: `${definition.section.plural} Evaluados`,
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

  addDonutChartSlide(pptx, {
    title: 'Clasificación de Riesgos',
    seriesName: 'Riesgos',
    labels: ['Despreciable', 'No Despreciable'],
    values: [
      risks.length - nonNegligibleRisks.length,
      nonNegligibleRisks.length,
    ],
    colors: [REPORT_COLORS.tierGreen, REPORT_COLORS.tierRed],
  });

  const planStatusForRisk = (risk: RiskWithMeasures): KpiPlanStatus => {
    if (risk.measures.length === 0) return 'unresolved';
    return risk.measures.some((m) => m.status === 'DONE')
      ? 'resolved'
      : 'in_progress';
  };
  addKpiStatusSlide(pptx, {
    title: 'Riesgos No Despreciables',
    items: nonNegligibleRisks.map((r) => ({
      code: indicatorById.get(r.indicatorId)?.code ?? '',
      name: r.description,
      score: responseByIndicator.get(r.indicatorId)?.score ?? 0,
      planStatus: planStatusForRisk(r),
    })),
  });

  addTimelineSlide(pptx, {
    title: 'Avance del Plan de Mitigación',
    measures: risks
      .flatMap((r) => r.measures)
      .map((m) => ({
        name: m.description,
        startDate: m.startWeek,
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
