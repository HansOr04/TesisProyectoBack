import { withExportSlot } from './export-limiter';
import type PptxGenJS from 'pptxgenjs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PptxGenJSCtor: typeof PptxGenJS = require('pptxgenjs');

export const REPORT_COLORS = {
  brand: '2F6B3B',
  ink: '1E2B24',
  body: '3D4A42',
  muted: '6B7770',
  rule: 'DDE2DF',
  panel: 'F6F8F7',
  track: 'E9ECEA',
  white: 'FFFFFF',
  tierRed: 'C62828',
  tierRedSoft: 'FDEDED',
  tierAmber: 'E39A0B',
  tierAmberSoft: 'FFF5DF',
  tierGreen: '2E7D32',
  tierGreenSoft: 'EAF5EB',
  swotBlue: '1565C0',
  swotBlueSoft: 'E8F0FB',
  neutralGray: '9AA39E',
  lightOff: '4A4F4C',
  lightCase: '2B2F2D',
};

const FONT = 'Arial';
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const SIDEBAR_W = 0.85;
const X0 = 1.3;
const RIGHT = SLIDE_W - 0.6;
const CONTENT_W = RIGHT - X0;
const CONTENT_TOP = 1.85;
const CONTENT_BOTTOM = 6.9;

interface ReportTheme {
  accent: string;
  dark: string;
  soft: string;
  tint: string;
  footer: string;
  initials: string;
}

const themes = new WeakMap<PptxGenJS, ReportTheme>();

function theme(pptx: PptxGenJS): ReportTheme {
  return (
    themes.get(pptx) ?? {
      accent: REPORT_COLORS.brand,
      dark: mix(REPORT_COLORS.brand, '000000', 0.3),
      soft: mix(REPORT_COLORS.brand, 'FFFFFF', 0.85),
      tint: mix(REPORT_COLORS.brand, 'FFFFFF', 0.94),
      footer: 'Plataforma de evaluación',
      initials: '',
    }
  );
}

export function mix(from: string, to: string, ratio: number): string {
  const a = parseInt(from, 16);
  const b = parseInt(to, 16);
  const channel = (shift: number) => {
    const x = (a >> shift) & 0xff;
    const y = (b >> shift) & 0xff;
    return Math.round(x + (y - x) * ratio);
  };
  return [16, 8, 0]
    .map((s) => channel(s).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export function scorePct(score: number): number {
  return Math.round(Math.max(0, Math.min(10, score)) * 10);
}

export function pctLabel(score: number): string {
  return `${scorePct(score)} %`;
}

export function tierColor(score: number, lowMax = 5, mediumMax = 7): string {
  if (score <= lowMax) return REPORT_COLORS.tierRed;
  if (score < mediumMax) return REPORT_COLORS.tierAmber;
  return REPORT_COLORS.tierGreen;
}

function tierSoft(score: number): string {
  if (score <= 5) return REPORT_COLORS.tierRedSoft;
  if (score < 7) return REPORT_COLORS.tierAmberSoft;
  return REPORT_COLORS.tierGreenSoft;
}

export function tierLevel(score: number): 'Bajo' | 'Medio' | 'Alto' {
  if (score <= 5) return 'Bajo';
  if (score < 7) return 'Medio';
  return 'Alto';
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

function truncate(text: string | null | undefined, max: number): string {
  const value = text ?? '';
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function isDate(d: unknown): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out.length > 0 ? out : [[]];
}

function fitFontSize(
  text: string,
  w: number,
  h: number,
  max: number,
  min: number,
  charEm = 0.46,
  lineEm = 1.25,
): number {
  for (let size = max; size > min; size -= 0.5) {
    const charW = (size / 72) * charEm;
    const lineH = (size / 72) * lineEm;
    const perLine = Math.max(1, Math.floor(w / charW));
    const lines = text
      .split('\n')
      .reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
    if (lines * lineH <= h) return size;
  }
  return min;
}

function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(de|del|la|las|los|y|el)$/i.test(w));
  const letters = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  return letters || name.slice(0, 2).toUpperCase();
}

export function createReportPptx(
  footerLabel?: string,
  opts?: { accentColor?: string; orgName?: string },
): PptxGenJS {
  const pptx = new PptxGenJSCtor();
  pptx.defineLayout({
    name: 'ASSESSMENT_WIDE',
    width: SLIDE_W,
    height: SLIDE_H,
  });
  pptx.layout = 'ASSESSMENT_WIDE';
  const accent = (opts?.accentColor ?? REPORT_COLORS.brand).toUpperCase();
  themes.set(pptx, {
    accent,
    dark: mix(accent, '000000', 0.3),
    soft: mix(accent, 'FFFFFF', 0.85),
    tint: mix(accent, 'FFFFFF', 0.94),
    footer: footerLabel ?? 'Plataforma de evaluación',
    initials: opts?.orgName ? initialsOf(opts.orgName) : '',
  });
  return pptx;
}

function addChrome(pptx: PptxGenJS, slide: PptxGenJS.Slide): void {
  const t = theme(pptx);
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SIDEBAR_W,
    h: SLIDE_H,
    fill: { color: t.accent },
    line: { color: t.accent, width: 0 },
  });
  if (t.initials) {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: (SIDEBAR_W - 0.6) / 2,
      y: 0.38,
      w: 0.6,
      h: 0.6,
      fill: { color: REPORT_COLORS.white },
      line: { color: REPORT_COLORS.white, width: 0 },
    });
    slide.addText(t.initials, {
      x: (SIDEBAR_W - 0.6) / 2,
      y: 0.38,
      w: 0.6,
      h: 0.6,
      fontSize: 13,
      bold: true,
      color: t.accent,
      fontFace: FONT,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
  }
  slide.addText(String(new Date().getFullYear()), {
    x: 0,
    y: SLIDE_H - 0.6,
    w: SIDEBAR_W,
    h: 0.3,
    fontSize: 9,
    color: REPORT_COLORS.white,
    fontFace: FONT,
    align: 'center',
    margin: 0,
  });
  slide.addText(t.footer, {
    x: X0,
    y: SLIDE_H - 0.45,
    w: CONTENT_W - 1,
    h: 0.28,
    fontSize: 9,
    fontFace: FONT,
    color: REPORT_COLORS.muted,
    margin: 0,
  });
  slide.slideNumber = {
    x: RIGHT - 0.8,
    y: SLIDE_H - 0.45,
    w: 0.8,
    h: 0.28,
    fontSize: 9,
    fontFace: FONT,
    color: REPORT_COLORS.muted,
    align: 'right',
  };
}

interface SlideHeader {
  kicker?: string;
  title: string;
  subtitle?: string;
  badge?: { text: string; color: string; fill: string };
}

function newContentSlide(
  pptx: PptxGenJS,
  header: SlideHeader,
): PptxGenJS.Slide {
  const t = theme(pptx);
  const slide = pptx.addSlide();
  slide.background = { color: REPORT_COLORS.white };
  addChrome(pptx, slide);
  const titleW = header.badge ? CONTENT_W - 2.6 : CONTENT_W;
  if (header.kicker) {
    slide.addText(header.kicker.toUpperCase(), {
      x: X0,
      y: 0.38,
      w: titleW,
      h: 0.26,
      fontSize: 10.5,
      bold: true,
      color: t.accent,
      fontFace: FONT,
      charSpacing: 2,
      margin: 0,
    });
  }
  slide.addText(header.title, {
    x: X0,
    y: 0.64,
    w: titleW,
    h: 0.55,
    fontSize: fitFontSize(header.title, titleW, 0.55, 28, 16, 0.6),
    bold: true,
    color: t.dark,
    fontFace: FONT,
    valign: 'middle',
    margin: 0,
  });
  if (header.subtitle) {
    slide.addText(header.subtitle, {
      x: X0,
      y: 1.2,
      w: titleW,
      h: 0.3,
      fontSize: 12,
      color: REPORT_COLORS.muted,
      fontFace: FONT,
      margin: 0,
    });
  }
  if (header.badge) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: RIGHT - 2.3,
      y: 0.68,
      w: 2.3,
      h: 0.46,
      rectRadius: 0.23,
      fill: { color: header.badge.fill },
      line: { color: header.badge.color, width: 1 },
    });
    slide.addText(header.badge.text, {
      x: RIGHT - 2.3,
      y: 0.68,
      w: 2.3,
      h: 0.46,
      fontSize: 12,
      bold: true,
      color: header.badge.color,
      fontFace: FONT,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
  }
  slide.addShape(pptx.ShapeType.line, {
    x: X0,
    y: 1.6,
    w: CONTENT_W,
    h: 0,
    line: { color: REPORT_COLORS.rule, width: 0.75 },
  });
  return slide;
}

function pageTitle(title: string, index: number, total: number): string {
  return total > 1 ? `${title} (${index + 1} de ${total})` : title;
}

function levelBadge(score: number) {
  return {
    text: `Nivel ${tierLevel(score).toLowerCase()}`,
    color: tierColor(score),
    fill: tierSoft(score),
  };
}

export function addCoverSlide(
  pptx: PptxGenJS,
  opts: {
    tool: string;
    orgName: string;
    subtitle: string;
    status: string;
    date: string;
    place?: string;
  },
): void {
  const t = theme(pptx);
  const slide = pptx.addSlide();
  slide.background = { color: t.dark };
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.6,
    y: -1.6,
    w: 6.4,
    h: 6.4,
    fill: { color: t.accent, transparency: 55 },
    line: { color: t.accent, width: 0, transparency: 100 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 10.9,
    y: 3.9,
    w: 3.6,
    h: 3.6,
    fill: { color: t.accent, transparency: 70 },
    line: { color: t.accent, width: 0, transparency: 100 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.9,
    y: 0.95,
    w: 1.0,
    h: 0.07,
    fill: { color: t.soft },
    line: { color: t.soft, width: 0 },
  });
  slide.addText(opts.tool.toUpperCase(), {
    x: 0.9,
    y: 1.2,
    w: 8,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: t.soft,
    fontFace: FONT,
    charSpacing: 2,
    margin: 0,
  });
  const nameSize = fitFontSize(opts.orgName, 9.5, 1.7, 44, 26);
  const perLine = Math.max(1, Math.floor(9.5 / ((nameSize / 72) * 0.46)));
  const nameLines = Math.max(1, Math.ceil(opts.orgName.length / perLine));
  const nameH = Math.min(1.75, nameLines * (nameSize / 72) * 1.2 + 0.1);
  slide.addText(opts.orgName, {
    x: 0.9,
    y: 1.65,
    w: 9.5,
    h: nameH,
    fontSize: nameSize,
    bold: true,
    color: REPORT_COLORS.white,
    fontFace: FONT,
    valign: 'top',
    margin: 0,
  });
  slide.addText(opts.subtitle, {
    x: 0.9,
    y: 1.65 + nameH + 0.2,
    w: 9.5,
    h: 0.5,
    fontSize: 20,
    color: t.soft,
    fontFace: FONT,
    margin: 0,
  });
  slide.addText('PRESENTACIÓN DE RESULTADOS', {
    x: 0.9,
    y: 1.65 + nameH + 1.05,
    w: 9.5,
    h: 0.45,
    fontSize: 18,
    color: REPORT_COLORS.white,
    fontFace: FONT,
    charSpacing: 1,
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.9,
    y: 5.75,
    w: SLIDE_W - 1.8,
    h: 0,
    line: { color: t.soft, width: 0.75, transparency: 50 },
  });
  const block = (
    x: number,
    label: string,
    lines: string[],
    align: 'left' | 'right',
  ) => {
    slide.addText(label, {
      x,
      y: 5.95,
      w: 5.5,
      h: 0.32,
      fontSize: 13,
      bold: true,
      color: t.soft,
      fontFace: FONT,
      align,
      margin: 0,
    });
    slide.addText(lines.join('\n'), {
      x,
      y: 6.3,
      w: 5.5,
      h: 0.6,
      fontSize: 12,
      color: REPORT_COLORS.white,
      fontFace: FONT,
      align,
      valign: 'top',
      margin: 0,
    });
  };
  block(0.9, 'Estado de la evaluación', [opts.status], 'left');
  block(
    SLIDE_W - 0.9 - 5.5,
    'Fecha y lugar',
    [opts.date, opts.place ?? ''].filter(Boolean),
    'right',
  );
}

export interface ResultCard {
  label: string;
  caption: string;
  score?: number;
  value?: string;
  color?: string;
  tag?: string;
}

export function addGlobalResultsSlide(
  pptx: PptxGenJS,
  opts: {
    kicker: string;
    title: string;
    subtitle?: string;
    items: Array<{ label: string; score: number }>;
    globalScore: number;
    cards: ResultCard[];
  },
): void {
  const slide = newContentSlide(pptx, {
    kicker: opts.kicker,
    title: opts.title,
    subtitle: opts.subtitle,
  });
  const panelY = CONTENT_TOP;
  const panelH = 3.45;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: X0,
    y: panelY,
    w: CONTENT_W,
    h: panelH,
    rectRadius: 0.08,
    fill: { color: REPORT_COLORS.panel },
    line: { color: REPORT_COLORS.rule, width: 0.75 },
  });
  const labelW = 3.1;
  const chartX = X0 + labelW + 0.35;
  const chartW = RIGHT - 0.55 - chartX;
  const plotTop = panelY + 0.42;
  const plotBottom = panelY + panelH - 0.45;
  const items = [...opts.items].sort((a, b) => b.score - a.score);
  const rowH = (plotBottom - plotTop) / Math.max(items.length, 1);
  const barH = Math.min(0.3, rowH * 0.58);

  for (let tick = 0; tick <= 100; tick += 10) {
    const x = chartX + (tick / 100) * chartW;
    slide.addShape(pptx.ShapeType.line, {
      x,
      y: plotTop - 0.05,
      w: 0,
      h: plotBottom - plotTop + 0.05,
      line: {
        color: tick === 0 ? REPORT_COLORS.neutralGray : REPORT_COLORS.rule,
        width: tick === 0 ? 1 : 0.75,
      },
    });
    slide.addText(`${tick}%`, {
      x: x - 0.3,
      y: plotBottom + 0.06,
      w: 0.6,
      h: 0.22,
      fontSize: 9,
      color: REPORT_COLORS.muted,
      fontFace: FONT,
      align: 'center',
      margin: 0,
    });
  }

  items.forEach((item, i) => {
    const y = plotTop + i * rowH;
    const pct = scorePct(item.score);
    const color = tierColor(item.score);
    slide.addText(item.label, {
      x: X0 + 0.2,
      y,
      w: labelW,
      h: rowH,
      fontSize: fitFontSize(item.label, labelW, rowH, 11.5, 8.5),
      bold: true,
      color: REPORT_COLORS.ink,
      fontFace: FONT,
      align: 'right',
      valign: 'middle',
      margin: 0,
    });
    const w = Math.max(0.05, (pct / 100) * chartW);
    slide.addShape(pptx.ShapeType.roundRect, {
      x: chartX,
      y: y + (rowH - barH) / 2,
      w,
      h: barH,
      rectRadius: Math.min(0.06, barH / 2),
      fill: { color },
      line: { color, width: 0 },
    });
    slide.addText(`${pct} %`, {
      x: chartX + w + 0.06,
      y,
      w: 0.7,
      h: rowH,
      fontSize: 10.5,
      bold: true,
      color,
      fontFace: FONT,
      valign: 'middle',
      margin: 0,
    });
  });

  const avg = scorePct(opts.globalScore);
  const avgX = chartX + (avg / 100) * chartW;
  slide.addShape(pptx.ShapeType.line, {
    x: avgX,
    y: plotTop - 0.05,
    w: 0,
    h: plotBottom - plotTop + 0.05,
    line: { color: REPORT_COLORS.ink, width: 1.25, dashType: 'dash' },
  });
  const pillW = 2.1;
  const pillX = Math.min(
    Math.max(avgX - pillW / 2, chartX),
    RIGHT - pillW - 0.1,
  );
  slide.addShape(pptx.ShapeType.roundRect, {
    x: pillX,
    y: panelY + 0.08,
    w: pillW,
    h: 0.28,
    rectRadius: 0.14,
    fill: { color: REPORT_COLORS.ink },
    line: { color: REPORT_COLORS.ink, width: 0 },
  });
  slide.addText(`Promedio global: ${avg} %`, {
    x: pillX,
    y: panelY + 0.08,
    w: pillW,
    h: 0.28,
    fontSize: 10,
    bold: true,
    color: REPORT_COLORS.white,
    fontFace: FONT,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  addResultCards(pptx, slide, opts.cards, panelY + panelH + 0.25);
}

function addResultCards(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  cards: ResultCard[],
  y: number,
): void {
  const t = theme(pptx);
  const gap = 0.25;
  const n = Math.max(cards.length, 1);
  const w = (CONTENT_W - gap * (n - 1)) / n;
  const h = CONTENT_BOTTOM - y;
  cards.forEach((card, i) => {
    const x = X0 + i * (w + gap);
    const color =
      card.color ??
      (card.score !== undefined ? tierColor(card.score) : t.accent);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      rectRadius: 0.08,
      fill: { color: REPORT_COLORS.white },
      line: { color: REPORT_COLORS.rule, width: 0.75 },
      shadow: {
        type: 'outer',
        color: '000000',
        opacity: 0.12,
        blur: 4,
        offset: 1,
        angle: 90,
      },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + 0.12,
      y,
      w: w - 0.24,
      h: 0.06,
      fill: { color },
      line: { color, width: 0 },
    });
    if (card.tag) {
      slide.addText(card.tag, {
        x: x + w - 1.15,
        y: y + 0.2,
        w: 1.0,
        h: 0.26,
        fontSize: 9,
        bold: true,
        color,
        fontFace: FONT,
        align: 'right',
        margin: 0,
      });
    }
    slide.addText(
      card.value ??
        (card.score !== undefined ? `${scorePct(card.score)} %` : '—'),
      {
        x: x + 0.2,
        y: y + 0.2,
        w: w - 1.3,
        h: 0.55,
        fontSize: 26,
        bold: true,
        color,
        fontFace: FONT,
        valign: 'middle',
        margin: 0,
      },
    );
    slide.addText(
      [
        {
          text: card.label,
          options: { bold: true, color: REPORT_COLORS.ink, breakLine: true },
        },
        { text: card.caption, options: { color: REPORT_COLORS.muted } },
      ],
      {
        x: x + 0.2,
        y: y + 0.8,
        w: w - 0.4,
        h: h - 0.9,
        fontSize: fitFontSize(
          `${card.label}\n${card.caption}`,
          w - 0.4,
          h - 0.9,
          11,
          8.5,
        ),
        fontFace: FONT,
        valign: 'top',
        margin: 0,
      },
    );
  });
}

export interface InsightPoint {
  title: string;
  detail: string;
}

function addPointList(
  slide: PptxGenJS.Slide,
  points: InsightPoint[],
  box: { x: number; y: number; w: number; h: number },
  opts: { emptyText: string; maxFont?: number; minFont?: number },
): void {
  if (points.length === 0) {
    slide.addText(opts.emptyText, {
      ...box,
      fontSize: 11.5,
      italic: true,
      color: REPORT_COLORS.muted,
      fontFace: FONT,
      valign: 'top',
      margin: 0,
    });
    return;
  }
  const plain = points
    .map((p) => (p.title ? `${p.title}: ${p.detail}` : p.detail))
    .join('\n');
  const size = fitFontSize(
    plain,
    box.w - 0.25,
    box.h - 0.07 * points.length,
    opts.maxFont ?? 13,
    opts.minFont ?? 9.5,
    0.42,
    1.15,
  );
  const runs: PptxGenJS.TextProps[] = [];
  points.forEach((p, i) => {
    const last = i === points.length - 1;
    const para = {
      bullet: { indent: 14 },
      paraSpaceAfter: 5,
    };
    if (p.title) {
      runs.push({
        text: `${p.title}: `,
        options: { ...para, bold: true, color: REPORT_COLORS.ink },
      });
      runs.push({
        text: p.detail,
        options: { color: REPORT_COLORS.body, breakLine: !last },
      });
    } else {
      runs.push({
        text: p.detail,
        options: { ...para, color: REPORT_COLORS.body, breakLine: !last },
      });
    }
  });
  slide.addText(runs, {
    ...box,
    fontSize: size,
    fontFace: FONT,
    valign: 'top',
    margin: 0,
  });
}

function addPointsCard(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    symbol: string;
    color: string;
    fill: string;
    points: InsightPoint[];
    emptyText: string;
  },
): void {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    rectRadius: 0.08,
    fill: { color: opts.fill },
    line: { color: opts.fill, width: 0 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: opts.x + 0.15,
    y: opts.y,
    w: opts.w - 0.3,
    h: 0.06,
    fill: { color: opts.color },
    line: { color: opts.color, width: 0 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: opts.x + 0.3,
    y: opts.y + 0.3,
    w: 0.46,
    h: 0.46,
    fill: { color: opts.color },
    line: { color: opts.color, width: 0 },
  });
  slide.addText(opts.symbol, {
    x: opts.x + 0.3,
    y: opts.y + 0.3,
    w: 0.46,
    h: 0.46,
    fontSize: 16,
    bold: true,
    color: REPORT_COLORS.white,
    fontFace: FONT,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
  slide.addText(opts.title, {
    x: opts.x + 0.9,
    y: opts.y + 0.3,
    w: opts.w - 1.1,
    h: 0.46,
    fontSize: 16,
    bold: true,
    color: opts.color,
    fontFace: FONT,
    valign: 'middle',
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: opts.x + 0.3,
    y: opts.y + 0.95,
    w: opts.w - 0.6,
    h: 0,
    line: { color: mix(opts.color, 'FFFFFF', 0.7), width: 0.75 },
  });
  addPointList(
    slide,
    opts.points,
    {
      x: opts.x + 0.3,
      y: opts.y + 1.1,
      w: opts.w - 0.6,
      h: opts.h - 1.25,
    },
    { emptyText: opts.emptyText },
  );
}

const GAUGE_ZONES: Array<[number, number, string]> = [
  [180, 270, REPORT_COLORS.tierRed],
  [270, 306, REPORT_COLORS.tierAmber],
  [306, 0, REPORT_COLORS.tierGreen],
];

function drawGauge(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  opts: { x: number; y: number; d: number; score: number },
): number {
  const { x, y, d } = opts;
  const cx = x + d / 2;
  const cy = y + d / 2;
  for (const [from, to, color] of GAUGE_ZONES) {
    slide.addShape(pptx.ShapeType.blockArc, {
      x,
      y,
      w: d,
      h: d,
      angleRange: [from, to],
      arcThicknessRatio: 0.17,
      fill: { color },
      line: { color, width: 0 },
    });
  }
  const pct = scorePct(opts.score);
  const theta = 180 + pct * 1.8;
  const rad = (theta * Math.PI) / 180;
  const len = (d / 2) * 0.7;
  const thickness = Math.max(0.035, d * 0.022);
  slide.addShape(pptx.ShapeType.rect, {
    x: cx + (len / 2) * Math.cos(rad) - len / 2,
    y: cy + (len / 2) * Math.sin(rad) - thickness / 2,
    w: len,
    h: thickness,
    rotate: theta,
    fill: { color: REPORT_COLORS.ink },
    line: { color: REPORT_COLORS.ink, width: 0 },
  });
  const pivot = Math.max(0.1, d * 0.065);
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx - pivot / 2,
    y: cy - pivot / 2,
    w: pivot,
    h: pivot,
    fill: { color: REPORT_COLORS.ink },
    line: { color: REPORT_COLORS.ink, width: 0 },
  });
  slide.addText(`${pct} %`, {
    x,
    y: cy + pivot * 0.8,
    w: d,
    h: 0.75,
    fontSize: 40,
    bold: true,
    align: 'center',
    valign: 'middle',
    color: tierColor(opts.score),
    fontFace: FONT,
    margin: 0,
  });
  return cy + pivot * 0.8 + 0.75;
}

export function addExecutiveSummarySlide(
  pptx: PptxGenJS,
  opts: {
    kicker: string;
    title: string;
    globalScore: number;
    level: string;
    narrative: string;
  },
): void {
  const t = theme(pptx);
  const slide = newContentSlide(pptx, {
    kicker: opts.kicker,
    title: opts.title,
    badge: levelBadge(opts.globalScore),
  });
  const top = CONTENT_TOP;
  const h = CONTENT_BOTTOM - top;
  const leftW = 4.3;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: X0,
    y: top,
    w: leftW,
    h,
    rectRadius: 0.08,
    fill: { color: REPORT_COLORS.white },
    line: { color: REPORT_COLORS.rule, width: 0.75 },
  });
  slide.addText('Resultado global', {
    x: X0,
    y: top + 0.25,
    w: leftW,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: REPORT_COLORS.muted,
    fontFace: FONT,
    align: 'center',
    margin: 0,
  });
  const d = 3.2;
  const bottom = drawGauge(pptx, slide, {
    x: X0 + (leftW - d) / 2,
    y: top + 0.75,
    d,
    score: opts.globalScore,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: X0 + 0.6,
    y: bottom + 0.2,
    w: leftW - 1.2,
    h: 0.42,
    rectRadius: 0.21,
    fill: { color: tierSoft(opts.globalScore) },
    line: { color: tierColor(opts.globalScore), width: 1 },
  });
  slide.addText(opts.level, {
    x: X0 + 0.6,
    y: bottom + 0.2,
    w: leftW - 1.2,
    h: 0.42,
    fontSize: 13,
    bold: true,
    color: tierColor(opts.globalScore),
    fontFace: FONT,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
  slide.addText(
    [
      { text: '■ ', options: { color: REPORT_COLORS.tierRed } },
      { text: '0–50 %   ', options: { color: REPORT_COLORS.body } },
      { text: '■ ', options: { color: REPORT_COLORS.tierAmber } },
      { text: '50–70 %   ', options: { color: REPORT_COLORS.body } },
      { text: '■ ', options: { color: REPORT_COLORS.tierGreen } },
      { text: '70–100 %', options: { color: REPORT_COLORS.body } },
    ],
    {
      x: X0,
      y: top + h - 0.55,
      w: leftW,
      h: 0.3,
      fontSize: 10,
      fontFace: FONT,
      align: 'center',
      margin: 0,
    },
  );

  const rx = X0 + leftW + 0.3;
  const rw = RIGHT - rx;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: rx,
    y: top,
    w: rw,
    h,
    rectRadius: 0.08,
    fill: { color: t.tint },
    line: { color: t.soft, width: 0.75 },
  });
  slide.addText('Síntesis', {
    x: rx + 0.4,
    y: top + 0.3,
    w: rw - 0.8,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: t.dark,
    fontFace: FONT,
    margin: 0,
  });
  const text =
    opts.narrative.trim() ||
    'Esta evaluación no tiene una síntesis redactada. Las láminas siguientes presentan los resultados por sección, los KPI críticos y el plan de acción.';
  const textH = h - 1.15;
  slide.addText(text, {
    x: rx + 0.4,
    y: top + 0.85,
    w: rw - 0.8,
    h: textH,
    fontSize: fitFontSize(text, rw - 0.8, textH, 17, 11, 0.44, 1.3),
    color: REPORT_COLORS.ink,
    fontFace: FONT,
    valign: 'top',
    lineSpacingMultiple: 1.15,
    paraSpaceAfter: 6,
    margin: 0,
  });
}

export function addExecutiveReadingSlide(
  pptx: PptxGenJS,
  opts: {
    kicker: string;
    title: string;
    strengths: InsightPoint[];
    gaps: InsightPoint[];
    closingTitle: string;
    closing: string;
    globalScore: number;
  },
): void {
  const slide = newContentSlide(pptx, {
    kicker: opts.kicker,
    title: opts.title,
    badge: levelBadge(opts.globalScore),
  });
  const gap = 0.3;
  const colW = (CONTENT_W - gap) / 2;
  const cardsH = 3.35;
  addPointsCard(pptx, slide, {
    x: X0,
    y: CONTENT_TOP,
    w: colW,
    h: cardsH,
    title: 'Fortalezas principales',
    symbol: '+',
    color: REPORT_COLORS.tierGreen,
    fill: REPORT_COLORS.tierGreenSoft,
    points: opts.strengths,
    emptyText: 'No hay fortalezas destacadas todavía.',
  });
  addPointsCard(pptx, slide, {
    x: X0 + colW + gap,
    y: CONTENT_TOP,
    w: colW,
    h: cardsH,
    title: 'Brechas críticas',
    symbol: '!',
    color: REPORT_COLORS.tierRed,
    fill: REPORT_COLORS.tierRedSoft,
    points: opts.gaps,
    emptyText: 'No hay brechas críticas en esta evaluación.',
  });
  const boxY = CONTENT_TOP + cardsH + 0.25;
  const boxH = CONTENT_BOTTOM - boxY;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: X0,
    y: boxY,
    w: CONTENT_W,
    h: boxH,
    rectRadius: 0.08,
    fill: { color: REPORT_COLORS.tierAmberSoft },
    line: { color: REPORT_COLORS.tierAmberSoft, width: 0 },
  });
  slide.addText(opts.closingTitle, {
    x: X0 + 0.35,
    y: boxY + 0.15,
    w: CONTENT_W - 0.7,
    h: 0.32,
    fontSize: 13,
    bold: true,
    color: REPORT_COLORS.tierAmber,
    fontFace: FONT,
    margin: 0,
  });
  const textH = boxH - 0.55;
  slide.addText(opts.closing, {
    x: X0 + 0.35,
    y: boxY + 0.48,
    w: CONTENT_W - 0.7,
    h: textH,
    fontSize: fitFontSize(opts.closing, CONTENT_W - 0.7, textH, 13.5, 9.5),
    color: REPORT_COLORS.ink,
    fontFace: FONT,
    valign: 'top',
    margin: 0,
  });
}

function drawTrafficLight(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  score: number,
): void {
  const w = 0.66;
  const d = 0.4;
  const h = d * 3 + 0.4;
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.14,
    fill: { color: REPORT_COLORS.lightCase },
    line: { color: REPORT_COLORS.lightCase, width: 0 },
  });
  const level = tierLevel(score);
  const lights: Array<[string, string]> = [
    ['Bajo', REPORT_COLORS.tierRed],
    ['Medio', 'F2C200'],
    ['Alto', REPORT_COLORS.tierGreen],
  ];
  lights.forEach(([name, color], i) => {
    const on = name === level;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + (w - d) / 2,
      y: y + 0.12 + i * (d + 0.08),
      w: d,
      h: d,
      fill: { color: on ? color : mix(color, REPORT_COLORS.lightOff, 0.72) },
      line: { color: on ? color : REPORT_COLORS.lightOff, width: 0.5 },
    });
  });
}

export function addSectionDetailSlide(
  pptx: PptxGenJS,
  opts: {
    kicker: string;
    title: string;
    subtitle?: string;
    score: number;
    strengths: InsightPoint[];
    gaps: InsightPoint[];
    facts: Array<{ label: string; value: string }>;
    note?: string;
  },
): void {
  const t = theme(pptx);
  const slide = newContentSlide(pptx, {
    kicker: opts.kicker,
    title: opts.title,
    subtitle: opts.subtitle,
    badge: levelBadge(opts.score),
  });
  const pct = scorePct(opts.score);
  const color = tierColor(opts.score);

  const trackY = 2.08;
  slide.addText('0 %', {
    x: X0,
    y: 1.78,
    w: 1,
    h: 0.24,
    fontSize: 9.5,
    color: REPORT_COLORS.muted,
    fontFace: FONT,
    margin: 0,
  });
  slide.addText('Meta: 100 %', {
    x: RIGHT - 2,
    y: 1.78,
    w: 2,
    h: 0.24,
    fontSize: 9.5,
    bold: true,
    color: REPORT_COLORS.muted,
    fontFace: FONT,
    align: 'right',
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: X0,
    y: trackY,
    w: CONTENT_W,
    h: 0.2,
    rectRadius: 0.1,
    fill: { color: REPORT_COLORS.track },
    line: { color: REPORT_COLORS.track, width: 0 },
  });
  const fillW = Math.max(0.2, (pct / 100) * CONTENT_W);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: X0,
    y: trackY,
    w: fillW,
    h: 0.2,
    rectRadius: 0.1,
    fill: { color },
    line: { color, width: 0 },
  });
  const pillW = 1.35;
  const pillX = Math.min(Math.max(X0, X0 + fillW - pillW), RIGHT - pillW);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: pillX,
    y: trackY + 0.27,
    w: pillW,
    h: 0.28,
    rectRadius: 0.14,
    fill: { color },
    line: { color, width: 0 },
  });
  slide.addText(`${pct} % actual`, {
    x: pillX,
    y: trackY + 0.27,
    w: pillW,
    h: 0.28,
    fontSize: 10,
    bold: true,
    color: REPORT_COLORS.white,
    fontFace: FONT,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  const top = 2.75;
  const h = CONTENT_BOTTOM - top;
  const gap = 0.25;
  const cardW = 3.35;
  const colW = (CONTENT_W - cardW - gap * 2) / 2;
  addPointsCard(pptx, slide, {
    x: X0,
    y: top,
    w: colW,
    h,
    title: 'Fortalezas',
    symbol: '+',
    color: REPORT_COLORS.tierGreen,
    fill: REPORT_COLORS.tierGreenSoft,
    points: opts.strengths,
    emptyText: 'Ningún KPI de esta sección alcanza todavía un nivel alto.',
  });
  addPointsCard(pptx, slide, {
    x: X0 + colW + gap,
    y: top,
    w: colW,
    h,
    title: 'Brechas',
    symbol: '!',
    color: REPORT_COLORS.tierAmber,
    fill: REPORT_COLORS.tierAmberSoft,
    points: opts.gaps,
    emptyText: 'Todos los KPI de esta sección tienen un nivel alto.',
  });

  const cx = RIGHT - cardW;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: cx,
    y: top,
    w: cardW,
    h,
    rectRadius: 0.08,
    fill: { color: REPORT_COLORS.white },
    line: { color: REPORT_COLORS.rule, width: 0.75 },
  });
  slide.addText('Índice de desempeño', {
    x: cx,
    y: top + 0.15,
    w: cardW,
    h: 0.28,
    fontSize: 10.5,
    bold: true,
    color: REPORT_COLORS.muted,
    fontFace: FONT,
    align: 'center',
    margin: 0,
  });
  drawTrafficLight(pptx, slide, cx + 0.35, top + 0.5, opts.score);
  slide.addText(`${pct} %`, {
    x: cx + 1.3,
    y: top + 0.55,
    w: cardW - 1.4,
    h: 0.75,
    fontSize: 34,
    bold: true,
    color,
    fontFace: FONT,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
  slide.addText(
    tierLevel(opts.score) === 'Alto'
      ? 'Satisfactorio'
      : tierLevel(opts.score) === 'Medio'
        ? 'Requiere atención'
        : 'Atención prioritaria',
    {
      x: cx + 1.3,
      y: top + 1.3,
      w: cardW - 1.4,
      h: 0.32,
      fontSize: 12,
      bold: true,
      color: REPORT_COLORS.body,
      fontFace: FONT,
      align: 'center',
      margin: 0,
    },
  );
  let fy = top + 2.22;
  for (const fact of opts.facts) {
    slide.addShape(pptx.ShapeType.line, {
      x: cx + 0.25,
      y: fy,
      w: cardW - 0.5,
      h: 0,
      line: { color: REPORT_COLORS.rule, width: 0.5 },
    });
    slide.addText(fact.label, {
      x: cx + 0.25,
      y: fy + 0.03,
      w: cardW - 1.3,
      h: 0.32,
      fontSize: 10.5,
      color: REPORT_COLORS.body,
      fontFace: FONT,
      valign: 'middle',
      margin: 0,
    });
    slide.addText(fact.value, {
      x: cx + cardW - 1.05,
      y: fy + 0.03,
      w: 0.8,
      h: 0.32,
      fontSize: 11,
      bold: true,
      color: REPORT_COLORS.ink,
      fontFace: FONT,
      align: 'right',
      valign: 'middle',
      margin: 0,
    });
    fy += 0.33;
  }
  if (opts.note) {
    const noteY = fy + 0.12;
    const noteH = top + h - 0.18 - noteY;
    if (noteH > 0.45) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx + 0.2,
        y: noteY,
        w: cardW - 0.4,
        h: noteH,
        rectRadius: 0.06,
        fill: { color: t.tint },
        line: { color: t.soft, width: 0.5 },
      });
      slide.addText(opts.note, {
        x: cx + 0.32,
        y: noteY + 0.06,
        w: cardW - 0.64,
        h: noteH - 0.12,
        fontSize: fitFontSize(opts.note, cardW - 0.64, noteH - 0.12, 10.5, 8),
        color: t.dark,
        fontFace: FONT,
        valign: 'middle',
        margin: 0,
      });
    }
  }
}

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
  weight: number;
  align?: 'left' | 'center' | 'right';
}

function addChips(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  chips: Array<{ text: string; color?: string }>,
  y: number,
): void {
  const t = theme(pptx);
  let x = X0;
  for (const chip of chips) {
    const color = chip.color ?? t.dark;
    const w = Math.min(4.5, 0.4 + chip.text.length * 0.085);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h: 0.34,
      rectRadius: 0.17,
      fill: { color: mix(color, 'FFFFFF', 0.88) },
      line: { color: mix(color, 'FFFFFF', 0.6), width: 0.5 },
    });
    slide.addText(chip.text, {
      x,
      y,
      w,
      h: 0.34,
      fontSize: 11,
      bold: true,
      color,
      fontFace: FONT,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    x += w + 0.15;
  }
}

function styledTable(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  opts: {
    x: number;
    y: number;
    w: number;
    columns: TableColumn[];
    rows: TableCell[][];
    fontSize?: number;
  },
): void {
  const t = theme(pptx);
  const totalWeight = opts.columns.reduce((s, c) => s + c.weight, 0);
  const fontSize = opts.fontSize ?? 11;
  const header = opts.columns.map((c) => ({
    text: c.header,
    options: {
      bold: true,
      color: REPORT_COLORS.white,
      fill: { color: t.accent },
      align: c.align ?? 'left',
      fontSize: fontSize + 0.5,
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
          fill: { color: r % 2 === 1 ? t.tint : REPORT_COLORS.white },
          fontSize,
        },
      };
    }),
  );
  slide.addTable([header, ...body] as PptxGenJS.TableRow[], {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    colW: opts.columns.map((c) => (c.weight / totalWeight) * opts.w),
    fontFace: FONT,
    valign: 'middle',
    margin: [0.07, 0.1, 0.07, 0.1],
    border: { type: 'solid', color: t.soft, pt: 0.75 },
    autoPage: false,
  });
}

export function addTableSlide(
  pptx: PptxGenJS,
  opts: {
    kicker?: string;
    title: string;
    subtitle?: string;
    summary?: Array<{ text: string; color?: string }>;
    columns: TableColumn[];
    rows: TableCell[][];
    emptyText: string;
    rowsPerSlide?: number;
    fontSize?: number;
  },
): void {
  const fontSize = opts.fontSize ?? ((opts.rowsPerSlide ?? 8) > 8 ? 10 : 11);
  const tableTop =
    CONTENT_TOP + (opts.summary && opts.summary.length > 0 ? 0.55 : 0);
  const pages = paginateRows(opts.columns, opts.rows, {
    fontSize,
    maxRows: opts.rowsPerSlide ?? 8,
    height: CONTENT_BOTTOM - tableTop,
  });
  pages.forEach((rows, page) => {
    const slide = newContentSlide(pptx, {
      kicker: opts.kicker,
      title: pageTitle(opts.title, page, pages.length),
      subtitle: opts.subtitle,
    });
    let y = CONTENT_TOP;
    if (opts.summary && opts.summary.length > 0) {
      addChips(pptx, slide, opts.summary, y);
      y += 0.55;
    }
    if (rows.length === 0) {
      slide.addText(opts.emptyText, {
        x: X0,
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
    styledTable(pptx, slide, {
      x: X0,
      y,
      w: CONTENT_W,
      columns: opts.columns,
      rows,
      fontSize,
    });
  });
}

function paginateRows(
  columns: TableColumn[],
  rows: TableCell[][],
  opts: { fontSize: number; maxRows: number; height: number },
): TableCell[][][] {
  const totalWeight = columns.reduce((s, c) => s + c.weight, 0);
  const lineH = (opts.fontSize / 72) * 1.17;
  const rowHeight = (row: TableCell[]) => {
    const lines = row.reduce((max, cell, c) => {
      const text = typeof cell === 'string' ? cell : cell.text;
      const w = (columns[c].weight / totalWeight) * CONTENT_W - 0.2;
      const perLine = Math.max(
        1,
        Math.floor(w / ((opts.fontSize / 72) * 0.44)),
      );
      const n = text
        .split('\n')
        .reduce(
          (sum, p) => sum + Math.max(1, Math.ceil(p.length / perLine)),
          0,
        );
      return Math.max(max, n);
    }, 1);
    return lines * lineH + 0.13;
  };
  const headerH = lineH * 2 + 0.16;
  const pages: TableCell[][][] = [];
  let current: TableCell[][] = [];
  let used = headerH;
  for (const row of rows) {
    const h = rowHeight(row);
    if (
      current.length > 0 &&
      (used + h > opts.height || current.length >= opts.maxRows)
    ) {
      pages.push(current);
      current = [];
      used = headerH;
    }
    current.push(row);
    used += h;
  }
  pages.push(current);
  return pages;
}

export function addNumberedListSlide(
  pptx: PptxGenJS,
  opts: { kicker?: string; title: string; subtitle?: string; items: string[] },
): void {
  const t = theme(pptx);
  const pages = chunk(opts.items, 5);
  pages.forEach((items, page) => {
    const slide = newContentSlide(pptx, {
      kicker: opts.kicker,
      title: pageTitle(opts.title, page, pages.length),
      subtitle: opts.subtitle,
    });
    const rowH = (CONTENT_BOTTOM - CONTENT_TOP) / 5;
    items.forEach((item, i) => {
      const y = CONTENT_TOP + i * rowH;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: X0,
        y: y + 0.06,
        w: CONTENT_W,
        h: rowH - 0.12,
        rectRadius: 0.08,
        fill: { color: i % 2 === 0 ? t.tint : REPORT_COLORS.white },
        line: { color: t.soft, width: 0.5 },
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: X0 + 0.25,
        y: y + (rowH - 0.52) / 2,
        w: 0.52,
        h: 0.52,
        fill: { color: t.accent },
        line: { color: t.accent, width: 0 },
      });
      slide.addText(String(page * 5 + i + 1), {
        x: X0 + 0.25,
        y: y + (rowH - 0.52) / 2,
        w: 0.52,
        h: 0.52,
        fontSize: 16,
        bold: true,
        color: REPORT_COLORS.white,
        fontFace: FONT,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });
      slide.addText(item, {
        x: X0 + 1.0,
        y: y + 0.06,
        w: CONTENT_W - 1.25,
        h: rowH - 0.12,
        fontSize: fitFontSize(item, CONTENT_W - 1.25, rowH - 0.2, 15, 10.5),
        color: REPORT_COLORS.ink,
        fontFace: FONT,
        valign: 'middle',
        margin: 0,
      });
    });
  });
}

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
  const total = opts.parts.reduce((s, p) => s + p.value, 0);
  let x = opts.x;
  if (total === 0) {
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: opts.y,
      w: opts.w,
      h: 0.42,
      fill: { color: REPORT_COLORS.track },
      line: { color: REPORT_COLORS.track, width: 0 },
    });
  }
  for (const part of opts.parts) {
    const w = total > 0 ? (part.value / total) * opts.w : 0;
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
        text: `${part.label}: ${part.value}${total > 0 ? ` (${Math.round((part.value / total) * 100)} %)` : ''}`,
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
    kicker?: string;
    title: string;
    subtitle?: string;
    totals: Array<{ label: string; value: number; color: string }>;
    columns: TableColumn[];
    rows: TableCell[][];
  },
): void {
  const slide = newContentSlide(pptx, {
    kicker: opts.kicker,
    title: opts.title,
    subtitle: opts.subtitle,
  });
  addProportionBar(pptx, slide, {
    x: X0,
    y: CONTENT_TOP,
    w: CONTENT_W,
    parts: opts.totals,
  });
  styledTable(pptx, slide, {
    x: X0,
    y: CONTENT_TOP + 1.05,
    w: CONTENT_W,
    columns: opts.columns,
    rows: opts.rows,
    fontSize: 11.5,
  });
}

export type PlanMeasure = {
  name: string;
  kpi?: string;
  responsible: string;
  endDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  progressPct: number;
};

export function addPlanSummarySlide(
  pptx: PptxGenJS,
  opts: {
    kicker: string;
    title: string;
    subtitle?: string;
    measures: PlanMeasure[];
    uncovered: { label: string; value: number };
  },
): void {
  const t = theme(pptx);
  const slide = newContentSlide(pptx, {
    kicker: opts.kicker,
    title: opts.title,
    subtitle: opts.subtitle,
  });
  const ms = opts.measures;
  const count = (s: PlanMeasure['status']) =>
    ms.filter((m) => m.status === s).length;
  const avg =
    ms.length === 0
      ? 0
      : Math.round(
          ms.reduce(
            (sum, m) => sum + Math.max(0, Math.min(100, m.progressPct ?? 0)),
            0,
          ) / ms.length,
        );
  const tiles: Array<{ label: string; value: string; color: string }> = [
    { label: 'Medidas en el plan', value: String(ms.length), color: t.dark },
    {
      label: 'Concluidas',
      value: String(count('DONE')),
      color: REPORT_COLORS.tierGreen,
    },
    {
      label: 'En progreso',
      value: String(count('IN_PROGRESS')),
      color: REPORT_COLORS.tierAmber,
    },
    {
      label: 'Pendientes',
      value: String(count('PENDING')),
      color: REPORT_COLORS.muted,
    },
    {
      label: opts.uncovered.label,
      value: String(opts.uncovered.value),
      color:
        opts.uncovered.value > 0
          ? REPORT_COLORS.tierRed
          : REPORT_COLORS.tierGreen,
    },
  ];
  const gap = 0.2;
  const tileW = (CONTENT_W - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((tile, i) => {
    const x = X0 + i * (tileW + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y: CONTENT_TOP,
      w: tileW,
      h: 1.15,
      rectRadius: 0.08,
      fill: { color: i === 0 ? t.tint : REPORT_COLORS.panel },
      line: { color: i === 0 ? t.soft : REPORT_COLORS.rule, width: 0.75 },
    });
    slide.addText(tile.value, {
      x,
      y: CONTENT_TOP + 0.08,
      w: tileW,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: tile.color,
      fontFace: FONT,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    slide.addText(tile.label, {
      x: x + 0.1,
      y: CONTENT_TOP + 0.68,
      w: tileW - 0.2,
      h: 0.4,
      fontSize: fitFontSize(tile.label, tileW - 0.2, 0.4, 11, 8.5),
      color: REPORT_COLORS.body,
      fontFace: FONT,
      align: 'center',
      valign: 'top',
      margin: 0,
    });
  });

  const barY = CONTENT_TOP + 1.45;
  slide.addText(
    [
      {
        text: 'Avance promedio del plan  ',
        options: { bold: true, color: REPORT_COLORS.ink },
      },
      { text: `${avg} %`, options: { bold: true, color: t.accent } },
    ],
    {
      x: X0,
      y: barY,
      w: CONTENT_W,
      h: 0.3,
      fontSize: 12,
      fontFace: FONT,
      margin: 0,
    },
  );
  slide.addShape(pptx.ShapeType.roundRect, {
    x: X0,
    y: barY + 0.38,
    w: CONTENT_W,
    h: 0.2,
    rectRadius: 0.1,
    fill: { color: REPORT_COLORS.track },
    line: { color: REPORT_COLORS.track, width: 0 },
  });
  if (avg > 0) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: X0,
      y: barY + 0.38,
      w: Math.max(0.2, (avg / 100) * CONTENT_W),
      h: 0.2,
      rectRadius: 0.1,
      fill: { color: t.accent },
      line: { color: t.accent, width: 0 },
    });
  }

  const tableY = barY + 0.85;
  if (ms.length === 0) {
    slide.addText(
      'Todavía no hay medidas registradas en el plan. Cada KPI crítico debería tener al menos una.',
      {
        x: X0,
        y: tableY,
        w: CONTENT_W,
        h: 0.5,
        fontSize: 13,
        color: REPORT_COLORS.muted,
        fontFace: FONT,
        margin: 0,
      },
    );
    return;
  }
  const order = { IN_PROGRESS: 0, PENDING: 1, DONE: 2 } as const;
  const shown = [...ms]
    .sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        (isDate(a.endDate) ? a.endDate.getTime() : 0) -
          (isDate(b.endDate) ? b.endDate.getTime() : 0),
    )
    .slice(0, 6);
  const statusMeta = MEASURE_STATUS_META;
  styledTable(pptx, slide, {
    x: X0,
    y: tableY,
    w: CONTENT_W,
    columns: [
      { header: 'Medida', weight: 4.6 },
      { header: 'KPI', weight: 1 },
      { header: 'Responsable', weight: 2 },
      { header: 'Fin', weight: 1.3, align: 'center' },
      { header: 'Estado', weight: 1.3, align: 'center' },
      { header: 'Avance', weight: 1, align: 'center' },
    ],
    rows: shown.map((m) => [
      truncate(m.name, 90),
      m.kpi ?? '',
      truncate(m.responsible, 40),
      {
        text: isDate(m.endDate) ? formatDate(m.endDate) : '—',
        align: 'center',
      },
      {
        text: statusMeta[m.status]?.label ?? m.status,
        bold: true,
        color: statusMeta[m.status]?.color,
        align: 'center',
      },
      { text: `${m.progressPct ?? 0} %`, align: 'center' },
    ]),
    fontSize: 10.5,
  });
  if (ms.length > shown.length) {
    slide.addText(
      `Se muestran ${shown.length} de ${ms.length} medidas; el cronograma completo está en la lámina siguiente.`,
      {
        x: X0,
        y: CONTENT_BOTTOM - 0.25,
        w: CONTENT_W,
        h: 0.25,
        fontSize: 9.5,
        italic: true,
        color: REPORT_COLORS.muted,
        fontFace: FONT,
        margin: 0,
      },
    );
  }
}

export function addSwotSlide(
  pptx: PptxGenJS,
  opts: {
    kicker: string;
    title: string;
    subtitle?: string;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
  },
): void {
  const slide = newContentSlide(pptx, {
    kicker: opts.kicker,
    title: opts.title,
    subtitle: opts.subtitle,
  });
  const gap = 0.22;
  const w = (CONTENT_W - gap) / 2;
  const h = (CONTENT_BOTTOM - CONTENT_TOP - gap) / 2;
  const quadrants: Array<{
    letter: string;
    title: string;
    items: string[];
    color: string;
    fill: string;
  }> = [
    {
      letter: 'F',
      title: 'Fortalezas',
      items: opts.swot.strengths,
      color: REPORT_COLORS.tierGreen,
      fill: REPORT_COLORS.tierGreenSoft,
    },
    {
      letter: 'O',
      title: 'Oportunidades',
      items: opts.swot.opportunities,
      color: REPORT_COLORS.swotBlue,
      fill: REPORT_COLORS.swotBlueSoft,
    },
    {
      letter: 'D',
      title: 'Debilidades',
      items: opts.swot.weaknesses,
      color: REPORT_COLORS.tierRed,
      fill: REPORT_COLORS.tierRedSoft,
    },
    {
      letter: 'A',
      title: 'Amenazas',
      items: opts.swot.threats,
      color: REPORT_COLORS.tierAmber,
      fill: REPORT_COLORS.tierAmberSoft,
    },
  ];
  quadrants.forEach((q, i) => {
    const x = X0 + (i % 2) * (w + gap);
    const y = CONTENT_TOP + Math.floor(i / 2) * (h + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      rectRadius: 0.08,
      fill: { color: q.fill },
      line: { color: q.fill, width: 0 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.25,
      y: y + 0.2,
      w: 0.5,
      h: 0.5,
      fill: { color: q.color },
      line: { color: q.color, width: 0 },
    });
    slide.addText(q.letter, {
      x: x + 0.25,
      y: y + 0.2,
      w: 0.5,
      h: 0.5,
      fontSize: 17,
      bold: true,
      color: REPORT_COLORS.white,
      fontFace: FONT,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    slide.addText(q.title, {
      x: x + 0.9,
      y: y + 0.2,
      w: w - 1.1,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: q.color,
      fontFace: FONT,
      valign: 'middle',
      margin: 0,
    });
    addPointList(
      slide,
      q.items.map((detail) => ({ title: '', detail })),
      { x: x + 0.3, y: y + 0.78, w: w - 0.6, h: h - 0.86 },
      { emptyText: 'Sin puntos identificados.', maxFont: 13, minFont: 9 },
    );
  });
}

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
  opts: {
    kicker?: string;
    title: string;
    nameHeader?: string;
    measures: TimelineMeasure[];
  },
): void {
  const t = theme(pptx);
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
    { text: `${opts.measures.length} en total`, color: t.dark },
    { text: `${counts.DONE} concluidas`, color: REPORT_COLORS.tierGreen },
    {
      text: `${counts.IN_PROGRESS} en progreso`,
      color: REPORT_COLORS.tierAmber,
    },
    { text: `${counts.PENDING} pendientes`, color: REPORT_COLORS.muted },
  ];

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
  const nameW = 4.1;
  const areaX = X0 + nameW + 0.2;
  const areaW = RIGHT - areaX - 0.45;
  const xOf = (d: Date) =>
    areaX + ((d.getTime() - (start?.getTime() ?? 0)) / span) * areaW;
  const today = new Date();

  pages.forEach((rows, page) => {
    const slide = newContentSlide(pptx, {
      kicker: opts.kicker,
      title: pageTitle(opts.title, page, pages.length),
    });
    addChips(pptx, slide, summary, CONTENT_TOP - 0.1);
    if (rows.length === 0 || !start || !end) {
      slide.addText('No hay medidas con fechas registradas todavía.', {
        x: X0,
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

    const headY = CONTENT_TOP + 0.45;
    const top = headY + 0.4;
    const rowH = Math.min(0.56, (CONTENT_BOTTOM - top) / rows.length);
    const gridH = rowH * rows.length;
    slide.addText(opts.nameHeader ?? 'Medida', {
      x: X0,
      y: headY,
      w: nameW,
      h: 0.3,
      fontSize: 10.5,
      bold: true,
      color: REPORT_COLORS.muted,
      fontFace: FONT,
      margin: 0,
    });
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
      x: X0,
      y: headY + 0.32,
      w: CONTENT_W,
      h: 0,
      line: { color: t.accent, width: 1.25 },
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
          x: X0,
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
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x0,
        y: y + (rowH - barH) / 2,
        w: x1 - x0,
        h: barH,
        rectRadius: Math.min(0.05, barH / 2),
        fill: { color: meta.color, transparency: 65 },
        line: { color: meta.color, width: 0 },
      });
      const done = Math.max(0, Math.min(100, m.progressPct ?? 0)) / 100;
      if (done > 0) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: x0,
          y: y + (rowH - barH) / 2,
          w: Math.max(0.03, (x1 - x0) * done),
          h: barH,
          rectRadius: Math.min(0.05, barH / 2),
          fill: { color: meta.color },
          line: { color: meta.color, width: 0 },
        });
      }
      slide.addShape(pptx.ShapeType.line, {
        x: X0,
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

export type EvolutionPoint = {
  date: Date;
  globalScore: number;
  measuresTotal: number;
  measuresDone: number;
};

export function addEvolutionSlide(
  pptx: PptxGenJS,
  opts: { kicker?: string; title: string; points: EvolutionPoint[] },
): void {
  const t = theme(pptx);
  const points = opts.points.slice(-8);
  const slide = newContentSlide(pptx, {
    kicker: opts.kicker,
    title: opts.title,
    subtitle:
      'Resultado global de cada evaluación completada, de la más antigua a la más reciente',
  });
  const chartX = X0 + 0.55;
  const chartW = 6.3;
  const chartTop = CONTENT_TOP + 0.35;
  const chartH = CONTENT_BOTTOM - 0.55 - chartTop;
  const baseY = chartTop + chartH;
  for (const tick of [0, 25, 50, 70, 100]) {
    const y = baseY - (tick / 100) * chartH;
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
    slide.addText(`${tick}%`, {
      x: X0,
      y: y - 0.13,
      w: 0.48,
      h: 0.26,
      fontSize: 9.5,
      color: REPORT_COLORS.muted,
      fontFace: FONT,
      align: 'right',
      margin: 0,
    });
  }
  const slot = chartW / Math.max(points.length, 1);
  const colW = Math.min(0.85, slot * 0.5);
  const tops: Array<{ x: number; y: number }> = [];
  points.forEach((p, i) => {
    const pct = scorePct(p.globalScore);
    const h = (pct / 100) * chartH;
    const x = chartX + i * slot + (slot - colW) / 2;
    const color = tierColor(p.globalScore);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: baseY - h,
      w: colW,
      h: Math.max(0.02, h),
      fill: { color, transparency: 15 },
      line: { color, width: 0 },
    });
    tops.push({ x: x + colW / 2, y: baseY - h });
    slide.addText(`${pct} %`, {
      x: x - 0.3,
      y: baseY - h - 0.42,
      w: colW + 0.6,
      h: 0.26,
      fontSize: 11.5,
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
      fontSize: 9.5,
      color: REPORT_COLORS.body,
      fontFace: FONT,
      align: 'center',
      margin: 0,
    });
  });
  for (let i = 1; i < tops.length; i++) {
    const a = tops[i - 1];
    const b = tops[i];
    slide.addShape(pptx.ShapeType.line, {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.max(0.001, Math.abs(b.y - a.y)),
      flipV: b.y < a.y,
      line: { color: t.dark, width: 2.25 },
    });
  }
  for (const p of tops) {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: p.x - 0.08,
      y: p.y - 0.08,
      w: 0.16,
      h: 0.16,
      fill: { color: REPORT_COLORS.white },
      line: { color: t.dark, width: 2 },
    });
  }

  const tableX = chartX + chartW + 0.45;
  const tableW = RIGHT - tableX;
  const rows: TableCell[][] = points.map((p, i) => {
    const delta =
      i === 0
        ? null
        : scorePct(p.globalScore) - scorePct(points[i - 1].globalScore);
    const deltaText =
      delta === null
        ? '—'
        : delta === 0
          ? 'Sin cambio'
          : `${delta > 0 ? '+' : ''}${delta} pts`;
    return [
      formatDate(p.date),
      {
        text: `${scorePct(p.globalScore)} %`,
        bold: true,
        color: tierColor(p.globalScore),
        align: 'center',
      },
      {
        text: deltaText,
        bold: true,
        color:
          delta === null || delta === 0
            ? REPORT_COLORS.body
            : delta > 0
              ? REPORT_COLORS.tierGreen
              : REPORT_COLORS.tierRed,
        align: 'center',
      },
      {
        text: `${p.measuresDone} de ${p.measuresTotal}`,
        color: REPORT_COLORS.body,
        align: 'center',
      },
    ];
  });
  styledTable(pptx, slide, {
    x: tableX,
    y: CONTENT_TOP + 0.35,
    w: tableW,
    columns: [
      { header: 'Evaluación', weight: 3 },
      { header: 'Resultado', weight: 1.9, align: 'center' },
      { header: 'Variación', weight: 2.3, align: 'center' },
      { header: 'Medidas concluidas', weight: 2.5, align: 'center' },
    ],
    rows,
    fontSize: 10.5,
  });
}

export async function writePptxBuffer(pptx: PptxGenJS): Promise<Buffer> {
  return withExportSlot(async () => {
    const result = await pptx.write({ outputType: 'nodebuffer' });
    return result as Buffer;
  });
}
