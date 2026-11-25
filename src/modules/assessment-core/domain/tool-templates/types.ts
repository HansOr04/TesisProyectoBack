export interface AssessmentSeedIndicator {
  code: string;
  name: string;
  description?: string;
  helpText?: string;
  scoringRubric?: string;
  weight: number;
}

export interface AssessmentSeedSection {
  number: number;
  name: string;
  description?: string;
  weight: number;
  indicators: AssessmentSeedIndicator[];
}

export interface AssessmentCountryRiskParams {
  riskThreshold: number;
}

export interface AssessmentSeedTemplate {
  tool: 'ORGANIZATIONAL' | 'CAPACITY' | 'RISK';
  name: string;
  description?: string;
  labels?: Record<string, Record<string, string>>;
  sections: AssessmentSeedSection[];
  riskThreshold?: number;
  countryRiskParams?: Record<string, AssessmentCountryRiskParams>;
}
