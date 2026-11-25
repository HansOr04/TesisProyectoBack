import { BadGatewayException } from '@nestjs/common';

export interface AiIndicatorContext {
  code: string;
  name: string;
  description?: string;
}

export interface AiCriticalItem extends AiIndicatorContext {
  indicatorId: string;
  score: number;
  observation: string;
}

export interface AiMeasureSuggestion {
  indicatorId: string;
  name: string;
  description: string;
}

export interface AiEvaluatedItem {
  indicatorId: string;
  code: string;
  score: number;
  observation: string;
}

export interface AiInconsistencyFinding {
  indicatorIds: string[];
  description: string;
}

export type NarrativeTone = 'technical' | 'informative' | 'formal';

export interface AiSectionScoreContext {
  number: number;
  name: string;
  weightedAvg: number;
}

export interface AiCriticalContext {
  code: string;
  name: string;
  score: number;
}

export interface AiInsightPoint {
  title: string;
  detail: string;
}

export interface AiSectionInsight {
  strengths: AiInsightPoint[];
  gaps: AiInsightPoint[];
}

export interface AiReportInsights {
  keyFindings: string[];
  sectionAnalysis: Record<string, string>;
  recommendations: string[];
  strengths: AiInsightPoint[];
  gaps: AiInsightPoint[];
  conclusion: string;
  sectionInsights: Record<string, AiSectionInsight>;
}

export interface AiSwot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface AiKpiContext {
  code: string;
  name: string;
  score: number;
  observation?: string;
}

export interface AiSectionDetailContext {
  number: number;
  best: AiKpiContext[];
  worst: AiKpiContext[];
}

export interface AiProfileContext {
  name: string;
  type?: string;
  country?: string;
  region?: string | null;
  mainProduct?: string | null;
  memberCount?: number | null;
}

export interface AiReportContext {
  globalScore: number;
  sectionScores: AiSectionScoreContext[];
  criticalItems: AiCriticalContext[];
  sectionDetails?: AiSectionDetailContext[];
  profile?: AiProfileContext;
}

export const MAX_INSIGHT_POINTS = 4;

export function extractJson(raw: string, shape: 'array' | 'object'): unknown {
  const open = shape === 'array' ? '[' : '{';
  const close = shape === 'array' ? ']' : '}';
  const start = raw.indexOf(open);
  if (start === -1) {
    throw new BadGatewayException('AI response was not valid JSON');
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) {
      try {
        return JSON.parse(raw.slice(start, i + 1));
      } catch {
        break;
      }
    }
  }
  throw new BadGatewayException('AI response was not valid JSON');
}

export function parseAiMeasureSuggestions(
  raw: string,
  validIndicatorIds: string[],
): AiMeasureSuggestion[] {
  const parsed = extractJson(raw, 'array');

  if (!Array.isArray(parsed)) {
    throw new BadGatewayException('AI response was not a JSON array');
  }

  const validIds = new Set(validIndicatorIds);
  return parsed.filter(
    (item): item is AiMeasureSuggestion =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as AiMeasureSuggestion).indicatorId === 'string' &&
      typeof (item as AiMeasureSuggestion).name === 'string' &&
      typeof (item as AiMeasureSuggestion).description === 'string' &&
      validIds.has((item as AiMeasureSuggestion).indicatorId),
  );
}

export function parseAiInconsistencyFindings(
  raw: string,
  validIndicatorIds: string[],
): AiInconsistencyFinding[] {
  const parsed = extractJson(raw, 'array');

  if (!Array.isArray(parsed)) {
    throw new BadGatewayException('AI response was not a JSON array');
  }

  const validIds = new Set(validIndicatorIds);
  return parsed.filter(
    (item): item is AiInconsistencyFinding =>
      typeof item === 'object' &&
      item !== null &&
      Array.isArray((item as AiInconsistencyFinding).indicatorIds) &&
      (item as AiInconsistencyFinding).indicatorIds.length > 0 &&
      (item as AiInconsistencyFinding).indicatorIds.every(
        (id) => typeof id === 'string' && validIds.has(id),
      ) &&
      typeof (item as AiInconsistencyFinding).description === 'string',
  );
}

export function parseAiReportInsights(
  raw: string,
  validSectionNumbers: string[],
): AiReportInsights {
  const parsed = extractJson(raw, 'object');

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BadGatewayException('AI response was not a JSON object');
  }

  const candidate = parsed as Partial<AiReportInsights>;
  const keyFindings = Array.isArray(candidate.keyFindings)
    ? candidate.keyFindings.filter((f): f is string => typeof f === 'string')
    : [];
  const recommendations = Array.isArray(candidate.recommendations)
    ? candidate.recommendations.filter(
        (r): r is string => typeof r === 'string',
      )
    : [];

  const validNumbers = new Set(validSectionNumbers);
  const sectionAnalysis: Record<string, string> = {};
  if (
    typeof candidate.sectionAnalysis === 'object' &&
    candidate.sectionAnalysis !== null
  ) {
    for (const [key, value] of Object.entries(candidate.sectionAnalysis)) {
      if (validNumbers.has(key) && typeof value === 'string') {
        sectionAnalysis[key] = value;
      }
    }
  }

  const sectionInsights: Record<string, AiSectionInsight> = {};
  const rawSections = (parsed as { sectionInsights?: unknown }).sectionInsights;
  if (typeof rawSections === 'object' && rawSections !== null) {
    for (const [key, value] of Object.entries(rawSections)) {
      if (!validNumbers.has(key) || typeof value !== 'object' || !value) {
        continue;
      }
      const v = value as { strengths?: unknown; gaps?: unknown };
      sectionInsights[key] = {
        strengths: parseInsightPoints(v.strengths, 3),
        gaps: parseInsightPoints(v.gaps, 3),
      };
    }
  }
  const raw2 = parsed as {
    strengths?: unknown;
    gaps?: unknown;
    conclusion?: unknown;
  };

  return {
    keyFindings,
    sectionAnalysis,
    recommendations,
    strengths: parseInsightPoints(raw2.strengths, MAX_INSIGHT_POINTS),
    gaps: parseInsightPoints(raw2.gaps, MAX_INSIGHT_POINTS),
    conclusion:
      typeof raw2.conclusion === 'string' ? raw2.conclusion.trim() : '',
    sectionInsights,
  };
}

export function parseInsightPoints(
  raw: unknown,
  max: number,
): AiInsightPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: AiInsightPoint[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const [title, ...rest] = item.split(':');
      const detail = rest.join(':').trim();
      if (item.trim()) {
        points.push(
          detail
            ? { title: title.trim(), detail }
            : { title: '', detail: item.trim() },
        );
      }
    } else if (typeof item === 'object' && item !== null) {
      const v = item as { title?: unknown; detail?: unknown };
      const title = typeof v.title === 'string' ? v.title.trim() : '';
      const detail = typeof v.detail === 'string' ? v.detail.trim() : '';
      if (title || detail) points.push({ title, detail });
    }
    if (points.length >= max) break;
  }
  return points;
}

export function parseAiSwot(raw: string): AiSwot {
  const parsed = extractJson(raw, 'object');
  if (typeof parsed !== 'object' || parsed === null) {
    throw new BadGatewayException('AI response was not a JSON object');
  }
  const v = parsed as Record<string, unknown>;
  const list = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter((x): x is string => typeof x === 'string' && !!x.trim())
          .map((x) => x.trim())
          .slice(0, MAX_INSIGHT_POINTS)
      : [];
  const swot = {
    strengths: list(v.strengths),
    weaknesses: list(v.weaknesses),
    opportunities: list(v.opportunities),
    threats: list(v.threats),
  };
  if (Object.values(swot).every((l) => l.length === 0)) {
    throw new BadGatewayException('AI response had an empty SWOT');
  }
  return swot;
}

export function countryName(code?: string | null): string {
  if (!code) return 'Ecuador';
  try {
    return (
      new Intl.DisplayNames(['es'], { type: 'region' }).of(
        code.toUpperCase(),
      ) ?? code
    );
  } catch {
    return code;
  }
}
