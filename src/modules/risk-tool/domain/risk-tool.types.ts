import {
  MeasureStatus,
  NumericLike,
} from '../../evaluation-tool/domain/evaluation-tool.types';

export type RiskClass = 'NEGLIGIBLE' | 'NON_NEGLIGIBLE';

export interface RiskRecord {
  id: string;
  evaluationId: string;
  indicatorId: string;
  description: string;
  riskType: string | null;
  class: RiskClass;
  identifiedBy: string;
  createdAt: Date;
}

export interface MitigationMeasureRecord {
  id: string;
  riskId: string;
  description: string;
  responsible: string;
  support: string | null;
  startWeek: Date;
  durationDays: number;
  endDate: Date;
  resources: string | null;
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

export interface RiskWithMeasures extends RiskRecord {
  measures: MitigationMeasureRecord[];
}
