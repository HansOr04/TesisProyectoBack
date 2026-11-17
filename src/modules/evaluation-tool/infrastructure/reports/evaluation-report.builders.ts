import { buildFormattedWorkbook } from '../../../../shared/infrastructure/reports/excel-cell.util';
import {
  addCoverSlide,
  addEvolutionSlide,
  addExecutiveReadingSlide,
  addGlobalResultsSlide,
  addNumberedListSlide,
  addPlanSummarySlide,
  addSectionDetailSlide,
  addSwotSlide,
  addTableSlide,
  addTimelineSlide,
  createReportPptx,
  InsightPoint,
  pctLabel,
  REPORT_COLORS,
  scorePct,
  TableCell,
  tierColor,
  TimelineMeasure,
  writePptxBuffer,
} from '../../../../shared/infrastructure/reports/pptx-report.util';
import {
  AiReportInsights,
  AiSwot,
  countryName,
} from '../../domain/evaluation-tool-ai.types';
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
  /** La síntesis la escribió (o eligió) el usuario: va tal cual al cierre. */
  customNarrative?: boolean;
  insights: AiReportInsights | null;
  swot?: AiSwot | null;
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

type Pptx = ReturnType<typeof createReportPptx>;

export function createToolReport(
  definition: EvaluationToolDefinition,
  evaluation: EvaluationWithStructure,
): Pptx {
  return createReportPptx(
    `${evaluation.profile.name} · ${definition.displayName}`,
    {
      accentColor: definition.report.accentColor,
      orgName: evaluation.profile.name,
    },
  );
}

export function addToolCoverSlide(
  pptx: Pptx,
  definition: EvaluationToolDefinition,
  evaluation: EvaluationWithStructure,
): void {
  const p = evaluation.profile;
  addCoverSlide(pptx, {
    tool: definition.displayName,
    orgName: p.name,
    subtitle: definition.report.subtitle,
    status: STATUS_LABEL[evaluation.status] ?? evaluation.status,
    date: reportDate(),
    place: [p.region, countryName(p.country)].filter(Boolean).join(', '),
  });
}

function sectionTitle(
  definition: EvaluationToolDefinition,
  s: { number: number; name: string },
): string {
  return `${definition.section.singular} ${s.number}: ${s.name}`;
}

function responsesOf(
  evaluation: EvaluationWithStructure,
  sectionId: string,
): EvaluationWithStructure['responses'] {
  const section = evaluation.template.sections.find((s) => s.id === sectionId);
  const ids = new Set(section?.indicators.map((i) => i.id) ?? []);
  return evaluation.responses.filter((r) => ids.has(r.indicatorId));
}

function shortObservation(text: string | null | undefined, max = 110) {
  const t = text?.trim() ?? '';
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * Fortalezas y brechas de una sección a partir de sus KPI, cuando la IA no
 * las dio: los mejor calificados (nivel alto) y los peor calificados.
 */
function sectionPointsFromData(
  responses: EvaluationWithStructure['responses'],
): { strengths: InsightPoint[]; gaps: InsightPoint[] } {
  const point = (r: EvaluationWithStructure['responses'][number]) => {
    const observation = shortObservation(r.observation);
    return {
      title: `${r.indicator.code} · ${pctLabel(r.score)}`,
      detail: observation
        ? `${r.indicator.name} ${observation}`
        : r.indicator.name,
    };
  };
  return {
    strengths: [...responses]
      .filter((r) => r.score >= 7)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(point),
    gaps: [...responses]
      .filter((r) => r.score < 7)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(point),
  };
}

/** Lectura general sin IA: las secciones con mejor y peor resultado. */
function generalPointsFromData(
  evaluation: EvaluationWithStructure,
  sectionScores: SectionScoreResult[],
): { strengths: InsightPoint[]; gaps: InsightPoint[] } {
  const describe = (s: SectionScoreResult, best: boolean) => {
    const responses = [...responsesOf(evaluation, s.sectionId)].sort((a, b) =>
      best ? b.score - a.score : a.score - b.score,
    );
    const kpi = responses[0];
    return {
      title: `${s.name} (${pctLabel(s.weightedAvg)})`,
      detail: kpi
        ? `${best ? 'Destaca' : 'Lo más bajo'}: ${kpi.indicator.name}`
        : 'Sin KPI calificados.',
    };
  };
  const sorted = [...sectionScores].sort(
    (a, b) => b.weightedAvg - a.weightedAvg,
  );
  return {
    strengths: sorted
      .filter((s) => s.weightedAvg >= 7)
      .slice(0, 4)
      .map((s) => describe(s, true)),
    gaps: [...sorted]
      .reverse()
      .filter((s) => s.weightedAvg < 7)
      .slice(0, 4)
      .map((s) => describe(s, false)),
  };
}

/**
 * Láminas de resultados comunes a todas las herramientas: resultados
 * globales en barras, lectura ejecutiva, una lámina por sección con su
 * semáforo y los hallazgos clave.
 */
export function addResultSlides(
  pptx: Pptx,
  definition: EvaluationToolDefinition,
  input: {
    evaluation: EvaluationWithStructure;
    sectionScores: SectionScoreResult[];
    globalScore: number;
    insights: AiReportInsights | null;
    narrative: string;
    customNarrative?: boolean;
  },
): void {
  const { evaluation, sectionScores, globalScore, insights } = input;
  const sectionLabel = definition.section.singular;
  const critical = evaluation.responses.filter((r) => r.isCritical).length;
  const sorted = [...sectionScores].sort(
    (a, b) => b.weightedAvg - a.weightedAvg,
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  addGlobalResultsSlide(pptx, {
    kicker: 'Diagnóstico integral',
    title: `Resultados globales por ${sectionLabel.toLowerCase()}`,
    subtitle: `${definition.displayName} · ${sectionScores.length} ${definition.section.plural.toLowerCase()} · resultados en porcentaje de cumplimiento`,
    items: sectionScores.map((s) => ({
      label: `${s.number}. ${s.name}`,
      score: s.weightedAvg,
    })),
    globalScore,
    cards: [
      ...(best
        ? [
            {
              label: 'Mejor desempeño',
              caption: best.name,
              score: best.weightedAvg,
              tag: 'Top',
            },
          ]
        : []),
      ...(worst && worst !== best
        ? [
            {
              label: 'Mayor brecha',
              caption: worst.name,
              score: worst.weightedAvg,
              tag: worst.weightedAvg <= 5 ? 'Crítico' : 'A mejorar',
            },
          ]
        : []),
      {
        label: 'Resultado global',
        caption: scoreLevelPhrase(definition, globalScore),
        score: globalScore,
        color: definition.report.accentColor,
      },
      {
        label: 'KPI críticos',
        caption: `de ${evaluation.responses.length} KPI evaluados`,
        value: String(critical),
        color: critical > 0 ? REPORT_COLORS.tierRed : REPORT_COLORS.tierGreen,
      },
    ],
  });

  const fromData = generalPointsFromData(evaluation, sectionScores);
  const closing =
    (input.customNarrative ? input.narrative : insights?.conclusion) ||
    input.narrative ||
    'Las láminas siguientes presentan el detalle por sección, los KPI críticos y el plan de acción.';
  addExecutiveReadingSlide(pptx, {
    kicker: 'Lectura ejecutiva',
    title: 'Lectura ejecutiva del diagnóstico',
    strengths: insights?.strengths?.length
      ? insights.strengths
      : fromData.strengths,
    gaps: insights?.gaps?.length ? insights.gaps : fromData.gaps,
    closingTitle: `Conclusión · Resultado global ${pctLabel(globalScore)}`,
    closing,
    globalScore,
  });

  const weightTotal = sectionScores.reduce((sum, s) => sum + s.weight, 0) || 1;
  for (const s of [...sectionScores].sort((a, b) => a.number - b.number)) {
    const section = evaluation.template.sections.find(
      (sec) => sec.id === s.sectionId,
    );
    const responses = responsesOf(evaluation, s.sectionId);
    const ai = insights?.sectionInsights?.[String(s.number)];
    const data = sectionPointsFromData(responses);
    addSectionDetailSlide(pptx, {
      kicker:
        s.weightedAvg <= 5
          ? 'Área crítica identificada'
          : `Resultados por ${sectionLabel.toLowerCase()}`,
      title: sectionTitle(definition, s),
      subtitle: `${responses.length} de ${section?.indicators.length ?? responses.length} KPI calificados`,
      score: s.weightedAvg,
      strengths: ai?.strengths?.length ? ai.strengths : data.strengths,
      gaps: ai?.gaps?.length ? ai.gaps : data.gaps,
      facts: [
        { label: 'KPI evaluados', value: String(responses.length) },
        {
          label: 'KPI críticos',
          value: String(responses.filter((r) => r.isCritical).length),
        },
        {
          label: 'Peso en el resultado',
          value: `${Math.round((s.weight / weightTotal) * 100)} %`,
        },
      ],
      note: insights?.sectionAnalysis?.[String(s.number)],
    });
  }

  if (insights && insights.keyFindings.length > 0) {
    addNumberedListSlide(pptx, {
      kicker: 'Análisis',
      title: 'Hallazgos clave',
      items: insights.keyFindings,
    });
  }
}

/** FODA y recomendaciones, al cierre del reporte. */
export function addClosingSlides(
  pptx: Pptx,
  evaluation: EvaluationWithStructure,
  insights: AiReportInsights | null,
  swot: AiSwot | null | undefined,
): void {
  if (swot) {
    addSwotSlide(pptx, {
      kicker: 'Análisis estratégico',
      title: 'Análisis FODA',
      subtitle: `${evaluation.profile.name} · fortalezas y debilidades según la evaluación; oportunidades y amenazas del contexto`,
      swot,
    });
  }
  if (insights && insights.recommendations.length > 0) {
    addNumberedListSlide(pptx, {
      kicker: 'Próximos pasos',
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
    const responses = responsesOf(evaluation, s.sectionId);
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

/** Celda del resultado de un KPI en porcentaje, con su color de nivel. */
export function scoreCell(score: number | undefined): TableCell {
  return score === undefined
    ? { text: '—', align: 'center' }
    : {
        text: `${scorePct(score)} %`,
        bold: true,
        color: tierColor(score),
        align: 'center',
      };
}

/**
 * Reporte en diapositivas: portada, resultados globales, lectura ejecutiva,
 * una lámina por sección, hallazgos, KPI críticos, resumen y cronograma del
 * plan de acción, evolución, FODA y recomendaciones.
 */
export async function buildSummaryPptx(
  definition: EvaluationToolDefinition,
  input: SummaryPptxInput,
): Promise<FileExport> {
  const { evaluation, measures, insights } = input;
  const criticalResponses = evaluation.responses.filter((r) => r.isCritical);
  const sectionLabel = definition.section.singular;
  const sectionOf = sectionByIndicator(evaluation);
  const codeOf = new Map(
    evaluation.template.sections
      .flatMap((s) => s.indicators)
      .map((i) => [i.id, i.code]),
  );

  const pptx = createToolReport(definition, evaluation);
  addToolCoverSlide(pptx, definition, evaluation);
  addResultSlides(pptx, definition, input);

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
    kicker: 'Prioridades',
    title: 'KPI críticos',
    subtitle: 'Ordenados del resultado más bajo al más alto',
    summary: [
      { text: `${criticalResponses.length} KPI críticos` },
      {
        text: `${withoutMeasure} sin medida en el plan`,
        color:
          withoutMeasure > 0 ? REPORT_COLORS.tierRed : REPORT_COLORS.tierGreen,
      },
    ],
    columns: [
      { header: 'KPI', weight: 1 },
      { header: 'Indicador', weight: 3.6 },
      { header: sectionLabel, weight: 2.4 },
      { header: 'Resultado', weight: 1.1, align: 'center' },
      { header: 'Observación', weight: 3.4 },
      { header: 'Plan de acción', weight: 1.4, align: 'center' },
    ],
    rows: sortedCritical.map((r) => {
      const section = sectionOf.get(r.indicatorId);
      return [
        { text: r.indicator.code, bold: true },
        r.indicator.name,
        section ? `${section.number}. ${section.name}` : '',
        scoreCell(r.score),
        shortObservation(r.observation, 150),
        planStatusCell(measuresByIndicator.get(r.indicatorId) ?? []),
      ];
    }),
    emptyText: 'La evaluación no tiene KPI críticos.',
    rowsPerSlide: 10,
  });

  addPlanSummarySlide(pptx, {
    kicker: 'Plan de acción',
    title: 'Resumen del plan de acción',
    subtitle: 'Medidas registradas para atender los KPI críticos',
    measures: measures.map((m) => ({
      name: m.name,
      kpi: codeOf.get(m.indicatorId),
      responsible: m.responsible,
      endDate: m.endDate,
      status: m.status,
      progressPct: m.progressPct,
    })),
    uncovered: { label: 'KPI críticos sin medida', value: withoutMeasure },
  });

  addTimelineSlide(pptx, {
    kicker: 'Plan de acción',
    ...(input.consolidatedGantt ?? {
      title: 'Cronograma del plan de acción',
      measures: measures.map((m) => ({
        name: m.name,
        detail: m.responsible,
        startDate: m.startDate,
        endDate: m.endDate,
        status: m.status,
        progressPct: m.progressPct,
      })),
    }),
  });

  if (input.history.length > 1) {
    addEvolutionSlide(pptx, {
      kicker: 'Seguimiento',
      title: 'Evolución en el tiempo',
      points: evolutionPoints(input.history),
    });
  }

  addClosingSlides(pptx, evaluation, insights, input.swot);

  return {
    filename: `reporte-${definition.slug}-${evaluation.id}.pptx`,
    contentType: PPTX_CONTENT_TYPE,
    data: await writePptxBuffer(pptx),
  };
}
