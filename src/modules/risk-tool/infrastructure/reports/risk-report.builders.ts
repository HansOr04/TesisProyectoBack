import { buildFormattedWorkbook } from '../../../../shared/infrastructure/reports/excel-cell.util';
import {
  addClassificationSlide,
  addEvolutionSlide,
  addPlanSummarySlide,
  addTableSlide,
  addTimelineSlide,
  TimelineMeasure,
  REPORT_COLORS,
  writePptxBuffer,
} from '../../../../shared/infrastructure/reports/pptx-report.util';
import {
  AiReportInsights,
  AiSwot,
} from '../../../evaluation-tool/domain/evaluation-tool-ai.types';
import { EvaluationToolDefinition } from '../../../evaluation-tool/domain/evaluation-tool.definition';
import {
  EvaluationWithStructure,
  FileExport,
  SectionScoreResult,
} from '../../../evaluation-tool/domain/evaluation-tool.types';
import {
  addClosingSlides,
  addResultSlides,
  addToolCoverSlide,
  createToolReport,
  EXCEL_CONTENT_TYPE,
  evaluationSubtitle,
  evolutionPoints,
  MEASURE_STATUS_LABEL,
  planStatusCell,
  PPTX_CONTENT_TYPE,
  scoreCell,
  sectionByIndicator,
} from '../../../evaluation-tool/infrastructure/reports/evaluation-report.builders';
import { RiskWithMeasures } from '../../domain/risk-tool.types';

const RISK_CLASS_LABEL: Record<string, string> = {
  NEGLIGIBLE: 'Despreciable',
  NON_NEGLIGIBLE: 'No despreciable',
};

/**
 * Plan de mitigación: una fila por medida (o por riesgo sin medida), con el
 * KPI de origen, y una segunda hoja con los riesgos por sección.
 */
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
  const scoreByIndicator = new Map(
    evaluation.responses.map((r) => [r.indicatorId, r.score]),
  );
  const sectionOf = sectionByIndicator(evaluation);
  const subtitle = evaluationSubtitle(evaluation);

  const rows = risks.flatMap<Record<string, unknown>>((risk) => {
    const indicator = indicatorById.get(risk.indicatorId);
    const section = sectionOf.get(risk.indicatorId);
    const base = {
      code: indicator?.code ?? '',
      indicator: indicator?.name ?? '',
      section: section ? `${section.number}. ${section.name}` : '',
      score: scoreByIndicator.get(risk.indicatorId) ?? '',
      risk: risk.description,
      riskType: risk.riskType ?? '',
      riskClass: RISK_CLASS_LABEL[risk.class] ?? risk.class,
    };
    if (risk.measures.length === 0) {
      return [
        {
          ...base,
          measure:
            risk.class === 'NEGLIGIBLE'
              ? 'No requiere (riesgo despreciable)'
              : 'Sin medida registrada',
        },
      ];
    }
    return risk.measures.map((measure) => ({
      ...base,
      measure: measure.description,
      responsible: measure.responsible,
      start: measure.startWeek,
      duration: measure.durationDays,
      end: measure.endDate,
      progress: measure.progressPct,
      status: MEASURE_STATUS_LABEL[measure.status] ?? measure.status,
    }));
  });

  const sectionRows = evaluation.template.sections.map((section) => {
    const ids = new Set(section.indicators.map((i) => i.id));
    const list = risks.filter((r) => ids.has(r.indicatorId));
    return {
      section: `${section.number}. ${section.name}`,
      total: list.length,
      negligible: list.filter((r) => r.class === 'NEGLIGIBLE').length,
      nonNegligible: list.filter((r) => r.class === 'NON_NEGLIGIBLE').length,
      withoutMeasure: list.filter(
        (r) => r.class === 'NON_NEGLIGIBLE' && r.measures.length === 0,
      ).length,
    };
  });

  const data = await buildFormattedWorkbook([
    {
      name: 'Plan de mitigación',
      title: `${definition.displayName} — plan de mitigación`,
      subtitle,
      columns: [
        { header: 'Código KPI', key: 'code', width: 11 },
        { header: 'Indicador', key: 'indicator', width: 36 },
        {
          header: definition.section.singular,
          key: 'section',
          width: 28,
        },
        { header: 'Nota KPI', key: 'score', width: 10, kind: 'score' },
        { header: 'Riesgo', key: 'risk', width: 44 },
        { header: 'Tipo de riesgo', key: 'riskType', width: 18 },
        { header: 'Clasificación', key: 'riskClass', width: 16 },
        { header: 'Medida', key: 'measure', width: 44 },
        { header: 'Responsable', key: 'responsible', width: 22 },
        { header: 'Inicio', key: 'start', width: 12, kind: 'date' },
        {
          header: 'Duración (días)',
          key: 'duration',
          width: 11,
          kind: 'number',
        },
        { header: 'Fin', key: 'end', width: 12, kind: 'date' },
        { header: 'Avance', key: 'progress', width: 10, kind: 'percent' },
        { header: 'Estado', key: 'status', width: 13 },
      ],
      rows,
      emptyText: 'La evaluación no tiene riesgos identificados.',
    },
    {
      name: `Riesgos por ${definition.section.singular}`,
      title: `${definition.displayName} — riesgos por ${definition.section.singular.toLowerCase()}`,
      subtitle,
      columns: [
        { header: definition.section.singular, key: 'section', width: 52 },
        { header: 'Riesgos', key: 'total', width: 10, kind: 'number' },
        {
          header: 'Despreciables',
          key: 'negligible',
          width: 14,
          kind: 'number',
        },
        {
          header: 'No despreciables',
          key: 'nonNegligible',
          width: 16,
          kind: 'number',
        },
        {
          header: 'No despreciables sin medida',
          key: 'withoutMeasure',
          width: 16,
          kind: 'number',
        },
      ],
      rows: sectionRows,
    },
  ]);

  return {
    filename: `plan-mitigacion-${definition.slug}-${evaluation.id}.xlsx`,
    contentType: EXCEL_CONTENT_TYPE,
    data,
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

export async function buildMitigationPlanPptx(
  definition: EvaluationToolDefinition,
  input: MitigationPptxInput,
): Promise<FileExport> {
  const { evaluation, risks, insights } = input;
  const nonNegligibleRisks = risks.filter((r) => r.class === 'NON_NEGLIGIBLE');
  const indicatorById = new Map(
    evaluation.template.sections
      .flatMap((s) => s.indicators)
      .map((i) => [i.id, i]),
  );
  const scoreByIndicator = new Map(
    evaluation.responses.map((r) => [r.indicatorId, r.score]),
  );
  const sectionLabel = definition.section.singular;
  const allMeasures = risks.flatMap((r) =>
    r.measures.map((m) => ({ ...m, indicatorId: r.indicatorId })),
  );
  const withoutMeasure = nonNegligibleRisks.filter(
    (r) => r.measures.length === 0,
  ).length;

  const pptx = createToolReport(definition, evaluation);
  addToolCoverSlide(pptx, definition, evaluation);
  addResultSlides(pptx, definition, input);

  addClassificationSlide(pptx, {
    kicker: 'Riesgos',
    title: 'Clasificación de riesgos',
    subtitle: `${risks.length} riesgos identificados, por ${sectionLabel.toLowerCase()}`,
    totals: [
      {
        label: 'Despreciables',
        value: risks.length - nonNegligibleRisks.length,
        color: REPORT_COLORS.tierGreen,
      },
      {
        label: 'No despreciables',
        value: nonNegligibleRisks.length,
        color: REPORT_COLORS.tierRed,
      },
    ],
    columns: [
      { header: sectionLabel, weight: 5 },
      { header: 'Riesgos', weight: 1, align: 'center' },
      { header: 'Despreciables', weight: 1.4, align: 'center' },
      { header: 'No despreciables', weight: 1.6, align: 'center' },
      { header: 'No despreciables sin medida', weight: 2, align: 'center' },
    ],
    rows: evaluation.template.sections.map((section) => {
      const ids = new Set(section.indicators.map((i) => i.id));
      const list = risks.filter((r) => ids.has(r.indicatorId));
      const nonNeg = list.filter((r) => r.class === 'NON_NEGLIGIBLE').length;
      // Solo los no despreciables necesitan medida de mitigación.
      const missing = list.filter(
        (r) => r.class === 'NON_NEGLIGIBLE' && r.measures.length === 0,
      ).length;
      return [
        `${section.number}. ${section.name}`,
        { text: String(list.length), align: 'center' },
        { text: String(list.length - nonNeg), align: 'center' },
        {
          text: String(nonNeg),
          bold: nonNeg > 0,
          color: nonNeg > 0 ? REPORT_COLORS.tierRed : undefined,
          align: 'center',
        },
        {
          text: String(missing),
          bold: missing > 0,
          color: missing > 0 ? REPORT_COLORS.tierRed : undefined,
          align: 'center',
        },
      ];
    }),
  });

  addTableSlide(pptx, {
    kicker: 'Riesgos',
    title: 'Riesgos no despreciables',
    subtitle: 'Ordenados del resultado más bajo al más alto del KPI de origen',
    summary: [
      { text: `${nonNegligibleRisks.length} riesgos no despreciables` },
      {
        text: `${withoutMeasure} sin medida de mitigación`,
        color:
          withoutMeasure > 0 ? REPORT_COLORS.tierRed : REPORT_COLORS.tierGreen,
      },
    ],
    columns: [
      { header: 'KPI', weight: 0.9 },
      { header: 'Indicador', weight: 3 },
      { header: 'Resultado', weight: 1.05, align: 'center' },
      { header: 'Riesgo', weight: 4.1 },
      { header: 'Tipo', weight: 1.4 },
      { header: 'Mitigación', weight: 1.3, align: 'center' },
    ],
    rows: [...nonNegligibleRisks]
      .sort(
        (a, b) =>
          (scoreByIndicator.get(a.indicatorId) ?? 0) -
          (scoreByIndicator.get(b.indicatorId) ?? 0),
      )
      .map((r) => {
        const indicator = indicatorById.get(r.indicatorId);
        const description = r.description.trim();
        return [
          { text: indicator?.code ?? '', bold: true },
          indicator?.name ?? '',
          scoreCell(scoreByIndicator.get(r.indicatorId)),
          description.length > 160
            ? `${description.slice(0, 159).trimEnd()}…`
            : description,
          r.riskType ?? '',
          planStatusCell(r.measures),
        ];
      }),
    emptyText: 'No hay riesgos no despreciables en esta evaluación.',
    rowsPerSlide: 9,
  });

  addPlanSummarySlide(pptx, {
    kicker: 'Plan de mitigación',
    title: 'Resumen del plan de mitigación',
    subtitle: 'Medidas registradas para los riesgos no despreciables',
    measures: allMeasures.map((m) => ({
      name: m.description,
      kpi: indicatorById.get(m.indicatorId)?.code,
      responsible: m.responsible,
      endDate: m.endDate,
      status: m.status,
      progressPct: m.progressPct,
    })),
    uncovered: { label: 'Riesgos sin medida', value: withoutMeasure },
  });

  addTimelineSlide(pptx, {
    kicker: 'Plan de mitigación',
    ...(input.consolidatedGantt ?? {
      title: 'Cronograma del plan de mitigación',
      measures: allMeasures.map((m) => ({
        name: m.description,
        detail: m.responsible,
        startDate: m.startWeek,
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
