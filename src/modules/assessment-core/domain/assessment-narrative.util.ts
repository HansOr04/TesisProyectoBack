export type AssessmentNarrativeTool = 'ORGANIZATIONAL' | 'CAPACITY' | 'RISK';

export interface AssessmentNarrativeProfile {
  name: string;
  type: string; // "ASSOCIATION" | "COMPANY"
  yearStarted?: number | null;
  memberCount?: number | null;
  mainActivity?: string | null;
  mainProduct: string;
  secondaryProducts?: string | null;
  mainMarkets?: string | null;
}

export interface AssessmentNarrativeSection {
  number: number;
  name: string;
  weightedAvg: number; // 0-10
}

const SPANISH_COUNT_WORDS: Record<number, string> = {
  1: 'una',
  2: 'dos',
  3: 'tres',
  4: 'cuatro',
  5: 'cinco',
  6: 'seis',
  7: 'siete',
  8: 'ocho',
  9: 'nueve',
  10: 'diez',
};

function countWord(n: number): string {
  return SPANISH_COUNT_WORDS[n] ?? String(n);
}

function orgLabel(type: string): string {
  return type === 'ASSOCIATION' ? 'la asociación' : 'la organización';
}

// Resumen ejecutivo determinístico (sin IA) a partir de los datos de perfil
// (inicio de actividades, socios, producto, mercados) + los porcentajes de
// cumplimiento por sección de la evaluación (weightedAvg/10 -> %). Sirve
// como narrativa por defecto del reporte cuando no se provee una manual/IA,
// para que el "Resumen Ejecutivo" nunca quede en blanco.
export function buildExecutiveNarrative(
  profile: AssessmentNarrativeProfile,
  sections: AssessmentNarrativeSection[],
  tool: AssessmentNarrativeTool,
): string {
  const label = orgLabel(profile.type);
  const yearText =
    profile.yearStarted != null ? String(profile.yearStarted) : '';
  const memberText =
    profile.memberCount != null ? String(profile.memberCount) : '';
  const activityText = profile.mainActivity ?? '';
  const marketsText = profile.mainMarkets ?? '';

  let intro =
    `${profile.name}, inició sus actividades en ${yearText}; actualmente, cuenta con ${memberText} socios; ` +
    `su actividad principal es la ${activityText}, su principal producto es el ${profile.mainProduct}`;

  if (tool === 'RISK') {
    if (profile.secondaryProducts) {
      intro += ` y además comercializa otros productos como el: ${profile.secondaryProducts}`;
    }
    intro += `, sus principales mercados son: ${marketsText}.`;
  } else {
    const verb = tool === 'ORGANIZATIONAL' ? 'cuentan' : 'cuenta';
    if (profile.secondaryProducts) {
      intro += ` y además ${verb} con otros productos como son ${profile.secondaryProducts}`;
    }
    intro += `, sus principales mercados son ${marketsText}.`;
  }

  const sorted = [...sections].sort((a, b) => a.number - b.number);
  const sectionSentences = sorted.map((s) => {
    const pct = Math.round(s.weightedAvg * 10);
    const sectionLabel =
      tool === 'RISK' ? `Principio ${s.number}: ${s.name}` : s.name;
    return `${sectionLabel} con un ${pct}%`;
  });

  let processIntro: string;
  if (tool === 'CAPACITY') {
    processIntro =
      `Con relación al análisis de capacidades para cumplir la normativa de debida diligencia aplicable ` +
      `${label} presentó los siguientes porcentajes de cumplimiento de indicadores en las ${countWord(sections.length)} áreas del proceso de diligencia debida: `;
  } else if (tool === 'ORGANIZATIONAL') {
    processIntro =
      `Con relación a las dimensiones de fortalecimiento asociativo ${label} presentó los siguientes ` +
      `porcentajes de cumplimiento de indicadores en las siguientes áreas: `;
  } else {
    processIntro =
      `Con relación al análisis para la identificación y gestión de riesgos ${label} presentó los siguientes ` +
      `porcentajes de cumplimiento de indicadores en los ${countWord(sections.length)} principios relacionados con la normativa aplicable: `;
  }

  return `${intro} ${processIntro}${sectionSentences.join(', ')}.`;
}
