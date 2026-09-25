import { AssessmentSeedIndicator } from './types';

export function buildPlaceholderIndicators(
  codePrefix: string,
  sectionNumber: number,
  sectionName: string,
  count: number,
): AssessmentSeedIndicator[] {
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    return {
      code: `${codePrefix}-${sectionNumber}.${index}`,
      name: `TODO-plantilla: KPI ${index} — ${sectionName}`,
      description:
        'TODO-plantilla: transcribir nombre, descripción y peso exactos desde el Excel original para este KPI.',
      weight: 1,
    };
  });
}
