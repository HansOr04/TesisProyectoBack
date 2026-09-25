import { ResponseInput } from '../../../evaluation-tool/domain/ports/evaluation.repository';
import { MeasureCounts } from '../../../evaluation-tool/domain/evaluation-tool.types';
import {
  MitigationMeasureRecord,
  RiskClass,
  RiskRecord,
  RiskWithMeasures,
} from '../risk-tool.types';

export const RISK_REPOSITORY = Symbol('RISK_REPOSITORY');

export interface RiskResponseInput extends ResponseInput {
  riskDescription: string;
  riskType?: string;
  class: RiskClass;
}

export interface CreateMitigationMeasureInput {
  riskId: string;
  description: string;
  responsible: string;
  support?: string;
  startWeek: Date;
  durationDays: number;
  endDate: Date;
  resources?: string;
  budgetUsd?: number;
  verificationLink?: string;
  expectedResult?: string;
  appliedImprovements?: string;
  updatedBy: string;
}

export interface UpdateMitigationMeasureInput {
  progressPct: number;
  status: MitigationMeasureRecord['status'];
  support?: string;
  budgetUsd?: number;
  verificationLink?: string;
  expectedResult?: string;
  appliedImprovements?: string;
  updatedBy: string;
}

export interface RiskCountryParam {
  country: string;
  riskThreshold: number;
  updatedAt: Date;
}

export interface RiskRepository {
  /** Umbral configurado para el país, o null si no hay override. */
  findCountryThreshold(
    organisation: string,
    country: string,
  ): Promise<number | null>;
  listCountryParams(organisation: string): Promise<RiskCountryParam[]>;
  upsertCountryParam(
    organisation: string,
    country: string,
    riskThreshold: number,
    updatedBy?: string,
  ): Promise<RiskCountryParam>;
  deleteCountryParam(organisation: string, country: string): Promise<void>;

  /** Respuestas + riesgos clasificados en una sola transacción. */
  upsertResponsesWithRisks(
    evaluationId: string,
    responses: RiskResponseInput[],
    scoredBy: string,
    criticalThreshold: number,
  ): Promise<void>;
  listByEvaluation(evaluationId: string): Promise<RiskWithMeasures[]>;
  /** Riesgos NON_NEGLIGIBLE sin medida, por evaluación, para varias evaluaciones. */
  countUnmitigatedByEvaluations(
    evaluationIds: string[],
  ): Promise<Map<string, number>>;
  findById(organisation: string, riskId: string): Promise<RiskRecord | null>;
  createMeasure(
    input: CreateMitigationMeasureInput,
  ): Promise<MitigationMeasureRecord>;
  findMeasure(
    organisation: string,
    measureId: string,
  ): Promise<MitigationMeasureRecord | null>;
  updateMeasure(
    measureId: string,
    input: UpdateMitigationMeasureInput,
  ): Promise<MitigationMeasureRecord>;
  listMeasuresByEvaluation(
    evaluationId: string,
  ): Promise<MitigationMeasureRecord[]>;
  countMeasuresByEvaluations(
    evaluationIds: string[],
  ): Promise<Map<string, MeasureCounts>>;
}
