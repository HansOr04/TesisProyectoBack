import { AssessmentToolCode } from '../../assessment-core/domain/assessment.constants';
import { ToolScoringStrategy } from '../../assessment-core/domain/scoring.engine';

export interface EvaluationToolDefinition {
  code: AssessmentToolCode;
  slug: string;
  displayName: string;
  section: {
    singular: string;
    plural: string;
    singularEn: string;
  };
  report: {
    subtitle: string;
    scoreLevelPrefix: string;
    accentColor: string;
  };
  strategy: ToolScoringStrategy;
}
