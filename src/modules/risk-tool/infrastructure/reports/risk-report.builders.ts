import { buildFormattedWorkbook } from '../../../../shared/infrastructure/reports/excel-cell.util';
import {
  addClassificationSlide,
  addCoverSlide,
  addEvolutionSlide,
  addExecutiveSummarySlide,
  addGaugeSlide,
  addSectionScoresSlide,
  addTableSlide,
  addTimelineSlide,
  TimelineMeasure,
  createReportPptx,
  REPORT_COLORS,
  tierColor,
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
  addInsightSlides,
  addRecommendationSlides,
  EXCEL_CONTENT_TYPE,
  evaluationSubtitle,
  evolutionPoints,
  MEASURE_STATUS_LABEL,
  planStatusCell,
  PPTX_CONTENT_TYPE,
  reportDate,
  scoreLevelPhrase,
  sectionByIndicator,
  sectionRowsFor,
  STATUS_LABEL,
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
  const scoreByIndicator = new Map(
    evaluation.responses.map((r) => [r.indicatorId, r.score]),
  );
  const sectionLabel = definition.section.singular;
  const allMeasures = risks.flatMap((r) => r.measures);
  const withoutMeasure = nonNegligibleRisks.filter(
    (r) => r.measures.length === 0,
  ).length;

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
      { label: 'Riesgos identificados', value: String(risks.length) },
      { label: 'No despreciables', value: String(nonNegligibleRisks.length) },
      { label: 'No despreciables sin medida', value: String(withoutMeasure) },
      {
        label: 'Medidas concluidas',
        value: `${allMeasures.filter((m) => m.status === 'DONE').length} de ${allMeasures.length}`,
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
    subtitle: 'Peso en el puntaje global, nota y KPI críticos de cada uno',
    sectionLabel,
    rows: sectionRowsFor(evaluation, sectionScores),
  });

  addInsightSlides(pptx, definition, sectionScores, insights);

  addClassificationSlide(pptx, {
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
        String(list.length),
        String(list.length - nonNeg),
        {
          text: String(nonNeg),
          bold: nonNeg > 0,
          color: nonNeg > 0 ? REPORT_COLORS.tierRed : undefined,
        },
        {
          text: String(missing),
          bold: missing > 0,
          color: missing > 0 ? REPORT_COLORS.tierRed : undefined,
        },
      ];
    }),
  });

  addTableSlide(pptx, {
    title: 'Riesgos no despreciables',
    subtitle: 'Ordenados de la nota más baja a la más alta del KPI de origen',
    summary: [
      { text: `${nonNegligibleRisks.length} riesgos no despreciables` },
      {
        text: `${withoutMeasure} sin medida de mitigación`,
        color: REPORT_COLORS.tierRed,
      },
    ],
    columns: [
      { header: 'Código', weight: 0.9 },
      { header: 'Indicador', weight: 3 },
      { header: 'Nota', weight: 0.75, align: 'center' },
      { header: 'Riesgo', weight: 4.2 },
      { header: 'Tipo', weight: 1.5 },
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
        const score = scoreByIndicator.get(r.indicatorId);
        const description = r.description.trim();
        return [
          { text: indicator?.code ?? '', bold: true },
          indicator?.name ?? '',
          score === undefined
            ? { text: '—', align: 'center' }
            : {
                text: score.toFixed(1),
                bold: true,
                color: tierColor(score),
                align: 'center',
              },
          description.length > 160
            ? `${description.slice(0, 159).trimEnd()}…`
            : description,
          r.riskType ?? '',
          planStatusCell(r.measures),
        ];
      }),
    emptyText: 'No hay riesgos no despreciables en esta evaluación.',
    rowsPerSlide: 7,
  });

  addTimelineSlide(
    pptx,
    input.consolidatedGantt ?? {
      title: 'Avance del plan de mitigación',
      measures: allMeasures.map((m) => ({
        name: m.description,
        detail: m.responsible,
        startDate: m.startWeek,
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
