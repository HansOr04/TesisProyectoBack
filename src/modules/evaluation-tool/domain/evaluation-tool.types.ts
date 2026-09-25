// Tipos de dominio de las herramientas de evaluación. Son estructurales (sin
// dependencia del ORM): los adaptadores Prisma devuelven objetos que los
// satisfacen tal cual, y la capa de aplicación solo conoce estas formas.

/** Compatible con number y con Prisma.Decimal (Number(x) funciona en ambos). */
export type NumericLike = number | string | { toString(): string };

export type EvaluationStatus =
  'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
export type MeasureStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface IndicatorRecord {
  id: string;
  sectionId: string;
  code: string;
  name: string;
  description: string | null;
  helpText: string | null;
  scoringRubric: string | null;
  weight: NumericLike;
  active: boolean;
  sortOrder: number;
  deletedAt: Date | null;
}

export interface SectionRecord {
  id: string;
  templateId: string;
  number: number;
  name: string;
  description: string | null;
  weight: NumericLike;
  sortOrder: number;
  deletedAt: Date | null;
}

export interface SectionWithIndicators extends SectionRecord {
  indicators: IndicatorRecord[];
}

export interface TemplateRecord {
  id: string;
  organisation: string;
  tool: string;
  version: number;
  name: string;
  description: string | null;
  active: boolean;
  labels: unknown;
  createdBy: string | null;
  riskThreshold: NumericLike | null;
  deletedAt: Date | null;
}

export interface TemplateWithStructure extends TemplateRecord {
  sections: SectionWithIndicators[];
}

export interface ProfileRecord {
  id: string;
  organisation: string;
  name: string;
  type: string;
  associationLevel: string | null;
  parentProfileId: string | null;
  country: string;
  region: string | null;
  mainProduct: string;
  evaluatorId: string | null;
  confidential: boolean;
  deletedAt: Date | null;
}

export interface ResponseRecord {
  id: string;
  evaluationId: string;
  indicatorId: string;
  score: number;
  observation: string;
  isCritical: boolean;
  scoredBy: string;
  scoredAt: Date;
  indicator: IndicatorRecord;
}

export interface EvaluationRecord {
  id: string;
  organisation: string;
  templateId: string;
  profileId: string;
  status: EvaluationStatus;
  startedBy: string;
  startedAt: Date;
  completedAt: Date | null;
  globalScore: NumericLike | null;
  sectionScores: unknown;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface EvaluationWithStructure extends EvaluationRecord {
  profile: ProfileRecord;
  template: TemplateWithStructure;
  responses: ResponseRecord[];
}

export interface EvaluationListItem extends EvaluationRecord {
  profile: ProfileRecord;
  template: { id: string; name: string; version: number };
}

export interface CompletedEvaluationPoint {
  id: string;
  completedAt: Date | null;
  globalScore: NumericLike | null;
  sectionScores: unknown;
}

export interface IndicatorMeasureRecord {
  id: string;
  organisation: string;
  evaluationId: string;
  indicatorId: string;
  name: string;
  description: string | null;
  responsible: string;
  support: string | null;
  startDate: Date;
  endDate: Date;
  budgetUsd: NumericLike | null;
  verificationLink: string | null;
  progressPct: number;
  status: MeasureStatus;
  expectedResult: string | null;
  appliedImprovements: string | null;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IndicatorMeasureWithIndicator extends IndicatorMeasureRecord {
  indicator: IndicatorRecord;
}

export interface SectionScoreResult {
  sectionId: string;
  number: number;
  name: string;
  weight: number;
  weightedAvg: number;
  critical: boolean;
}

export interface OrganisationOverviewRow {
  profile: ProfileRecord;
  evaluationId: string | null;
  status: string | null;
  globalScore: number | null;
  sectionScores: SectionScoreResult[];
  criticalCount: number;
  isConsolidated: boolean;
}

export interface MeasureCounts {
  total: number;
  done: number;
}

export interface FileExport {
  filename: string;
  contentType: string;
  data: Buffer;
}
