import { withExportSlot } from './export-limiter';
import type PptxGenJS from 'pptxgenjs';

// `pptxgenjs`'s CJS build does `module.exports = PptxGenJS` (no `.default`),
// so a plain default import breaks under ts-jest (which honors tsconfig's
// missing `esModuleInterop`) even though it works fine under the SWC runtime
// Nest uses. A direct `require` + type cast works identically under both.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PptxGenJSCtor: typeof PptxGenJS = require('pptxgenjs');

// Diseño institucional y sobrio: fondo blanco, una sola familia tipográfica,
// verde de la fundación como único color de marca y los colores de semáforo
// reservados para los puntajes. Todos los gráficos son formas nativas, nunca
// gráficos de Office: así se ven igual en PowerPoint, Keynote y Google Slides.
export const REPORT_COLORS = {
  brand: '2F6B3B',
  brandSoft: 'E8F1EA',
  ink: '1E2B24',
  body: '3D4A42',
  muted: '6B7770',
  rule: 'D5DCD7',
  panel: 'F4F7F5',
  white: 'FFFFFF',
  tierRed: 'C62828',
  tierAmber: 'D99A06',
  tierGreen: '2E7D32',
  neutralGray: '9AA39E',
};

const FONT = 'Arial';
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const MARGIN = 0.6;
const CONTENT_W = SLIDE_W - MARGIN * 2;
const CONTENT_TOP = 1.55;
const CONTENT_BOTTOM = 6.85;

const footerLabels = new WeakMap<PptxGenJS, string>();

export function tierColor(score: number, lowMax = 5, mediumMax = 7): string {
  if (score <= lowMax) return REPORT_COLORS.tierRed;
  if (score < mediumMax) return REPORT_COLORS.tierAmber;
  return REPORT_COLORS.tierGreen;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonth(date: Date): string {
  const label = date.toLocaleDateString('es-EC', {
    month: 'short',
    year: '2-digit',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out.length > 0 ? out : [[]];
}

/** Tamaño de letra que deja entrar el texto en la caja (estimación por área). */
function fitFontSize(
  text: string,
  w: number,
  h: number,
  max: number,
  min: number,
): number {
  for (let size = max; size > min; size -= 0.5) {
    const charW = (size / 72) * 0.5;
    const lineH = (size / 72) * 1.35;
    const perLine = Math.max(1, Math.floor(w / charW));
    const lines = text
      .split('\n')
      .reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
    if (lines * lineH <= h) return size;
  }
  return min;
}

export function createReportPptx(footerLabel?: string): PptxGenJS {
  const pptx = new PptxGenJSCtor();
  pptx.defineLayout({
    name: 'ASSESSMENT_WIDE',
    width: SLIDE_W,
    height: SLIDE_H,
  });
  pptx.layout = 'ASSESSMENT_WIDE';
  footerLabels.set(pptx, footerLabel ?? 'Plataforma de evaluación');
  return pptx;
}

function addFooter(pptx: PptxGenJS, slide: PptxGenJS.Slide): void {
  slide.addShape(pptx.ShapeType.line, {
    x: MARGIN,
    y: SLIDE_H - 0.55,
    w: CONTENT_W,
    h: 0,
    line: { color: REPORT_COLORS.rule, width: 0.75 },
  });
  slide.addText(footerLabels.get(pptx) ?? '', {
    x: MARGIN,
    y: SLIDE_H - 0.5,
    w: CONTENT_W - 1,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT,
    color: REPORT_COLORS.muted,
  });
  slide.slideNumber = {
    x: SLIDE_W - MARGIN - 0.8,
    y: SLIDE_H - 0.5,
    w: 0.8,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT,
    color: REPORT_COLORS.muted,
    align: 'right',
  };
}

function newContentSlide(
  pptx: PptxGenJS,
  title: string,
  subtitle?: string,
): PptxGenJS.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: REPORT_COLORS.white };
  slide.addText(title, {
    x: MARGIN,
    y: 0.42,
    w: CONTENT_W,
    h: 0.55,
    fontSize: 24,
    bold: true,
    color: REPORT_COLORS.ink,
    fontFace: FONT,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: MARGIN,
      y: 0.98,
      w: CONTENT_W,
      h: 0.35,
      fontSize: 13,
      color: REPORT_COLORS.muted,
      fontFace: FONT,
      margin: 0,
    });
  }
  addFooter(pptx, slide);
  return slide;
}

function pageTitle(title: string, index: number, total: number): string {
  return total > 1 ? `${title} (${index + 1} de ${total})` : title;
}

/** Leyenda de la escala de puntajes, igual en todas las láminas que la usan. */
function addScaleLegend(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
): void {
  const items: Array<[string, string]> = [
    [REPORT_COLORS.tierRed, 'Bajo: 5 o menos'],
    [REPORT_COLORS.tierAmber, 'Medio: más de 5 y menos de 7'],
    [REPORT_COLORS.tierGreen, 'Alto: 7 o más'],
  ];
  let cx = x;
  for (const [color, label] of items) {
    slide.addShape(pptx.ShapeType.rect, {
      x: cx,
      y: y + 0.07,
      w: 0.16,
      h: 0.16,
      fill: { color },
      line: { color, width: 0 },
    });
    slide.addText(label, {
      x: cx + 0.22,
      y,
      w: 2.9,
      h: 0.3,
      fontSize: 10.5,
      color: REPORT_COLORS.body,
      fontFace: FONT,
      margin: 0,
      valign: 'middle',
    });
    cx += 0.22 + label.length * 0.085 + 0.45;
  }
}

// ── Portada ──────────────────────────────────────────────────────────────

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
  slide.background = { color: REPORT_COLORS.white };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.22,
    h: SLIDE_H,
    fill: { color: REPORT_COLORS.brand },
    line: { color: REPORT_COLORS.brand, width: 0 },
  });
  slide.addText(opts.tool.toUpperCase(), {
    x: 1.1,
    y: 2.2,
    w: 10.5,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: REPORT_COLORS.brand,
    fontFace: FONT,
    charSpacing: 2,
    margin: 0,
  });
  const nameSize = fitFontSize(opts.orgName, 11, 1.5, 40, 26);
  const nameLines = Math.max(
    1,
    Math.ceil(opts.orgName.length / Math.floor(11 / ((nameSize / 72) * 0.5))),
  );
  const nameH = Math.min(1.5, nameLines * (nameSize / 72) * 1.3 + 0.1);
  slide.addText(opts.orgName, {
    x: 1.1,
    y: 2.7,
    w: 11,
    h: nameH,
    fontSize: nameSize,
    bold: true,
    color: REPORT_COLORS.ink,
    fontFace: FONT,
    valign: 'top',
    margin: 0,
  });
  slide.addText(opts.subtitle, {
    x: 1.1,
    y: 2.7 + nameH + 0.2,
    w: 11,
    h: 0.5,
    fontSize: 18,
    color: REPORT_COLORS.body,
    fontFace: FONT,
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 1.1,
    y: 5.85,
    w: 11.6,
    h: 0,
    line: { color: REPORT_COLORS.rule, width: 0.75 },
  });
  slide.addText(
    [
      {
        text: 'Estado de la evaluación: ',
        options: { color: REPORT_COLORS.muted },
      },
      { text: opts.status, options: { bold: true, color: REPORT_COLORS.ink } },
      {
        text: '      Fecha del reporte: ',
        options: { color: REPORT_COLORS.muted },
      },
      { text: opts.date, options: { bold: true, color: REPORT_COLORS.ink } },
    ],
    {
      x: 1.1,
      y: 6.0,
      w: 11.6,
      h: 0.4,
      fontSize: 12,
      fontFace: FONT,
      margin: 0,
    },
  );
}

// ── Velocímetro dibujado con formas ──────────────────────────────────────

export type GaugeItem = { label: string; score: number; caption?: string };

// Ángulos OOXML: 0° al este, creciendo en sentido horario. El semicírculo
// superior va de 180° (puntaje 0) a 360° (puntaje 10). Cortes: rojo hasta 5,
// amarillo hasta 7, verde desde 7, como en la aplicación.
const GAUGE_ZONES: Array<[number, number, string]> = [
  [180, 270, REPORT_COLORS.tierRed],
  [270, 306, REPORT_COLORS.tierAmber],
  [306, 0, REPORT_COLORS.tierGreen],
];

function drawGauge(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  opts: {
    x: number;
    y: number;
    d: number;
    score: number;
    valueFontSize: number;
  },
): number {
  const { x, y, d } = opts;
  const cx = x + d / 2;
  const cy = y + d / 2;
  const score = Math.max(0, Math.min(10, opts.score));
  for (const [from, to, color] of GAUGE_ZONES) {
    slide.addShape(pptx.ShapeType.blockArc, {
      x,
      y,
      w: d,
      h: d,
      angleRange: [from, to],
      arcThicknessRatio: 0.16,
      fill: { color },
      line: { color, width: 0 },
    });
  }
  const theta = 180 + score * 18;
  const rad = (theta * Math.PI) / 180;
  const len = (d / 2) * 0.68;
  const thickness = Math.max(0.03, d * 0.02);
  slide.addShape(pptx.ShapeType.rect, {
    x: cx + (len / 2) * Math.cos(rad) - len / 2,
    y: cy + (len / 2) * Math.sin(rad) - thickness / 2,
    w: len,
    h: thickness,
    rotate: theta,
    fill: { color: REPORT_COLORS.ink },
    line: { color: REPORT_COLORS.ink, width: 0 },
  });
  const pivot = Math.max(0.08, d * 0.06);
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx - pivot / 2,
    y: cy - pivot / 2,
    w: pivot,
    h: pivot,
    fill: { color: REPORT_COLORS.ink },
    line: { color: REPORT_COLORS.ink, width: 0 },
  });
  const valueH = opts.valueFontSize / 50;
  slide.addText(score.toFixed(1), {
    x,
    y: cy + pivot * 0.7,
    w: d,
    h: valueH,
    fontSize: opts.valueFontSize,
    bold: true,
    align: 'center',
    color: tierColor(score),
    fontFace: FONT,
    margin: 0,
  });
  return cy + pivot * 0.7 + valueH;
}

/** Velocímetros por sección, en una cuadrícula de hasta 3 × 2 por lámina. */
export function addGaugeSlide(
  pptx: PptxGenJS,
  opts: { title: string; subtitle?: string; items: GaugeItem[] },
): void {
  const pages = chunk(opts.items, 6);
  pages.forEach((items, page) => {
    const slide = newContentSlide(
      pptx,
      pageTitle(opts.title, page, pages.length),
      opts.subtitle,
    );
    const cols =
      items.length === 4 ? 2 : Math.min(3, Math.max(1, items.length));
    const cellW = CONTENT_W / cols;
    const rows = Math.ceil(items.length / cols);
    const cellH = (CONTENT_BOTTOM - 0.45 - CONTENT_TOP) / Math.max(rows, 1);
    const d = Math.min(2.3, cellW - 1, cellH - 0.9);
    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = MARGIN + col * cellW;
      const y = CONTENT_TOP + row * cellH;
      const bottom = drawGauge(pptx, slide, {
        x: x + (cellW - d) / 2,
        y: y + 0.05,
        d,
        score: item.score,
        valueFontSize: 22,
      });
      slide.addText(item.label, {
        x: x + 0.2,
        y: bottom + 0.02,
        w: cellW - 0.4,
        h: 0.6,
        fontSize: 12,
        color: REPORT_COLORS.ink,
        fontFace: FONT,
        align: 'center',
        valign: 'top',
        margin: 0,
      });
    });
    addScaleLegend(pptx, slide, MARGIN, CONTENT_BOTTOM - 0.3);
  });
}

// ── Resumen ejecutivo ────────────────────────────────────────────────────

export function addExecutiveSummarySlide(
  pptx: PptxGenJS,
  opts: {
    title: string;
    globalScore: number;
    level: string;
    facts: Array<{ label: string; value: string }>;
    narrative?: string;
  },
): void {
  const slide = newContentSlide(pptx, opts.title);
  const leftW = 4.1;

  // Columna izquierda: puntaje global y cifras clave.
  const bottom = drawGauge(pptx, slide, {
    x: MARGIN + (leftW - 2.6) / 2,
    y: CONTENT_TOP + 0.05,
    d: 2.6,
    score: opts.globalScore,
    valueFontSize: 34,
  });
  slide.addText(`Puntaje global · ${opts.level}`, {
    x: MARGIN,
    y: bottom,
    w: leftW,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: REPORT_COLORS.ink,
    fontFace: FONT,
    align: 'center',
    margin: 0,
  });
  const factsY = bottom + 0.55;
  const factH = Math.min(
    0.48,
    (CONTENT_BOTTOM - factsY) / Math.max(opts.facts.length, 1),
  );
  opts.facts.forEach((fact, i) => {
    const y = factsY + i * factH;
    slide.addText(fact.label, {
      x: MARGIN,
      y,
      w: leftW - 1.1,
      h: factH,
      fontSize: 12.5,
      color: REPORT_COLORS.body,
      fontFace: FONT,
      valign: 'middle',
      margin: 0,
    });
    slide.addText(fact.value, {
      x: MARGIN + leftW - 1.1,
      y,
      w: 1.1,
      h: factH,
      fontSize: 15,
      bold: true,
      color: REPORT_COLORS.ink,
      fontFace: FONT,
      align: 'right',
      valign: 'middle',
      margin: 0,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: MARGIN,
      y: y + factH,
      w: leftW,
      h: 0,
      line: { color: REPORT_COLORS.rule, width: 0.75 },
    });
  });

  // Columna derecha: la síntesis en texto.
  const rightX = MARGIN + leftW + 0.6;
  const rightW = SLIDE_W - MARGIN - rightX;
  slide.addShape(pptx.ShapeType.line, {
    x: rightX - 0.3,
    y: CONTENT_TOP,
    w: 0,
    h: CONTENT_BOTTOM - CONTENT_TOP,
    line: { color: REPORT_COLORS.rule, width: 0.75 },
  });
  slide.addText('Síntesis', {
    x: rightX,
    y: CONTENT_TOP,
    w: rightW,
    h: 0.4,
    fontSize: 15,
    bold: true,
    color: REPORT_COLORS.brand,
    fontFace: FONT,
    margin: 0,
  });
  const text =
    opts.narrative?.trim() ||
    'Esta evaluación no tiene una síntesis redactada. Las láminas siguientes presentan los puntajes, los indicadores críticos y el plan de acción.';
  const textH = CONTENT_BOTTOM - CONTENT_TOP - 0.5;
  slide.addText(text, {
    x: rightX,
    y: CONTENT_TOP + 0.5,
    w: rightW,
    h: textH,
    fontSize: fitFontSize(text, rightW, textH, 15, 10.5),
    color: REPORT_COLORS.body,
    fontFace: FONT,
    valign: 'top',
    paraSpaceAfter: 6,
    lineSpacingMultiple: 1.15,
    margin: 0,
  });
}

// ── Detalle por sección: barras horizontales con peso y conteos ──────────

export type SectionRow = {
  label: string;
  weightPct: number;
  score: number;
  evaluated: number;
  critical: number;
};

export function addSectionScoresSlide(
  pptx: PptxGenJS,
  opts: {
    title: string;
    subtitle?: string;
    sectionLabel: string;
    rows: SectionRow[];
  },
): void {
  const pages = chunk(opts.rows, 8);
  pages.forEach((rows, page) => {
    const slide = newContentSlide(
      pptx,
      pageTitle(opts.title, page, pages.length),
      opts.subtitle,
    );
    // Columnas: sección | peso | barra 0-10 | puntaje | KPI | críticos
    const colX = {
      label: MARGIN,
      weight: MARGIN + 4.5,
      bar: MARGIN + 5.5,
      score: MARGIN + 10.1,
      evaluated: MARGIN + 10.85,
      critical: MARGIN + 11.5,
    };
    const barW = 4.3;
    const headY = CONTENT_TOP;
    const head = (
      text: string,
      x: number,
      w: number,
      align: 'left' | 'center' | 'right' = 'left',
    ) =>
      slide.addText(text, {
        x,
        y: headY,
        w,
        h: 0.3,
        fontSize: 10.5,
        bold: true,
        color: REPORT_COLORS.muted,
        fontFace: FONT,
        align,
        margin: 0,
      });
    head(opts.sectionLabel, colX.label, 4.3);
    head('Peso', colX.weight, 0.8, 'center');
    head('Puntaje de 0 a 10', colX.bar, barW);
    head('Nota', colX.score, 0.7, 'center');
    head('KPI', colX.evaluated, 0.6, 'center');
    head('Críticos', colX.critical, 0.75, 'center');
    slide.addShape(pptx.ShapeType.line, {
      x: MARGIN,
      y: headY + 0.35,
      w: CONTENT_W,
      h: 0,
      line: { color: REPORT_COLORS.ink, width: 1 },
    });

    const top = headY + 0.45;
    const rowH = Math.min(
      0.62,
      (CONTENT_BOTTOM - 0.45 - top) / Math.max(rows.length, 1),
    );
    // Marcas de los cortes 5 y 7 sobre toda la columna de barras.
    for (const mark of [5, 7]) {
      slide.addShape(pptx.ShapeType.line, {
        x: colX.bar + (mark / 10) * barW,
        y: top,
        w: 0,
        h: rowH * rows.length,
        line: { color: REPORT_COLORS.rule, width: 0.75, dashType: 'dash' },
      });
    }
    rows.forEach((row, i) => {
      const y = top + i * rowH;
      const color = tierColor(row.score);
      const cell = (
        text: string,
        x: number,
        w: number,
        extra: Partial<PptxGenJS.TextPropsOptions> = {},
      ) =>
        slide.addText(text, {
          x,
          y,
          w,
          h: rowH,
          fontSize: 12,
          color: REPORT_COLORS.ink,
          fontFace: FONT,
          valign: 'middle',
          margin: 0,
          ...extra,
        });
      cell(row.label, colX.label, 4.3, {
        fontSize: fitFontSize(row.label, 4.3, rowH - 0.05, 12, 9.5),
      });
      cell(`${row.weightPct} %`, colX.weight, 0.8, {
        align: 'center',
        color: REPORT_COLORS.body,
      });
      const barH = Math.min(0.26, rowH * 0.42);
      slide.addShape(pptx.ShapeType.rect, {
        x: colX.bar,
        y: y + (rowH - barH) / 2,
        w: barW,
        h: barH,
        fill: { color: REPORT_COLORS.panel },
        line: { color: REPORT_COLORS.panel, width: 0 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: colX.bar,
        y: y + (rowH - barH) / 2,
        w: Math.max(0.02, (Math.max(0, Math.min(10, row.score)) / 10) * barW),
        h: barH,
        fill: { color },
        line: { color, width: 0 },
      });
      cell(row.score.toFixed(1), colX.score, 0.7, {
        align: 'center',
        bold: true,
        color,
        fontSize: 13,
      });
      cell(String(row.evaluated), colX.evaluated, 0.6, {
        align: 'center',
        color: REPORT_COLORS.body,
      });
      cell(String(row.critical), colX.critical, 0.75, {
        align: 'center',
        bold: row.critical > 0,
        color: row.critical > 0 ? REPORT_COLORS.tierRed : REPORT_COLORS.body,
      });
      slide.addShape(pptx.ShapeType.line, {
        x: MARGIN,
        y: y + rowH,
        w: CONTENT_W,
        h: 0,
        line: { color: REPORT_COLORS.rule, width: 0.5 },
      });
    });
    addScaleLegend(pptx, slide, MARGIN, CONTENT_BOTTOM - 0.3);
  });
}

// ── Tabla genérica paginada ──────────────────────────────────────────────

export type TableCell =
  | string
  | {
      text: string;
      color?: string;
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
    };

export interface TableColumn {
  header: string;
  /** Ancho relativo; se reparte sobre el ancho útil de la lámina. */
  weight: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Tabla con encabezado verde, letra de 11 puntos y filas paginadas. Cada
 * lámina repite el encabezado. `summary` es una línea de contexto arriba.
 */
export function addTableSlide(
  pptx: PptxGenJS,
  opts: {
    title: string;
    subtitle?: string;
    summary?: Array<{ text: string; color?: string }>;
    columns: TableColumn[];
    rows: TableCell[][];
    emptyText: string;
    rowsPerSlide?: number;
  },
): void {
  const totalWeight = opts.columns.reduce((s, c) => s + c.weight, 0);
  const colW = opts.columns.map((c) => (c.weight / totalWeight) * CONTENT_W);
  const pages = chunk(opts.rows, opts.rowsPerSlide ?? 8);

  pages.forEach((rows, page) => {
    const slide = newContentSlide(
      pptx,
      pageTitle(opts.title, page, pages.length),
      opts.subtitle,
    );
    let y = CONTENT_TOP;
    if (opts.summary && opts.summary.length > 0) {
      slide.addText(
        opts.summary.flatMap((part, i) => [
          ...(i > 0 ? [{ text: '     ', options: {} }] : []),
          {
            text: part.text,
            options: { bold: true, color: part.color ?? REPORT_COLORS.ink },
          },
        ]),
        {
          x: MARGIN,
          y,
          w: CONTENT_W,
          h: 0.35,
          fontSize: 13,
          fontFace: FONT,
          margin: 0,
        },
      );
      y += 0.5;
    }
    if (rows.length === 0) {
      slide.addText(opts.emptyText, {
        x: MARGIN,
        y,
        w: CONTENT_W,
        h: 0.5,
        fontSize: 14,
        color: REPORT_COLORS.muted,
        fontFace: FONT,
        margin: 0,
      });
      return;
    }
    const header = opts.columns.map((c) => ({
      text: c.header,
      options: {
        bold: true,
        color: REPORT_COLORS.white,
        fill: { color: REPORT_COLORS.brand },
        align: c.align ?? 'left',
        fontSize: 11.5,
      },
    }));
    const body = rows.map((row, r) =>
      row.map((cell, c) => {
        const value = typeof cell === 'string' ? { text: cell } : cell;
        return {
          text: value.text,
          options: {
            color: value.color ?? REPORT_COLORS.ink,
            bold: value.bold ?? false,
            align: value.align ?? opts.columns[c].align ?? 'left',
            fill: {
              color: r % 2 === 1 ? REPORT_COLORS.panel : REPORT_COLORS.white,
            },
            fontSize: 11,
          },
        };
      }),
    );
    slide.addTable([header, ...body] as PptxGenJS.TableRow[], {
      x: MARGIN,
      y,
      w: CONTENT_W,
      colW,
      fontFace: FONT,
      valign: 'middle',
      margin: [0.06, 0.1, 0.06, 0.1],
      border: { type: 'solid', color: REPORT_COLORS.rule, pt: 0.5 },
      autoPage: false,
    });
  });
}

// ── Lista numerada (hallazgos y recomendaciones) ─────────────────────────

export function addNumberedListSlide(
  pptx: PptxGenJS,
  opts: { title: string; subtitle?: string; items: string[] },
): void {
  const pages = chunk(opts.items, 6);
  pages.forEach((items, page) => {
    const slide = newContentSlide(
      pptx,
      pageTitle(opts.title, page, pages.length),
      opts.subtitle,
    );
    const rowH = (CONTENT_BOTTOM - CONTENT_TOP) / 6;
    items.forEach((item, i) => {
      const y = CONTENT_TOP + i * rowH;
      slide.addText(String(page * 6 + i + 1), {
        x: MARGIN,
        y,
        w: 0.6,
        h: rowH,
        fontSize: 22,
        bold: true,
        color: REPORT_COLORS.brand,
        fontFace: FONT,
        valign: 'middle',
        margin: 0,
      });
      slide.addText(item, {
        x: MARGIN + 0.75,
        y,
        w: CONTENT_W - 0.75,
        h: rowH,
        fontSize: fitFontSize(item, CONTENT_W - 0.75, rowH - 0.1, 15, 11),
        color: REPORT_COLORS.ink,
        fontFace: FONT,
        valign: 'middle',
        margin: 0,
      });
      if (i < items.length - 1) {
        slide.addShape(pptx.ShapeType.line, {
          x: MARGIN + 0.75,
          y: y + rowH,
          w: CONTENT_W - 0.75,
          h: 0,
          line: { color: REPORT_COLORS.rule, width: 0.5 },
        });
      }
    });
  });
}

// ── Barra apilada (proporciones de un total) ─────────────────────────────

export function addProportionBar(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  opts: {
    x: number;
    y: number;
    w: number;
    parts: Array<{ label: string; value: number; color: string }>;
  },
): void {
  const total = opts.parts.reduce((s, p) => s + p.value, 0) || 1;
  let x = opts.x;
  for (const part of opts.parts) {
    const w = (part.value / total) * opts.w;
    if (w <= 0) continue;
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: opts.y,
      w,
      h: 0.42,
      fill: { color: part.color },
      line: { color: REPORT_COLORS.white, width: 1 },
    });
    if (w > 0.6) {
      slide.addText(String(part.value), {
        x,
        y: opts.y,
        w,
        h: 0.42,
        fontSize: 12,
        bold: true,
        color: REPORT_COLORS.white,
        fontFace: FONT,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });
    }
    x += w;
  }
  slide.addText(
    opts.parts.flatMap((part, i) => [
      ...(i > 0 ? [{ text: '      ', options: {} }] : []),
      { text: '■ ', options: { color: part.color } },
      {
        text: `${part.label}: ${part.value} (${Math.round((part.value / total) * 100)} %)`,
        options: { color: REPORT_COLORS.body },
      },
    ]),
    {
      x: opts.x,
      y: opts.y + 0.5,
      w: opts.w,
      h: 0.3,
      fontSize: 11.5,
      fontFace: FONT,
      margin: 0,
    },
  );
}

export function addClassificationSlide(
  pptx: PptxGenJS,
  opts: {
    title: string;
    subtitle?: string;
    totals: Array<{ label: string; value: number; color: string }>;
    columns: TableColumn[];
    rows: TableCell[][];
  },
): void {
  const slide = newContentSlide(pptx, opts.title, opts.subtitle);
  addProportionBar(pptx, slide, {
    x: MARGIN,
    y: CONTENT_TOP,
    w: CONTENT_W,
    parts: opts.totals,
  });
  const totalWeight = opts.columns.reduce((s, c) => s + c.weight, 0);
  const header = opts.columns.map((c) => ({
    text: c.header,
    options: {
      bold: true,
      color: REPORT_COLORS.white,
      fill: { color: REPORT_COLORS.brand },
      align: c.align ?? 'left',
      fontSize: 11.5,
    },
  }));
  const body = opts.rows.map((row, r) =>
    row.map((cell, c) => {
      const value = typeof cell === 'string' ? { text: cell } : cell;
      return {
        text: value.text,
        options: {
          color: value.color ?? REPORT_COLORS.ink,
          bold: value.bold ?? false,
          align: value.align ?? opts.columns[c].align ?? 'left',
          fill: {
            color: r % 2 === 1 ? REPORT_COLORS.panel : REPORT_COLORS.white,
          },
          fontSize: 12,
        },
      };
    }),
  );
  slide.addTable([header, ...body] as PptxGenJS.TableRow[], {
    x: MARGIN,
    y: CONTENT_TOP + 1.05,
    w: CONTENT_W,
    colW: opts.columns.map((c) => (c.weight / totalWeight) * CONTENT_W),
    fontFace: FONT,
    valign: 'middle',
    margin: [0.08, 0.1, 0.08, 0.1],
    border: { type: 'solid', color: REPORT_COLORS.rule, pt: 0.5 },
    autoPage: false,
  });
}

// ── Cronograma (Gantt) ───────────────────────────────────────────────────

export type TimelineMeasure = {
  name: string;
  detail?: string;
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

function hasValidSchedule(m: TimelineMeasure): boolean {
  return (
    m.startDate instanceof Date &&
    !isNaN(m.startDate.getTime()) &&
    m.endDate instanceof Date &&
    !isNaN(m.endDate.getTime())
  );
}

export function addTimelineSlide(
  pptx: PptxGenJS,
  opts: { title: string; nameHeader?: string; measures: TimelineMeasure[] },
): void {
  const counts = {
    PENDING: opts.measures.filter((m) => m.status === 'PENDING').length,
    IN_PROGRESS: opts.measures.filter((m) => m.status === 'IN_PROGRESS').length,
    DONE: opts.measures.filter((m) => m.status === 'DONE').length,
  };
  const dated = opts.measures
    .filter(hasValidSchedule)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const pages = chunk(dated, 8);
  const summary = [
    { text: `${opts.measures.length} en total`, color: REPORT_COLORS.ink },
    { text: `${counts.DONE} concluidas`, color: REPORT_COLORS.tierGreen },
    {
      text: `${counts.IN_PROGRESS} en progreso`,
      color: REPORT_COLORS.tierAmber,
    },
    { text: `${counts.PENDING} pendientes`, color: REPORT_COLORS.muted },
  ];

  // Escala por meses completos, del mes de la primera medida al de la última.
  const first = dated[0]?.startDate;
  const last = dated.length
    ? new Date(Math.max(...dated.map((m) => m.endDate.getTime())))
    : undefined;
  const start = first
    ? new Date(first.getFullYear(), first.getMonth(), 1)
    : undefined;
  const end = last
    ? new Date(last.getFullYear(), last.getMonth() + 1, 1)
    : undefined;
  const span = start && end ? end.getTime() - start.getTime() : 0;
  const nameW = 4.4;
  const areaX = MARGIN + nameW + 0.2;
  const areaW = SLIDE_W - MARGIN - areaX - 0.55;
  const xOf = (d: Date) =>
    areaX + ((d.getTime() - (start?.getTime() ?? 0)) / span) * areaW;
  const today = new Date();

  pages.forEach((rows, page) => {
    const slide = newContentSlide(
      pptx,
      pageTitle(opts.title, page, pages.length),
    );
    slide.addText(
      summary.flatMap((part, i) => [
        ...(i > 0
          ? [{ text: '   ·   ', options: { color: REPORT_COLORS.muted } }]
          : []),
        { text: part.text, options: { bold: true, color: part.color } },
      ]),
      {
        x: MARGIN,
        y: CONTENT_TOP - 0.05,
        w: CONTENT_W,
        h: 0.35,
        fontSize: 13,
        fontFace: FONT,
        margin: 0,
      },
    );
    if (rows.length === 0 || !start || !end) {
      slide.addText('No hay medidas con fechas registradas todavía.', {
        x: MARGIN,
        y: CONTENT_TOP + 0.6,
        w: CONTENT_W,
        h: 0.5,
        fontSize: 14,
        color: REPORT_COLORS.muted,
        fontFace: FONT,
        margin: 0,
      });
      return;
    }

    const headY = CONTENT_TOP + 0.5;
    const top = headY + 0.4;
    const rowH = Math.min(0.58, (CONTENT_BOTTOM - top) / rows.length);
    const gridH = rowH * rows.length;
    slide.addText(opts.nameHeader ?? 'Medida', {
      x: MARGIN,
      y: headY,
      w: nameW,
      h: 0.3,
      fontSize: 10.5,
      bold: true,
      color: REPORT_COLORS.muted,
      fontFace: FONT,
      margin: 0,
    });
    // Meses: etiqueta y línea vertical; si son muchos, se etiqueta uno de cada n.
    const months: Date[] = [];
    for (
      let d = new Date(start);
      d < end;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    )
      months.push(d);
    const every = Math.ceil(months.length / 12);
    months.forEach((m, i) => {
      const x = xOf(m);
      slide.addShape(pptx.ShapeType.line, {
        x,
        y: headY + 0.32,
        w: 0,
        h: gridH + 0.08,
        line: { color: REPORT_COLORS.rule, width: 0.5 },
      });
      if (i % every === 0) {
        slide.addText(formatMonth(m), {
          x: x + 0.03,
          y: headY,
          w: 1,
          h: 0.3,
          fontSize: 10,
          color: REPORT_COLORS.muted,
          fontFace: FONT,
          margin: 0,
        });
      }
    });
    slide.addShape(pptx.ShapeType.line, {
      x: MARGIN,
      y: headY + 0.32,
      w: CONTENT_W,
      h: 0,
      line: { color: REPORT_COLORS.ink, width: 1 },
    });

    rows.forEach((m, i) => {
      const y = top + i * rowH;
      const meta = MEASURE_STATUS_META[m.status] ?? MEASURE_STATUS_META.PENDING;
      const name = truncate(m.name ?? '', 90);
      slide.addText(
        [
          {
            text: name,
            options: { color: REPORT_COLORS.ink, breakLine: true },
          },
          {
            text: `${meta.label} · ${m.progressPct ?? 0} %${m.detail ? ` · ${m.detail}` : ''}`,
            options: { color: REPORT_COLORS.muted, fontSize: 9.5 },
          },
        ],
        {
          x: MARGIN,
          y,
          w: nameW,
          h: rowH,
          fontSize: fitFontSize(name, nameW, rowH * 0.6, 11.5, 9),
          fontFace: FONT,
          valign: 'middle',
          margin: 0,
        },
      );
      const barH = Math.min(0.24, rowH * 0.4);
      const x0 = xOf(m.startDate);
      const x1 = Math.max(xOf(m.endDate), x0 + 0.06);
      slide.addShape(pptx.ShapeType.rect, {
        x: x0,
        y: y + (rowH - barH) / 2,
        w: x1 - x0,
        h: barH,
        fill: { color: meta.color, transparency: 65 },
        line: { color: meta.color, width: 0 },
      });
      const done = Math.max(0, Math.min(100, m.progressPct ?? 0)) / 100;
      if (done > 0) {
        slide.addShape(pptx.ShapeType.rect, {
          x: x0,
          y: y + (rowH - barH) / 2,
          w: Math.max(0.03, (x1 - x0) * done),
          h: barH,
          fill: { color: meta.color },
          line: { color: meta.color, width: 0 },
        });
      }
      slide.addShape(pptx.ShapeType.line, {
        x: MARGIN,
        y: y + rowH,
        w: CONTENT_W,
        h: 0,
        line: { color: REPORT_COLORS.rule, width: 0.5 },
      });
    });

    if (today >= start && today <= end) {
      const x = xOf(today);
      slide.addShape(pptx.ShapeType.line, {
        x,
        y: headY + 0.32,
        w: 0,
        h: gridH + 0.08,
        line: { color: REPORT_COLORS.tierRed, width: 1.25, dashType: 'dash' },
      });
      slide.addText('Hoy', {
        x: x - 0.4,
        y: top + gridH + 0.08,
        w: 0.8,
        h: 0.25,
        fontSize: 9.5,
        bold: true,
        color: REPORT_COLORS.tierRed,
        fontFace: FONT,
        align: 'center',
        margin: 0,
      });
    }
  });
}

// ── Evolución entre evaluaciones ─────────────────────────────────────────

export type EvolutionPoint = {
  date: Date;
  globalScore: number;
  measuresTotal: number;
  measuresDone: number;
};

/** Columnas dibujadas por evaluación completada y la tabla de variaciones. */
export function addEvolutionSlide(
  pptx: PptxGenJS,
  opts: { title: string; points: EvolutionPoint[] },
): void {
  const points = opts.points.slice(-8);
  const slide = newContentSlide(
    pptx,
    opts.title,
    'Puntaje global de cada evaluación completada, de la más antigua a la más reciente',
  );
  const chartX = MARGIN + 0.5;
  const chartW = 6.6;
  const chartTop = CONTENT_TOP + 0.3;
  const chartH = CONTENT_BOTTOM - 0.8 - chartTop;
  const baseY = chartTop + chartH;
  for (const tick of [0, 5, 7, 10]) {
    const y = baseY - (tick / 10) * chartH;
    slide.addShape(pptx.ShapeType.line, {
      x: chartX,
      y,
      w: chartW,
      h: 0,
      line: {
        color: tick === 0 ? REPORT_COLORS.ink : REPORT_COLORS.rule,
        width: tick === 0 ? 1 : 0.5,
        dashType: tick === 0 ? 'solid' : 'dash',
      },
    });
    slide.addText(String(tick), {
      x: MARGIN,
      y: y - 0.13,
      w: 0.4,
      h: 0.26,
      fontSize: 10,
      color: REPORT_COLORS.muted,
      fontFace: FONT,
      align: 'right',
      margin: 0,
    });
  }
  const slot = chartW / Math.max(points.length, 1);
  const colW = Math.min(0.9, slot * 0.55);
  points.forEach((p, i) => {
    const h = (Math.max(0, Math.min(10, p.globalScore)) / 10) * chartH;
    const x = chartX + i * slot + (slot - colW) / 2;
    const color = tierColor(p.globalScore);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: baseY - h,
      w: colW,
      h: Math.max(0.02, h),
      fill: { color },
      line: { color, width: 0 },
    });
    slide.addText(p.globalScore.toFixed(1), {
      x: x - 0.3,
      y: baseY - h - 0.32,
      w: colW + 0.6,
      h: 0.28,
      fontSize: 12,
      bold: true,
      color: REPORT_COLORS.ink,
      fontFace: FONT,
      align: 'center',
      margin: 0,
    });
    slide.addText(formatDate(p.date), {
      x: x - 0.35,
      y: baseY + 0.08,
      w: colW + 0.7,
      h: 0.3,
      fontSize: 10,
      color: REPORT_COLORS.body,
      fontFace: FONT,
      align: 'center',
      margin: 0,
    });
  });

  const tableX = chartX + chartW + 0.5;
  const tableW = SLIDE_W - MARGIN - tableX;
  const header = [
    'Evaluación',
    'Puntaje',
    'Variación',
    'Medidas concluidas',
  ].map((t, i) => ({
    text: t,
    options: {
      bold: true,
      color: REPORT_COLORS.white,
      fill: { color: REPORT_COLORS.brand },
      align: (i === 0 ? 'left' : 'center') as 'left' | 'center',
      fontSize: 11,
    },
  }));
  const body = points.map((p, i) => {
    // Se compara ya redondeado a un decimal, como se muestra: así no aparece
    // "-0.0" cuando la diferencia real es de centésimas.
    const delta =
      i === 0
        ? null
        : Number(p.globalScore.toFixed(1)) -
          Number(points[i - 1].globalScore.toFixed(1));
    const deltaText =
      delta === null
        ? '—'
        : Math.abs(delta) < 0.05
          ? 'Sin cambio'
          : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
    const deltaColor =
      delta === null || Math.abs(delta) < 0.05
        ? REPORT_COLORS.body
        : delta > 0
          ? REPORT_COLORS.tierGreen
          : REPORT_COLORS.tierRed;
    const fill = {
      color: i % 2 === 1 ? REPORT_COLORS.panel : REPORT_COLORS.white,
    };
    return [
      {
        text: formatDate(p.date),
        options: { color: REPORT_COLORS.ink, fill, fontSize: 11 },
      },
      {
        text: p.globalScore.toFixed(1),
        options: {
          bold: true,
          color: tierColor(p.globalScore),
          align: 'center' as const,
          fill,
          fontSize: 11,
        },
      },
      {
        text: deltaText,
        options: {
          bold: true,
          color: deltaColor,
          align: 'center' as const,
          fill,
          fontSize: 11,
        },
      },
      {
        text: `${p.measuresDone} de ${p.measuresTotal}`,
        options: {
          color: REPORT_COLORS.body,
          align: 'center' as const,
          fill,
          fontSize: 11,
        },
      },
    ];
  });
  slide.addTable([header, ...body] as PptxGenJS.TableRow[], {
    x: tableX,
    y: CONTENT_TOP + 0.3,
    w: tableW,
    colW: [tableW * 0.3, tableW * 0.17, tableW * 0.27, tableW * 0.26],
    fontFace: FONT,
    valign: 'middle',
    margin: [0.06, 0.08, 0.06, 0.08],
    border: { type: 'solid', color: REPORT_COLORS.rule, pt: 0.5 },
    autoPage: false,
  });
}

export async function writePptxBuffer(pptx: PptxGenJS): Promise<Buffer> {
  return withExportSlot(async () => {
    const result = await pptx.write({ outputType: 'nodebuffer' });
    return result as Buffer;
  });
}
