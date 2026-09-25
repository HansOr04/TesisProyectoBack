export interface SectionScoreInput {
  sectionId: string;
  weight: number;
  indicators: { weight: number; score: number }[];
}

export type AssessmentRiskClass = 'NEGLIGIBLE' | 'NON_NEGLIGIBLE';

export interface ToolScoringStrategy {
  /** Promedio ponderado de los KPI de una sección, por peso de KPI. */
  sectionAverage(section: SectionScoreInput): number;
  /** Promedio ponderado de las secciones, por peso de sección. */
  globalScore(sections: SectionScoreInput[]): number;
  /** score <= 5 ⇒ coloreado automático de KPI crítico (regla transversal RF-03/04/05). */
  isCritical(score: number): boolean;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function weightedAverage(items: { weight: number; score: number }[]): number {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight <= 0) return 0;
  const weightedSum = items.reduce((sum, i) => sum + i.weight * i.score, 0);
  return round2(weightedSum / totalWeight);
}

export class OrganizationalStrategy implements ToolScoringStrategy {
  sectionAverage(section: SectionScoreInput): number {
    return weightedAverage(section.indicators);
  }

  globalScore(sections: SectionScoreInput[]): number {
    const sectionEntries = sections.map((s) => ({
      weight: s.weight,
      score: this.sectionAverage(s),
    }));
    return weightedAverage(sectionEntries);
  }

  isCritical(score: number): boolean {
    return score <= 5;
  }
}

// Capacity: mismo cálculo que Organizational, distinto etiquetado (doc 03 §2 F2-B05).
export class CapacityStrategy extends OrganizationalStrategy {}

// Risk: mismo cálculo que Organizational, más clasificación de riesgo por umbral (RF-05).
export class RiskStrategy extends OrganizationalStrategy {
  classifyRisk(score: number, threshold: number): AssessmentRiskClass {
    return score > threshold ? 'NEGLIGIBLE' : 'NON_NEGLIGIBLE';
  }
}
