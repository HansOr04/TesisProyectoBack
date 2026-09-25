import {
  IndicatorMeasureWithIndicator,
  MeasureCounts,
  MeasureStatus,
} from '../evaluation-tool.types';

export const INDICATOR_MEASURE_REPOSITORY = Symbol(
  'INDICATOR_MEASURE_REPOSITORY',
);

export interface CreateIndicatorMeasureInput {
  organisation: string;
  evaluationId: string;
  indicatorId: string;
  name: string;
  description?: string;
  responsible: string;
  support?: string;
  startDate: Date;
  endDate: Date;
  budgetUsd?: number;
  verificationLink?: string;
  expectedResult?: string;
  appliedImprovements?: string;
  updatedBy: string;
}

export interface UpdateIndicatorMeasureInput {
  progressPct: number;
  status: MeasureStatus;
  support?: string;
  budgetUsd?: number;
  verificationLink?: string;
  expectedResult?: string;
  appliedImprovements?: string;
  updatedBy: string;
}

export interface IndicatorMeasureRepository {
  listByEvaluation(
    organisation: string,
    evaluationId: string,
  ): Promise<IndicatorMeasureWithIndicator[]>;
  indicatorIdsWithMeasure(
    organisation: string,
    evaluationId: string,
  ): Promise<Set<string>>;
  countByEvaluations(
    organisation: string,
    evaluationIds: string[],
  ): Promise<Map<string, MeasureCounts>>;
  create(
    input: CreateIndicatorMeasureInput,
  ): Promise<IndicatorMeasureWithIndicator>;
  findById(
    organisation: string,
    measureId: string,
  ): Promise<IndicatorMeasureWithIndicator | null>;
  update(
    measureId: string,
    input: UpdateIndicatorMeasureInput,
  ): Promise<IndicatorMeasureWithIndicator>;
}
