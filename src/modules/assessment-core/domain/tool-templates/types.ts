export interface AssessmentSeedIndicator {
  code: string; // p.ej. "AZ-1.3"
  name: string;
  description?: string;
  helpText?: string; // qué documento/proceso concreto debe existir para este KPI
  scoringRubric?: string; // nota específica de este KPI, complementa la rúbrica genérica 1-10
  weight: number; // peso del KPI dentro de la sección
}

export interface AssessmentSeedSection {
  number: number; // dimensión (Organizational) | área estratégica (Capacity) | principio (Risk)
  name: string;
  description?: string;
  weight: number; // peso de la sección en el promedio ponderado global
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
  // Risk únicamente (RF-02): el país de la organización evaluada determina el umbral
  // de despreciabilidad efectivo. countryRiskParams[profile.country] ?? riskThreshold.
  riskThreshold?: number;
  countryRiskParams?: Record<string, AssessmentCountryRiskParams>;
}
