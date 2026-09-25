import { AssessmentToolCode } from '../../assessment-core/domain/assessment.constants';

// Dataset neutro (independiente de Prisma) sobre el que trabaja la analítica.
// Las claves de comparación entre evaluaciones son el código del KPI y el
// número de sección, estables entre versiones de plantilla.

export interface AnalyticsProfile {
  id: string;
  name: string;
  type: string;
  country: string;
  region: string | null;
  mainProduct: string;
  memberCount: number | null;
  yearStarted: number | null;
}

export interface AnalyticsSection {
  number: number;
  name: string;
  weight: number;
}

export interface AnalyticsIndicator {
  code: string;
  name: string;
  sectionNumber: number;
  weight: number;
}

export interface AnalyticsResponse {
  indicatorCode: string;
  sectionNumber: number;
  score: number;
}

export interface AnalyticsMeasure {
  indicatorCode: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  progressPct: number;
  createdAt: Date;
}

export interface AnalyticsEvaluation {
  id: string;
  tool: AssessmentToolCode;
  profileId: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  /** Puntaje global recalculado con la misma estrategia ponderada de las herramientas. */
  globalScore: number | null;
  /** Promedio ponderado por sección (número de sección → puntaje). */
  sectionScores: Record<number, number>;
  responses: AnalyticsResponse[];
  measures: AnalyticsMeasure[];
}

export interface AnalyticsToolDataset {
  tool: AssessmentToolCode;
  sections: AnalyticsSection[];
  indicators: AnalyticsIndicator[];
  evaluations: AnalyticsEvaluation[];
}

export interface AnalyticsDataset {
  profiles: AnalyticsProfile[];
  tools: Record<AssessmentToolCode, AnalyticsToolDataset>;
}

export const ANALYTICS_DATASET = Symbol('ANALYTICS_DATASET');

export interface AnalyticsProfileScope {
  evaluatorId?: string;
}

/** Puerto: quien provea el dataset (Prisma hoy) no condiciona los cálculos. */
export interface AnalyticsDatasetPort {
  load(
    organisation: string,
    scope: AnalyticsProfileScope,
  ): Promise<AnalyticsDataset>;
}
