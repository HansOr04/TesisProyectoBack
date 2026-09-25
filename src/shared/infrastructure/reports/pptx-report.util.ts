import { withExportSlot } from './export-limiter';
import type PptxGenJS from 'pptxgenjs';

// `pptxgenjs`'s CJS build does `module.exports = PptxGenJS` (no `.default`),
// so a plain default import breaks under ts-jest (which honors tsconfig's
// missing `esModuleInterop`) even though it works fine under the SWC runtime
// Nest uses. A direct `require` + type cast works identically under both.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PptxGenJSCtor: typeof PptxGenJS = require('pptxgenjs');

// Diseño calcado de la plantilla de referencia del usuario (base.pptx):
// fondo crema, acento risk, tipografía Quicksand, tarjetas blancas sobre
// crema. Los nombres de clave se conservan aunque la paleta cambie porque
// organizational-tool.service.ts / risk-tool.service.ts ya referencian
// REPORT_COLORS.neutralGray/tierAmber/tierGreen/tierRed directamente.
export const REPORT_COLORS = {
  brandGreen: '76BC21', // acento principal de marca
  brandGreenDark: '5B9418', // variante oscura: eyebrow de portada, texto sobre acento claro
  bgCream: 'F5F2EF', // fondo de toda la presentación
  panelBg: 'FFFFFF', // tarjetas y paneles sobre el fondo crema
  panelAltBg: 'FBF8F4', // fila alterna en tablas (zebra striping)
  tierRed: 'D32F2F',
  tierAmber: 'FFB74D',
  tierGreen: '4CAF50',
  neutralGray: '9E9E9E',
  borderGray: 'E3DFD8', // gris cálido para bordes sobre fondo crema
  textMuted: '767268',
  textBody: '4A463F',
  darkHeading: '242125', // casi-negro cálido, calcado de la plantilla base.pptx
};

const FONT_HEAD = 'Quicksand';
const FONT_BODY = 'Quicksand';

const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

// Asocia cada presentación con su etiqueta de pie de página (nombre de
// organización) sin mutar el tipo público de PptxGenJS ni depender de casts.
const footerLabels = new WeakMap<PptxGenJS, string>();

export function tierColor(score: number, lowMax = 5, mediumMax = 7): string {
  if (score <= lowMax) return REPORT_COLORS.tierRed;
  if (score < mediumMax) return REPORT_COLORS.tierAmber;
  return REPORT_COLORS.tierGreen;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function createReportPptx(footerLabel?: string): PptxGenJS {
  const pptx = new PptxGenJSCtor();
  pptx.defineLayout({
    name: 'ASSESSMENT_WIDE',
    width: SLIDE_W,
    height: SLIDE_H,
  });
  pptx.layout = 'ASSESSMENT_WIDE';
  footerLabels.set(pptx, footerLabel ?? 'Plataforma de Evaluación — Reporte');
  return pptx;
}

function addFooter(pptx: PptxGenJS, slide: PptxGenJS.Slide): void {
  slide.addText(
    footerLabels.get(pptx) ?? 'Plataforma de Evaluación — Reporte',
    {
      x: 0.5,
      y: SLIDE_H - 0.4,
      w: 8,
      h: 0.3,
      fontSize: 9,
      fontFace: FONT_BODY,
      color: REPORT_COLORS.textMuted,
    },
  );
  slide.slideNumber = {
    x: SLIDE_W - 1.1,
    y: SLIDE_H - 0.4,
    w: 0.6,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT_BODY,
    color: REPORT_COLORS.textMuted,
    align: 'right',
  };
}

function addSectionHeader(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  title: string,
  subtitle?: string,
): void {
  slide.background = { color: REPORT_COLORS.bgCream };
  slide.addText(title, {
    x: 0.5,
    y: 0.45,
    w: SLIDE_W - 1,
    h: 0.6,
    fontSize: 26,
    bold: true,
    color: REPORT_COLORS.darkHeading,
    fontFace: FONT_HEAD,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.52,
    y: 1.03,
    w: 0.55,
    h: 0.06,
    rectRadius: 0.03,
    fill: { color: REPORT_COLORS.brandGreen },
    line: { color: REPORT_COLORS.brandGreen, width: 0 },
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 1.15,
      w: SLIDE_W - 1,
      h: 0.35,
      fontSize: 12.5,
      color: REPORT_COLORS.textMuted,
      fontFace: FONT_BODY,
    });
  }
  addFooter(pptx, slide);
}

export function addCoverSlide(
  pptx: PptxGenJS,
  opts: {
    tool: string;
    orgName: string;
    subtitle: string;
    status: string;
    date: string;
  },
): void {
  const slide = pptx.addSlide();
  slide.background = { color: REPORT_COLORS.bgCream };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 3.1,
    h: SLIDE_H,
    fill: { color: REPORT_COLORS.brandGreen, transparency: 12 },
    line: { color: REPORT_COLORS.brandGreen, width: 0 },
  });

  const ring = (x: number, y: number, size: number, transparency: number) =>
    slide.addShape(pptx.ShapeType.ellipse, {
      x,
      y,
      w: size,
      h: size,
      fill: { color: REPORT_COLORS.brandGreen, transparency: 100 },
      line: { color: REPORT_COLORS.brandGreen, width: 1.5, transparency },
    });
  ring(SLIDE_W - 2.6, -1.6, 4.2, 45);
  ring(SLIDE_W - 1.2, SLIDE_H - 2.0, 2.6, 55);

  slide.addText(opts.tool.toUpperCase(), {
    x: 3.6,
    y: 2.5,
    w: 9,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: REPORT_COLORS.brandGreenDark,
    fontFace: FONT_BODY,
    charSpacing: 3,
  });
  slide.addText(opts.orgName, {
    x: 3.6,
    y: 2.95,
    w: 9.2,
    h: 1.3,
    fontSize: 34,
    bold: true,
    color: REPORT_COLORS.darkHeading,
    fontFace: FONT_HEAD,
  });
  slide.addText(opts.subtitle, {
    x: 3.6,
    y: 4.15,
    w: 9,
    h: 0.6,
    fontSize: 15,
    color: REPORT_COLORS.textBody,
    fontFace: FONT_BODY,
  });
  slide.addText(`${opts.status}  ·  ${opts.date}`, {
    x: 3.6,
    y: SLIDE_H - 0.8,
    w: 8,
    h: 0.4,
    fontSize: 10,
    color: REPORT_COLORS.textMuted,
    fontFace: FONT_BODY,
  });
}

export function addExecutiveSummarySlide(
  pptx: PptxGenJS,
  opts: {
    title: string;
    globalScore: number;
    level: string;
    statCards: Array<{ label: string; value: string }>;
    narrative?: string;
  },
): void {
  const slide = pptx.addSlide();
  addSectionHeader(pptx, slide, opts.title);

  const scoreColor = tierColor(opts.globalScore);
  const cards = [
    {
      value: opts.globalScore.toFixed(1),
      label: opts.level,
      color: scoreColor,
    },
    ...opts.statCards.map((c) => ({
      value: c.value,
      label: c.label,
      color: REPORT_COLORS.brandGreen,
    })),
  ];

  const cardH = 1.7;
  const headerBottom = 1.35;
  const footerTop = SLIDE_H - 0.55;
  // Sin narrativa, la diapositiva sólo tiene tarjetas: se centran
  // verticalmente en vez de quedar pegadas arriba con espacio vacío abajo.
  const cardY = opts.narrative
    ? 1.55
    : headerBottom + Math.max(0, (footerTop - headerBottom - cardH) / 2);
  const gap = 0.22;
  const cardW = (12.3 - gap * (cards.length - 1)) / cards.length;

  cards.forEach((card, idx) => {
    const x = 0.5 + idx * (cardW + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y: cardY,
      w: cardW,
      h: cardH,
      rectRadius: 0.09,
      fill: { color: REPORT_COLORS.panelBg },
      line: { color: REPORT_COLORS.borderGray, width: 1 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y: cardY,
      w: 0.5,
      h: 0.09,
      rectRadius: 0.045,
      fill: { color: card.color },
      line: { color: card.color, width: 0 },
    });
    slide.addText(card.value, {
      x: x + 0.15,
      y: cardY + 0.35,
      w: cardW - 0.3,
      h: 0.85,
      fontSize: 34,
      bold: true,
      color: card.color,
      fontFace: FONT_HEAD,
    });
    slide.addText(card.label, {
      x: x + 0.15,
      y: cardY + cardH - 0.6,
      w: cardW - 0.3,
      h: 0.5,
      fontSize: 11,
      color: REPORT_COLORS.textMuted,
      fontFace: FONT_BODY,
      valign: 'top',
    });
  });

  if (opts.narrative) {
    const narrativeY = cardY + cardH + 0.3;
    slide.addText('NARRATIVA EJECUTIVA', {
      x: 0.5,
      y: narrativeY,
      w: 12,
      h: 0.35,
      fontSize: 12,
      bold: true,
      color: REPORT_COLORS.brandGreenDark,
      fontFace: FONT_BODY,
      charSpacing: 2,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: narrativeY + 0.4,
      w: 12.3,
      h: SLIDE_H - narrativeY - 0.7,
      rectRadius: 0.08,
      fill: { color: REPORT_COLORS.panelBg },
      line: { color: REPORT_COLORS.borderGray, width: 1 },
    });
    slide.addText(opts.narrative, {
      x: 0.75,
      y: narrativeY + 0.55,
      w: 11.8,
      h: SLIDE_H - narrativeY - 1.0,
      fontSize: 12,
      color: REPORT_COLORS.textBody,
      fontFace: FONT_BODY,
      valign: 'top',
    });
  }
}

export function addBarChartSlide(
  pptx: PptxGenJS,
  opts: {
    title: string;
    seriesName: string;
    categories: string[];
    values: number[];
    tableColumns?: string[];
    tableRows?: string[][];
    analysisText?: string;
  },
): void {
  const slide = pptx.addSlide();
  addSectionHeader(pptx, slide, opts.title);
  const colors = opts.values.map((v) => tierColor(v));
  const chartW = opts.tableRows ? 6.9 : 12.3;
  const chartH = opts.analysisText ? 3.9 : 5.15;
  const chartY = 1.55;
  slide.addChart(
    pptx.ChartType.bar,
    [{ name: opts.seriesName, labels: opts.categories, values: opts.values }],
    {
      x: 0.5,
      y: chartY,
      w: chartW,
      h: chartH,
      chartColors: colors,
      showLegend: false,
      showTitle: false,
      catAxisLabelFontFace: FONT_BODY,
      catAxisLabelFontSize: 10,
      valAxisLabelFontFace: FONT_BODY,
      valAxisMinVal: 0,
      valAxisMaxVal: 10,
      barDir: 'col',
    },
  );
  if (opts.tableRows && opts.tableColumns) {
    const headerRow = opts.tableColumns.map((c) => ({
      text: c,
      options: {
        bold: true,
        fill: { color: REPORT_COLORS.brandGreen },
        color: 'FFFFFF',
        fontSize: 10,
        fontFace: FONT_BODY,
      },
    }));
    const rows = [
      headerRow,
      ...opts.tableRows.map((r, i) =>
        r.map((cell, colIdx) => ({
          text: cell,
          options: {
            fontSize: 9,
            fontFace: FONT_BODY,
            bold: colIdx === 0,
            color:
              colIdx === 0 ? REPORT_COLORS.darkHeading : REPORT_COLORS.textBody,
            fill: {
              color:
                i % 2 === 0 ? REPORT_COLORS.panelBg : REPORT_COLORS.panelAltBg,
            },
          },
        })),
      ),
    ];
    slide.addTable(rows, {
      x: 7.7,
      y: chartY,
      w: 5.1,
      fontSize: 9,
      border: { type: 'solid', color: REPORT_COLORS.borderGray, pt: 0.5 },
      autoPage: false,
    });
  }
  if (opts.analysisText) {
    const textY = chartY + chartH + 0.15;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: textY,
      w: 12.3,
      h: SLIDE_H - textY - 0.45,
      rectRadius: 0.06,
      fill: { color: REPORT_COLORS.panelBg },
      line: { color: REPORT_COLORS.borderGray, width: 1 },
    });
    slide.addText(opts.analysisText, {
      x: 0.7,
      y: textY + 0.12,
      w: 11.9,
      h: SLIDE_H - textY - 0.65,
      fontSize: 11,
      color: REPORT_COLORS.textBody,
      fontFace: FONT_BODY,
      valign: 'top',
    });
  }
}

export type EvolutionPoint = {
  date: Date;
  globalScore: number;
  measuresTotal: number;
  measuresDone: number;
};

// Evolución en el tiempo (RF: "ver cómo ha ido evolucionando la empresa con
// las mitigaciones que se ha hecho"): una línea por puntaje global entre
// evaluaciones completadas, con una tabla de medidas de mitigación
// completadas en cada corte para correlacionar el avance del puntaje con el
// trabajo de mitigación realizado. Solo se llama cuando hay 2+ evaluaciones.
export function addEvolutionSlide(
  pptx: PptxGenJS,
  opts: { title: string; points: EvolutionPoint[] },
): void {
  const slide = pptx.addSlide();
  addSectionHeader(
    pptx,
    slide,
    opts.title,
    'Puntaje global por evaluación completada, en orden cronológico',
  );

  const categories = opts.points.map((p) => formatDateShort(p.date));
  const values = opts.points.map((p) => p.globalScore);
  const chartY = 1.55;
  const chartH = 3.7;

  slide.addChart(
    pptx.ChartType.line,
    [{ name: 'Puntaje Global', labels: categories, values }],
    {
      x: 0.5,
      y: chartY,
      w: 12.3,
      h: chartH,
      chartColors: [REPORT_COLORS.brandGreen],
      showLegend: false,
      showTitle: false,
      lineDataSymbol: 'circle',
      lineDataSymbolSize: 7,
      lineSize: 2.5,
      catAxisLabelFontFace: FONT_BODY,
      catAxisLabelFontSize: 10,
      valAxisLabelFontFace: FONT_BODY,
      valAxisMinVal: 0,
      valAxisMaxVal: 10,
      showValue: true,
      dataLabelFontFace: FONT_BODY,
      dataLabelFontSize: 9,
      dataLabelColor: REPORT_COLORS.darkHeading,
      dataLabelPosition: 't',
    },
  );

  const tableY = chartY + chartH + 0.2;
  const headerRow = ['Fecha', 'Puntaje', 'Medidas Completadas'].map((c) => ({
    text: c,
    options: {
      bold: true,
      fill: { color: REPORT_COLORS.brandGreen },
      color: 'FFFFFF',
      fontSize: 10,
      fontFace: FONT_BODY,
    },
  }));
  const rows = [
    headerRow,
    ...opts.points.map((p, i) =>
      [
        formatDateShort(p.date),
        p.globalScore.toFixed(1),
        `${p.measuresDone} / ${p.measuresTotal}`,
      ].map((cell, colIdx) => ({
        text: cell,
        options: {
          fontSize: 9,
          fontFace: FONT_BODY,
          bold: colIdx === 0,
          color:
            colIdx === 0 ? REPORT_COLORS.darkHeading : REPORT_COLORS.textBody,
          fill: {
            color:
              i % 2 === 0 ? REPORT_COLORS.panelBg : REPORT_COLORS.panelAltBg,
          },
          align: colIdx === 0 ? 'left' : 'center',
        },
      })),
    ),
  ];
  slide.addTable(rows, {
    x: 0.5,
    y: tableY,
    w: 12.3,
    fontSize: 9,
    border: { type: 'solid', color: REPORT_COLORS.borderGray, pt: 0.5 },
    autoPage: false,
  });
}

export function addDonutChartSlide(
  pptx: PptxGenJS,
  opts: {
    title: string;
    seriesName: string;
    labels: string[];
    values: number[];
    colors: string[];
  },
): void {
  const slide = pptx.addSlide();
  addSectionHeader(pptx, slide, opts.title);
  slide.addChart(
    pptx.ChartType.doughnut,
    [{ name: opts.seriesName, labels: opts.labels, values: opts.values }],
    {
      x: 2.5,
      y: 1.55,
      w: 6,
      h: 4.9,
      chartColors: opts.colors,
      showLegend: true,
      legendPos: 'r',
      legendFontFace: FONT_BODY,
      showPercent: true,
      dataLabelFontFace: FONT_BODY,
    },
  );
}

function addNumberedCardsSlide(
  pptx: PptxGenJS,
  opts: { title: string; items: string[]; accentColor: string },
): void {
  const slide = pptx.addSlide();
  addSectionHeader(pptx, slide, opts.title);
  const top = 1.65;
  const bottom = SLIDE_H - 0.55;
  const gap = 0.12;
  const count = Math.max(opts.items.length, 1);
  const rowH = Math.min(1.05, (bottom - top - gap * (count - 1)) / count);
  const badgeSize = Math.min(0.56, rowH - 0.15);
  // Si la lista es corta ocupa poco alto: se centra en vez de quedar pegada
  // arriba con espacio vacío abajo.
  const totalH = count * rowH + (count - 1) * gap;
  const startY = top + Math.max(0, (bottom - top - totalH) / 2);

  opts.items.forEach((item, idx) => {
    const y = startY + idx * (rowH + gap);
    const badgeY = y + rowH / 2 - badgeSize / 2;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.6,
      y: badgeY,
      w: badgeSize,
      h: badgeSize,
      fill: { color: opts.accentColor },
      line: { color: opts.accentColor, width: 0 },
    });
    slide.addText(String(idx + 1).padStart(2, '0'), {
      x: 0.6,
      y: badgeY,
      w: badgeSize,
      h: badgeSize,
      fontSize: 13,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      fontFace: FONT_BODY,
    });
    slide.addText(item, {
      x: 1.45,
      y,
      w: 11.15,
      h: rowH,
      fontSize: 13,
      color: REPORT_COLORS.darkHeading,
      fontFace: FONT_BODY,
      valign: 'middle',
    });
    if (idx < opts.items.length - 1) {
      slide.addShape(pptx.ShapeType.line, {
        x: 1.45,
        y: y + rowH + gap / 2,
        w: 11.15,
        h: 0,
        line: { color: REPORT_COLORS.borderGray, width: 0.75 },
      });
    }
  });
}

export function addKeyFindingsSlide(
  pptx: PptxGenJS,
  opts: { title: string; findings: string[] },
): void {
  addNumberedCardsSlide(pptx, {
    title: opts.title,
    items: opts.findings,
    accentColor: REPORT_COLORS.brandGreen,
  });
}

export function addRecommendationsSlide(
  pptx: PptxGenJS,
  opts: { title: string; recommendations: string[] },
): void {
  addNumberedCardsSlide(pptx, {
    title: opts.title,
    items: opts.recommendations,
    accentColor: REPORT_COLORS.brandGreenDark,
  });
}

export type KpiPlanStatus = 'unresolved' | 'in_progress' | 'resolved';

const PLAN_STATUS_META: Record<
  KpiPlanStatus,
  { emoji: string; label: string; color: string }
> = {
  unresolved: {
    emoji: '❌',
    label: 'Sin acción',
    color: REPORT_COLORS.tierRed,
  },
  in_progress: {
    emoji: '⏳',
    label: 'En proceso',
    color: REPORT_COLORS.tierAmber,
  },
  resolved: { emoji: '✅', label: 'Resuelto', color: REPORT_COLORS.tierGreen },
};

// Reemplaza la tabla cruda de KPI críticos / riesgos por una lista visual
// que enfatiza con emoji cuáles siguen sin acción, cuáles están en proceso y
// cuáles ya fueron resueltos por una medida del plan de mitigación.
export function addKpiStatusSlide(
  pptx: PptxGenJS,
  opts: {
    title: string;
    items: Array<{
      code: string;
      name: string;
      score: number;
      planStatus: KpiPlanStatus;
    }>;
  },
): void {
  const ROWS_PER_SLIDE = 7;
  const chunks: (typeof opts.items)[] = [];
  for (let i = 0; i < opts.items.length; i += ROWS_PER_SLIDE) {
    chunks.push(opts.items.slice(i, i + ROWS_PER_SLIDE));
  }
  if (chunks.length === 0) chunks.push([]);

  const counts = {
    unresolved: opts.items.filter((i) => i.planStatus === 'unresolved').length,
    in_progress: opts.items.filter((i) => i.planStatus === 'in_progress')
      .length,
    resolved: opts.items.filter((i) => i.planStatus === 'resolved').length,
  };

  chunks.forEach((chunkItems, chunkIdx) => {
    const slide = pptx.addSlide();
    const suffix =
      chunks.length > 1 ? ` (${chunkIdx + 1}/${chunks.length})` : '';
    addSectionHeader(pptx, slide, `${opts.title}${suffix}`);

    const pillY = 1.32;
    const pillH = 0.42;
    const pillGap = 0.2;
    const pillW = 3.9;
    (['unresolved', 'in_progress', 'resolved'] as KpiPlanStatus[]).forEach(
      (status, idx) => {
        const meta = PLAN_STATUS_META[status];
        const x = 0.5 + idx * (pillW + pillGap);
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y: pillY,
          w: pillW,
          h: pillH,
          rectRadius: 0.08,
          fill: { color: meta.color, transparency: 88 },
          line: { color: meta.color, width: 1 },
        });
        slide.addText(
          `${meta.emoji}  ${counts[status]} ${meta.label.toLowerCase()}`,
          {
            x,
            y: pillY,
            w: pillW,
            h: pillH,
            fontSize: 12,
            bold: true,
            color: meta.color,
            fontFace: FONT_BODY,
            align: 'center',
            valign: 'middle',
          },
        );
      },
    );

    if (chunkItems.length === 0) {
      slide.addText('No hay KPI críticos ni riesgos registrados.', {
        x: 0.5,
        y: 2.3,
        w: 12,
        h: 0.5,
        fontSize: 12,
        color: REPORT_COLORS.textMuted,
        fontFace: FONT_BODY,
      });
      return;
    }

    const top = 2.05;
    const rowH = 0.56;
    const gap = 0.14;
    const pillColW = 1.75;

    chunkItems.forEach((item, idx) => {
      const y = top + idx * (rowH + gap);
      const meta = PLAN_STATUS_META[item.planStatus];

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y,
        w: pillColW,
        h: rowH,
        rectRadius: 0.06,
        fill: { color: meta.color, transparency: 88 },
        line: { color: meta.color, width: 0.75 },
      });
      slide.addText(`${meta.emoji} ${meta.label}`, {
        x: 0.5,
        y,
        w: pillColW,
        h: rowH,
        fontSize: 10,
        bold: true,
        color: meta.color,
        fontFace: FONT_BODY,
        align: 'center',
        valign: 'middle',
      });

      slide.addText(
        [
          { text: `${item.code}  `, options: { bold: true } },
          { text: truncate(item.name, 78) },
        ],
        {
          x: 2.45,
          y,
          w: 8.6,
          h: rowH,
          fontSize: 12,
          color: REPORT_COLORS.darkHeading,
          fontFace: FONT_BODY,
          valign: 'middle',
        },
      );

      const scoreColor = tierColor(item.score);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 11.3,
        y,
        w: 1.03,
        h: rowH,
        rectRadius: 0.06,
        fill: { color: scoreColor },
        line: { color: scoreColor, width: 0 },
      });
      slide.addText(`${item.score}/10`, {
        x: 11.3,
        y,
        w: 1.03,
        h: rowH,
        fontSize: 11,
        bold: true,
        color: 'FFFFFF',
        fontFace: FONT_BODY,
        align: 'center',
        valign: 'middle',
      });
    });
  });
}

export type TimelineMeasure = {
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  progressPct: number;
};

const MEASURE_STATUS_META: Record<
  TimelineMeasure['status'],
  { label: string; color: string }
> = {
  PENDING: { label: 'Pendiente', color: REPORT_COLORS.neutralGray },
  IN_PROGRESS: { label: 'En progreso', color: REPORT_COLORS.tierAmber },
  DONE: { label: 'Concluida', color: REPORT_COLORS.tierGreen },
};

// Diapositiva de avance del plan de mitigación: en vez de una simple dona de
// estado, dibuja un Gantt nativo (barra por medida, coloreada por estado,
// con marcador de "hoy") para que se vea de un vistazo qué tan avanzado va
// el plan en el tiempo.
function hasValidSchedule(measure: TimelineMeasure): boolean {
  return (
    measure.startDate instanceof Date &&
    !isNaN(measure.startDate.getTime()) &&
    measure.endDate instanceof Date &&
    !isNaN(measure.endDate.getTime())
  );
}

export function addTimelineSlide(
  pptx: PptxGenJS,
  opts: { title: string; measures: TimelineMeasure[] },
): void {
  const ROWS_PER_SLIDE = 6;
  const counts = {
    PENDING: opts.measures.filter((m) => m.status === 'PENDING').length,
    IN_PROGRESS: opts.measures.filter((m) => m.status === 'IN_PROGRESS').length,
    DONE: opts.measures.filter((m) => m.status === 'DONE').length,
  };

  // Sólo las medidas con fecha de inicio/fin válida entran al Gantt; los
  // contadores de arriba sí reflejan el total real aunque falten fechas.
  const datedMeasures = opts.measures.filter(hasValidSchedule);

  const chunks: TimelineMeasure[][] = [];
  for (let i = 0; i < datedMeasures.length; i += ROWS_PER_SLIDE) {
    chunks.push(datedMeasures.slice(i, i + ROWS_PER_SLIDE));
  }
  if (chunks.length === 0) chunks.push([]);

  const minDate = datedMeasures.length
    ? new Date(Math.min(...datedMeasures.map((m) => m.startDate.getTime())))
    : null;
  const maxDateRaw = datedMeasures.length
    ? new Date(Math.max(...datedMeasures.map((m) => m.endDate.getTime())))
    : null;
  const maxDate =
    minDate && maxDateRaw && maxDateRaw.getTime() === minDate.getTime()
      ? new Date(minDate.getTime() + 24 * 60 * 60 * 1000)
      : maxDateRaw;
  const totalMs =
    minDate && maxDate ? maxDate.getTime() - minDate.getTime() : 0;

  const barAreaX = 3.15;
  const barAreaW = SLIDE_W - 0.5 - barAreaX;
  const today = new Date();

  chunks.forEach((chunkMeasures, chunkIdx) => {
    const slide = pptx.addSlide();
    const suffix =
      chunks.length > 1 ? ` (${chunkIdx + 1}/${chunks.length})` : '';
    addSectionHeader(pptx, slide, `${opts.title}${suffix}`);

    const pillY = 1.32;
    const pillH = 0.42;
    const pillGap = 0.2;
    const pillW = 3.9;
    (['PENDING', 'IN_PROGRESS', 'DONE'] as TimelineMeasure['status'][]).forEach(
      (status, idx) => {
        const meta = MEASURE_STATUS_META[status];
        const x = 0.5 + idx * (pillW + pillGap);
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y: pillY,
          w: pillW,
          h: pillH,
          rectRadius: 0.08,
          fill: { color: meta.color, transparency: 85 },
          line: { color: meta.color, width: 1 },
        });
        slide.addText(`${counts[status]} ${meta.label.toLowerCase()}`, {
          x,
          y: pillY,
          w: pillW,
          h: pillH,
          fontSize: 12,
          bold: true,
          color: meta.color,
          fontFace: FONT_BODY,
          align: 'center',
          valign: 'middle',
        });
      },
    );

    if (chunkMeasures.length === 0 || !minDate || !maxDate) {
      slide.addText('Sin medidas de mitigación registradas todavía.', {
        x: 0.5,
        y: 2.3,
        w: 12,
        h: 0.5,
        fontSize: 12,
        color: REPORT_COLORS.textMuted,
        fontFace: FONT_BODY,
      });
      return;
    }

    const axisY = 1.95;
    slide.addText(`Inicio: ${formatDateShort(minDate)}`, {
      x: barAreaX,
      y: axisY,
      w: barAreaW / 2,
      h: 0.25,
      fontSize: 9,
      color: REPORT_COLORS.textMuted,
      fontFace: FONT_BODY,
    });
    slide.addText(`Fin: ${formatDateShort(maxDate)}`, {
      x: barAreaX + barAreaW / 2,
      y: axisY,
      w: barAreaW / 2,
      h: 0.25,
      fontSize: 9,
      color: REPORT_COLORS.textMuted,
      fontFace: FONT_BODY,
      align: 'right',
    });

    const top = axisY + 0.3;
    const rowH = 0.62;
    const gap = 0.14;

    const isTodayVisible =
      today.getTime() >= minDate.getTime() &&
      today.getTime() <= maxDate.getTime();
    if (isTodayVisible && totalMs > 0) {
      const todayFrac = (today.getTime() - minDate.getTime()) / totalMs;
      const totalRowsH =
        chunkMeasures.length * rowH + (chunkMeasures.length - 1) * gap;
      slide.addShape(pptx.ShapeType.line, {
        x: barAreaX + todayFrac * barAreaW,
        y: top,
        w: 0,
        h: totalRowsH,
        line: {
          color: REPORT_COLORS.brandGreenDark,
          width: 1,
          dashType: 'dash',
        },
      });
      slide.addText('Hoy', {
        x: barAreaX + todayFrac * barAreaW - 0.4,
        y: top - 0.28,
        w: 0.8,
        h: 0.22,
        fontSize: 8,
        bold: true,
        color: REPORT_COLORS.brandGreenDark,
        fontFace: FONT_BODY,
        align: 'center',
      });
    }

    chunkMeasures.forEach((measure, idx) => {
      const y = top + idx * (rowH + gap);
      const meta =
        MEASURE_STATUS_META[measure.status] ?? MEASURE_STATUS_META.PENDING;

      slide.addText(truncate(measure.name ?? '', 42), {
        x: 0.5,
        y,
        w: barAreaX - 0.65,
        h: rowH,
        fontSize: 10,
        color: REPORT_COLORS.darkHeading,
        fontFace: FONT_BODY,
        valign: 'middle',
      });

      const trackY = y + rowH / 2 - 0.09;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: barAreaX,
        y: trackY,
        w: barAreaW,
        h: 0.18,
        rectRadius: 0.09,
        fill: { color: REPORT_COLORS.borderGray },
        line: { color: REPORT_COLORS.borderGray, width: 0 },
      });

      const startFrac =
        (measure.startDate.getTime() - minDate.getTime()) / totalMs;
      const endFrac = (measure.endDate.getTime() - minDate.getTime()) / totalMs;
      const barX = barAreaX + Math.max(0, startFrac) * barAreaW;
      const barW = Math.max((endFrac - startFrac) * barAreaW, 0.12);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: barX,
        y: trackY,
        w: Math.min(barW, barAreaX + barAreaW - barX),
        h: 0.18,
        rectRadius: 0.09,
        fill: { color: meta.color },
        line: { color: meta.color, width: 0 },
      });

      slide.addText(`${measure.progressPct ?? 0}%`, {
        x: barX + barW + 0.1,
        y,
        w: 0.6,
        h: rowH,
        fontSize: 9,
        color: REPORT_COLORS.textMuted,
        fontFace: FONT_BODY,
        valign: 'middle',
      });
    });
  });
}

export function addClosingSlide(pptx: PptxGenJS, message: string): void {
  const slide = pptx.addSlide();
  slide.background = { color: REPORT_COLORS.bgCream };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 3.1,
    h: SLIDE_H,
    fill: { color: REPORT_COLORS.brandGreen, transparency: 12 },
    line: { color: REPORT_COLORS.brandGreen, width: 0 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: SLIDE_W - 2.4,
    y: SLIDE_H - 2.6,
    w: 3.6,
    h: 3.6,
    fill: { color: REPORT_COLORS.brandGreen, transparency: 100 },
    line: { color: REPORT_COLORS.brandGreen, width: 1.5, transparency: 50 },
  });
  slide.addText('Gracias', {
    x: 3.6,
    y: 2.9,
    w: 9,
    h: 1.0,
    fontSize: 34,
    bold: true,
    color: REPORT_COLORS.darkHeading,
    fontFace: FONT_HEAD,
  });
  slide.addText(message, {
    x: 3.6,
    y: 3.85,
    w: 8.8,
    h: 0.9,
    fontSize: 15,
    color: REPORT_COLORS.textBody,
    fontFace: FONT_BODY,
  });
}

export async function writePptxBuffer(pptx: PptxGenJS): Promise<Buffer> {
  return withExportSlot(async () => {
    const result = await pptx.write({ outputType: 'nodebuffer' });
    return result as Buffer;
  });
}
