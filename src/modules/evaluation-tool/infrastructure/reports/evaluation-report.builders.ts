import { buildFormattedWorkbook } from '../../../../shared/infrastructure/reports/excel-cell.util';
import {
  addCoverSlide,
  addEvolutionSlide,
  addExecutiveSummarySlide,
  addGaugeSlide,
  addNumberedListSlide,
  addSectionScoresSlide,
  addTableSlide,
  addTimelineSlide,
  createReportPptx,
  REPORT_COLORS,
  TableCell,
  tierColor,
  TimelineMeasure,
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

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  ARCHIVED: 'Archivada',
};

export const MEASURE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  DONE: 'Concluida',
};

export function scoreLevelLabel(score: number): string {
  if (score <= 5) return 'Bajo';
  if (score < 7) return 'Medio';
  return 'Alto';
}

/** "Capacidad" + nivel con concordancia: "Capacidad alta", "Capacidad media"… */
export function scoreLevelPhrase(
  definition: EvaluationToolDefinition,
  score: number,
): string {
  const feminine: Record<string, string> = {
    Bajo: 'baja',
    Medio: 'media',
    Alto: 'alta',
  };
  const level = scoreLevelLabel(score);
  return `${definition.report.scoreLevelPrefix} ${feminine[level] ?? level.toLowerCase()}`;
}

export const EXCEL_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const PPTX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export function reportDate(): string {
  return new Date().toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function evaluationSubtitle(
  evaluation: EvaluationWithStructure,
): string {
  const p = evaluation.profile;
  const place = [p.region, p.country].filter(Boolean).join(', ');
  return [
    p.name,
    place,
    `Evaluación ${STATUS_LABEL[evaluation.status]?.toLowerCase() ?? evaluation.status}`,
    `Generado el ${reportDate()}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Sección a la que pertenece cada indicador de la plantilla. */
export function sectionByIndicator(
  evaluation: EvaluationWithStructure,
): Map<string, { number: number; name: string }> {
  const map = new Map<string, { number: number; name: string }>();
  for (const section of evaluation.template.sections) {
    const info = { number: section.number, name: section.name };
    for (const indicator of section.indicators) map.set(indicator.id, info);
  }
  return map;
}

/**
 * Resumen por sección y matriz completa de KPI calificados, en dos hojas con
 * encabezados en español, anchos de columna y filtros.
 */
export async function buildSummaryExcel(
  definition: EvaluationToolDefinition,
  evaluation: EvaluationWithStructure,
  sectionScores: SectionScoreResult[],
): Promise<FileExport> {
  const weightTotal = sectionScores.reduce((sum, s) => sum + s.weight, 0) || 1;
  const sectionOf = sectionByIndicator(evaluation);
  const subtitle = evaluationSubtitle(evaluation);

  const sectionRows = sectionScores.map((s) => {
    const section = evaluation.template.sections.find(
      (sec) => sec.id === s.sectionId,
    );
    const indicatorIds = new Set(section?.indicators.map((i) => i.id) ?? []);
    const sectionResponses = evaluation.responses.filter((r) =>
      indicatorIds.has(r.indicatorId),
    );
    return {
      section: `${s.number}. ${s.name}`,
      weight: Math.round((s.weight / weightTotal) * 100),
      score: s.weightedAvg,
      level: scoreLevelLabel(s.weightedAvg),
      evaluated: sectionResponses.length,
      critical: sectionResponses.filter((r) => r.isCritical).length,
    };
  });

  const kpiRows = [...evaluation.responses]
    .sort((a, b) =>
      a.indicator.code.localeCompare(b.indicator.code, 'es', { numeric: true }),
    )
    .map((r) => {
      const section = sectionOf.get(r.indicatorId);
      return {
        code: r.indicator.code,
        name: r.indicator.name,
        section: section ? `${section.number}. ${section.name}` : '',
        score: r.score,
        critical: r.isCritical ? 'Sí' : 'No',
        observation: r.observation,
      };
    });

  const data = await buildFormattedWorkbook([
    {
      name: `Resumen por ${definition.section.singular}`,
      title: `${definition.displayName} — resumen por ${definition.section.singular.toLowerCase()}`,
      subtitle,
      columns: [
        { header: definition.section.singular, key: 'section', width: 52 },
        { header: 'Peso', key: 'weight', width: 10, kind: 'percent' },
        { header: 'Nota (0-10)', key: 'score', width: 13, kind: 'score' },
        { header: 'Nivel', key: 'level', width: 10 },
        {
          header: 'KPI evaluados',
          key: 'evaluated',
          width: 14,
          kind: 'number',
        },
        { header: 'KPI críticos', key: 'critical', width: 13, kind: 'number' },
      ],
      rows: sectionRows,
    },
    {
      name: 'KPI evaluados',
      title: `${definition.displayName} — calificación de cada KPI`,
      subtitle,
      columns: [
        { header: 'Código', key: 'code', width: 12 },
        { header: 'Indicador', key: 'name', width: 48 },
        { header: definition.section.singular, key: 'section', width: 34 },
        { header: 'Nota (0-10)', key: 'score', width: 12, kind: 'score' },
        { header: 'Crítico', key: 'critical', width: 10 },
        { header: 'Observación', key: 'observation', width: 60 },
      ],
      rows: kpiRows,
      emptyText: 'La evaluación todavía no tiene KPI calificados.',
    },
  ]);

  return {
    filename: `resumen-${definition.slug}-${evaluation.id}.xlsx`,
    contentType: EXCEL_CONTENT_TYPE,
    data,
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
  /**
   * Plan consolidado que reemplaza al Gantt propio de la herramienta cuando
   * al exportar se pide un alcance mayor (la organización o el proyecto).
   */
  consolidatedGantt?: {
    title: string;
    nameHeader?: string;
    measures: TimelineMeasure[];
  };
}

/** Hallazgos y análisis por sección del asistente, si se generaron. */
export function addInsightSlides(
  pptx: ReturnType<typeof createReportPptx>,
  definition: EvaluationToolDefinition,
  sectionScores: SectionScoreResult[],
  insights: AiReportInsights | null,
): void {
  if (!insights) return;
  if (insights.keyFindings.length > 0) {
    addNumberedListSlide(pptx, {
      title: 'Hallazgos clave',
      items: insights.keyFindings,
    });
  }
  const analysisRows: TableCell[][] = sectionScores
    .filter((s) => insights.sectionAnalysis[String(s.number)])
    .map((s) => [
      `${s.number}. ${s.name}`,
      {
        text: s.weightedAvg.toFixed(1),
        bold: true,
        color: tierColor(s.weightedAvg),
        align: 'center',
      },
      insights.sectionAnalysis[String(s.number)],
    ]);
  if (analysisRows.length > 0) {
    addTableSlide(pptx, {
      title: `Análisis por ${definition.section.singular.toLowerCase()}`,
      columns: [
        { header: definition.section.singular, weight: 3 },
        { header: 'Nota', weight: 0.8, align: 'center' },
        { header: 'Lectura', weight: 8 },
      ],
      rows: analysisRows,
      emptyText: '',
      rowsPerSlide: 4,
    });
  }
}

export function addRecommendationSlides(
  pptx: ReturnType<typeof createReportPptx>,
  insights: AiReportInsights | null,
): void {
  if (insights && insights.recommendations.length > 0) {
    addNumberedListSlide(pptx, {
      title: 'Recomendaciones',
      items: insights.recommendations,
    });
  }
}

export function sectionRowsFor(
  evaluation: EvaluationWithStructure,
  sectionScores: SectionScoreResult[],
) {
  const weightTotal = sectionScores.reduce((sum, x) => sum + x.weight, 0) || 1;
  return sectionScores.map((s) => {
    const section = evaluation.template.sections.find(
      (sec) => sec.id === s.sectionId,
    );
    const ids = new Set(section?.indicators.map((i) => i.id) ?? []);
    const responses = evaluation.responses.filter((r) =>
      ids.has(r.indicatorId),
    );
    return {
      label: `${s.number}. ${s.name}`,
      weightPct: Math.round((s.weight / weightTotal) * 100),
      score: s.weightedAvg,
      evaluated: responses.length,
      critical: responses.filter((r) => r.isCritical).length,
    };
  });
}

export function evolutionPoints(history: SummaryPptxInput['history']) {
  return history
    .filter((h) => h.completedAt)
    .map((h) => ({
      date: h.completedAt as Date,
      globalScore: h.globalScore,
      measuresTotal: h.measuresTotal,
      measuresDone: h.measuresDone,
    }));
}

const PLAN_STATUS: Record<
  'none' | 'open' | 'done',
  { text: string; color: string }
> = {
  none: { text: 'Sin medida', color: REPORT_COLORS.tierRed },
  open: { text: 'En curso', color: REPORT_COLORS.tierAmber },
  done: { text: 'Atendido', color: REPORT_COLORS.tierGreen },
};

export function planStatusCell(measures: Array<{ status: string }>): TableCell {
  const key =
    measures.length === 0
      ? 'none'
      : measures.some((m) => m.status === 'DONE')
        ? 'done'
        : 'open';
  return { ...PLAN_STATUS[key], bold: true };
}

/**
 * Reporte en diapositivas: portada, resumen, velocímetros, detalle por
 * sección, hallazgos, KPI críticos, plan de acción, evolución y
 * recomendaciones.
 */
export async function buildSummaryPptx(
  definition: EvaluationToolDefinition,
  input: SummaryPptxInput,
): Promise<FileExport> {
  const { evaluation, sectionScores, globalScore, measures, insights } = input;
  const criticalResponses = evaluation.responses.filter((r) => r.isCritical);
  const sectionLabel = definition.section.singular;
  const sectionOf = sectionByIndicator(evaluation);
  const doneMeasures = measures.filter((m) => m.status === 'DONE').length;

  const pptx = createReportPptx(
    `${evaluation.profile.name} · ${definition.displayName}`,
  );

  addCoverSlide(pptx, {
    tool: definition.displayName,
    orgName: evaluation.profile.name,
    subtitle: definition.report.subtitle,
    status: STATUS_LABEL[evaluation.status] ?? evaluation.status,
    date: reportDate(),
  });

  addExecutiveSummarySlide(pptx, {
    title: 'Resumen ejecutivo',
    globalScore,
    level: scoreLevelPhrase(definition, globalScore),
    facts: [
      { label: 'KPI evaluados', value: String(evaluation.responses.length) },
      { label: 'KPI críticos', value: String(criticalResponses.length) },
      {
        label: `${definition.section.plural} evaluadas`,
        value: `${sectionScores.length} de ${evaluation.template.sections.length}`,
      },
      {
        label: 'Medidas concluidas',
        value: `${doneMeasures} de ${measures.length}`,
      },
    ],
    narrative: input.narrative,
  });

  addGaugeSlide(pptx, {
    title: `Puntaje por ${sectionLabel.toLowerCase()}`,
    subtitle: 'Escala de 0 a 10, con los mismos cortes que usa la aplicación',
    items: sectionScores.map((s) => ({
      label: `${s.number}. ${s.name}`,
      score: s.weightedAvg,
    })),
  });

  addSectionScoresSlide(pptx, {
    title: `Detalle por ${sectionLabel.toLowerCase()}`,
    subtitle: 'Peso en el puntaje global, nota y KPI críticos de cada una',
    sectionLabel,
    rows: sectionRowsFor(evaluation, sectionScores),
  });

  addInsightSlides(pptx, definition, sectionScores, insights);

  const measuresByIndicator = new Map<string, IndicatorMeasureRecord[]>();
  for (const measure of measures) {
    const list = measuresByIndicator.get(measure.indicatorId) ?? [];
    list.push(measure);
    measuresByIndicator.set(measure.indicatorId, list);
  }
  const sortedCritical = [...criticalResponses].sort(
    (a, b) => a.score - b.score,
  );
  const withoutMeasure = sortedCritical.filter(
    (r) => (measuresByIndicator.get(r.indicatorId) ?? []).length === 0,
  ).length;
  addTableSlide(pptx, {
    title: 'KPI críticos',
    subtitle: 'Ordenados de la nota más baja a la más alta',
    summary: [
      { text: `${criticalResponses.length} KPI críticos` },
      {
        text: `${withoutMeasure} sin medida en el plan`,
        color: REPORT_COLORS.tierRed,
      },
    ],
    columns: [
      { header: 'Código', weight: 1 },
      { header: 'Indicador', weight: 3.6 },
      { header: sectionLabel, weight: 2.6 },
      { header: 'Nota', weight: 0.8, align: 'center' },
      { header: 'Observación', weight: 3.4 },
      { header: 'Plan de acción', weight: 1.4, align: 'center' },
    ],
    rows: sortedCritical.map((r) => {
      const section = sectionOf.get(r.indicatorId);
      const observation = r.observation?.trim() ?? '';
      return [
        { text: r.indicator.code, bold: true },
        r.indicator.name,
        section ? `${section.number}. ${section.name}` : '',
        {
          text: r.score.toFixed(1),
          bold: true,
          color: tierColor(r.score),
          align: 'center',
        },
        observation.length > 150
          ? `${observation.slice(0, 149).trimEnd()}…`
          : observation,
        planStatusCell(measuresByIndicator.get(r.indicatorId) ?? []),
      ];
    }),
    emptyText: 'La evaluación no tiene KPI críticos.',
    rowsPerSlide: 7,
  });

  addTimelineSlide(
    pptx,
    input.consolidatedGantt ?? {
      title: 'Avance del plan de acción',
      measures: measures.map((m) => ({
        name: m.name,
        detail: m.responsible,
        startDate: m.startDate,
        endDate: m.endDate,
        status: m.status,
        progressPct: m.progressPct,
      })),
    },
  );

  if (input.history.length > 1) {
    addEvolutionSlide(pptx, {
      title: 'Evolución en el tiempo',
      points: evolutionPoints(input.history),
    });
  }

  addRecommendationSlides(pptx, insights);

  return {
    filename: `reporte-${definition.slug}-${evaluation.id}.pptx`,
    contentType: PPTX_CONTENT_TYPE,
    data: await writePptxBuffer(pptx),
  };
}
