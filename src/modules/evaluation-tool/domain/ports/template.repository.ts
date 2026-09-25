import { AssessmentToolCode } from '../../../assessment-core/domain/assessment.constants';
import {
  IndicatorRecord,
  SectionRecord,
  TemplateWithStructure,
} from '../evaluation-tool.types';

export const TEMPLATE_REPOSITORY = Symbol('TEMPLATE_REPOSITORY');

export interface SectionInput {
  number?: number;
  name?: string;
  description?: string | null;
  weight?: number;
}

export interface IndicatorInput {
  code?: string;
  name?: string;
  description?: string | null;
  helpText?: string | null;
  scoringRubric?: string | null;
  weight?: number;
  active?: boolean;
}

export class DuplicateStructureError extends Error {
  constructor() {
    super('duplicate');
  }
}

export interface TemplateRepository {
  findAll(
    organisation: string,
    tool: AssessmentToolCode,
  ): Promise<TemplateWithStructure[]>;
  findById(
    organisation: string,
    tool: AssessmentToolCode,
    id: string,
  ): Promise<TemplateWithStructure | null>;
  findActive(
    organisation: string,
    tool: AssessmentToolCode,
  ): Promise<TemplateWithStructure | null>;
  countEvaluations(templateId: string): Promise<number>;
  /** Clona la plantilla como nueva versión activa y desactiva la anterior. */
  cloneAsNewVersion(
    current: TemplateWithStructure,
    actorId?: string,
  ): Promise<TemplateWithStructure>;

  createSection(
    templateId: string,
    input: Required<Pick<SectionInput, 'number' | 'name'>> & SectionInput,
  ): Promise<SectionRecord>;
  findSection(
    organisation: string,
    tool: AssessmentToolCode,
    sectionId: string,
  ): Promise<SectionRecord | null>;
  findSectionById(sectionId: string): Promise<SectionRecord>;
  countScoredResponsesInActiveEvaluations(filter: {
    sectionId?: string;
    indicatorId?: string;
  }): Promise<number>;
  updateSection(sectionId: string, input: SectionInput): Promise<SectionRecord>;
  softDeleteSection(sectionId: string): Promise<void>;

  createIndicator(
    sectionId: string,
    input: Required<Pick<IndicatorInput, 'code' | 'name'>> & IndicatorInput,
  ): Promise<IndicatorRecord>;
  findIndicator(
    organisation: string,
    tool: AssessmentToolCode,
    indicatorId: string,
  ): Promise<IndicatorRecord | null>;
  updateIndicator(
    indicatorId: string,
    input: IndicatorInput,
  ): Promise<IndicatorRecord>;
  softDeleteIndicator(indicatorId: string): Promise<void>;
}
