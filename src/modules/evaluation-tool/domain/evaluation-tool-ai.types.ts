import { BadGatewayException } from '@nestjs/common';

// Contratos y parsers puros de la asistencia con IA de las herramientas.
// Los parsers validan la respuesta del modelo con una regla anti-alucinación:
// todo id que no venga de la lista enviada se descarta.

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

export interface AiReportInsights {
  keyFindings: string[];
  sectionAnalysis: Record<string, string>;
  recommendations: string[];
}

export interface AiReportContext {
  globalScore: number;
  sectionScores: AiSectionScoreContext[];
  criticalItems: AiCriticalContext[];
}

/** Extrae y parsea el primer JSON (array u objeto) de una respuesta de LLM. */
export function extractJson(raw: string, shape: 'array' | 'object'): unknown {
  const jsonMatch = raw.match(
    shape === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/,
  );
  if (!jsonMatch) {
    throw new BadGatewayException('AI response was not valid JSON');
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new BadGatewayException('AI response was not valid JSON');
  }
}

// Extraída como función pura (no depende del proveedor ni de I/O) para poder
// testear la validación anti-alucinación sin llamar a ningún LLM real: toda
// sugerencia con un indicatorId que no vino en la lista pedida se descarta.
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

// Misma lógica anti-alucinación que parseAiMeasureSuggestions: todo hallazgo
// que referencie un indicatorId fuera de la lista enviada se descarta.
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

// Anti-alucinación: cualquier clave de sectionAnalysis que no sea un número de
// dimensión de los enviados se descarta en vez de mostrarse.
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

  return { keyFindings, sectionAnalysis, recommendations };
}
