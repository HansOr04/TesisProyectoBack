import { AssessmentToolCode } from '../../../assessment-core/domain/assessment.constants';
import {
  CompletedEvaluationPoint,
  EvaluationListItem,
  EvaluationRecord,
  EvaluationWithStructure,
  ProfileRecord,
  SectionScoreResult,
} from '../evaluation-tool.types';

export const EVALUATION_REPOSITORY = Symbol('EVALUATION_REPOSITORY');

export interface ResponseInput {
  indicatorId: string;
  score: number;
  observation: string;
}

export interface ProfileFilter {
  parentProfileId?: string | null;
  evaluatorId?: string;
  confidential?: boolean;
}

export interface EvaluationRepository {
  findProfile(
    organisation: string,
    profileId: string,
  ): Promise<ProfileRecord | null>;
  findProfiles(
    organisation: string,
    filter: ProfileFilter,
  ): Promise<ProfileRecord[]>;
  findChildProfiles(
    organisation: string,
    parentIds: string[],
  ): Promise<ProfileRecord[]>;

  findActiveForProfile(
    organisation: string,
    tool: AssessmentToolCode,
    profileId: string,
  ): Promise<EvaluationRecord | null>;
  create(input: {
    organisation: string;
    templateId: string;
    profileId: string;
    startedBy: string;
  }): Promise<EvaluationRecord>;
  list(
    organisation: string,
    tool: AssessmentToolCode,
    page: { skip: number; take: number },
  ): Promise<{ items: EvaluationListItem[]; total: number }>;
  findWithStructure(
    organisation: string,
    tool: AssessmentToolCode,
    evaluationId: string,
  ): Promise<EvaluationWithStructure | null>;
  /** Todas las evaluaciones (más reciente primero) de los perfiles indicados. */
  findByProfiles(
    organisation: string,
    tool: AssessmentToolCode,
    profileIds: string[],
  ): Promise<EvaluationWithStructure[]>;
  findCompletedByProfile(
    organisation: string,
    tool: AssessmentToolCode,
    profileId: string,
  ): Promise<CompletedEvaluationPoint[]>;

  upsertResponses(
    evaluationId: string,
    responses: ResponseInput[],
    scoredBy: string,
    criticalThreshold: number,
  ): Promise<void>;
  setStatus(evaluationId: string, status: 'IN_PROGRESS'): Promise<void>;
  complete(
    evaluationId: string,
    result: { globalScore: number; sectionScores: SectionScoreResult[] },
  ): Promise<EvaluationRecord>;
}
