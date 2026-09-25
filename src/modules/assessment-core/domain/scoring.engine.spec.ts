import {
  OrganizationalStrategy,
  CapacityStrategy,
  RiskStrategy,
  SectionScoreInput,
  ToolScoringStrategy,
} from './scoring.engine';

const ALL_TENS: SectionScoreInput[] = [
  {
    sectionId: 's1',
    weight: 1,
    indicators: [
      { weight: 1, score: 10 },
      { weight: 1, score: 10 },
      { weight: 2, score: 10 },
    ],
  },
];

const ALL_ONES: SectionScoreInput[] = [
  {
    sectionId: 's1',
    weight: 1,
    indicators: [
      { weight: 1, score: 1 },
      { weight: 1, score: 1 },
      { weight: 2, score: 1 },
    ],
  },
];

// Fixture mixto (2 secciones, pesos distintos de KPI y de sección):
//   Sección A (weight=2): (1*8 + 1*4) / (1+1) = 6
//   Sección B (weight=1): (2*10 + 1*1) / (2+1) = 21/3 = 7
//   Global: (2*6 + 1*7) / (2+1) = 19/3 = 6.333... → 6.33
const MIXED_WEIGHTED: SectionScoreInput[] = [
  {
    sectionId: 'A',
    weight: 2,
    indicators: [
      { weight: 1, score: 8 },
      { weight: 1, score: 4 },
    ],
  },
  {
    sectionId: 'B',
    weight: 1,
    indicators: [
      { weight: 2, score: 10 },
      { weight: 1, score: 1 },
    ],
  },
];

describe.each([
  ['OrganizationalStrategy', new OrganizationalStrategy()],
  ['CapacityStrategy', new CapacityStrategy()],
  ['RiskStrategy', new RiskStrategy()],
] as [string, ToolScoringStrategy][])(
  '%s (F2-B05 scoring.engine)',
  (_, strategy) => {
    it('extremo todo-10: sectionAverage y globalScore = 10, no crítico', () => {
      expect(strategy.sectionAverage(ALL_TENS[0])).toBe(10);
      expect(strategy.globalScore(ALL_TENS)).toBe(10);
      expect(strategy.isCritical(10)).toBe(false);
    });

    it('extremo todo-1: sectionAverage y globalScore = 1, crítico', () => {
      expect(strategy.sectionAverage(ALL_ONES[0])).toBe(1);
      expect(strategy.globalScore(ALL_ONES)).toBe(1);
      expect(strategy.isCritical(1)).toBe(true);
    });

    it('caso mixto ponderado por peso de KPI y de sección', () => {
      expect(strategy.sectionAverage(MIXED_WEIGHTED[0])).toBe(6);
      expect(strategy.sectionAverage(MIXED_WEIGHTED[1])).toBe(7);
      expect(strategy.globalScore(MIXED_WEIGHTED)).toBe(6.33);
    });

    it('isCritical: score <= 5 es crítico (regla transversal RF-03/04/05)', () => {
      expect(strategy.isCritical(5)).toBe(true);
      expect(strategy.isCritical(6)).toBe(false);
    });

    it('sección sin KPI no rompe el cálculo (promedio 0)', () => {
      expect(
        strategy.sectionAverage({
          sectionId: 'empty',
          weight: 1,
          indicators: [],
        }),
      ).toBe(0);
    });
  },
);

describe('RiskStrategy.classifyRisk (RF-05)', () => {
  const risk = new RiskStrategy();

  it('score > threshold ⇒ NEGLIGIBLE (despreciable)', () => {
    expect(risk.classifyRisk(10, 5)).toBe('NEGLIGIBLE');
    expect(risk.classifyRisk(6, 5)).toBe('NEGLIGIBLE');
  });

  it('score <= threshold ⇒ NON_NEGLIGIBLE (no despreciable, genera medidas RF-06)', () => {
    expect(risk.classifyRisk(5, 5)).toBe('NON_NEGLIGIBLE');
    expect(risk.classifyRisk(4, 5)).toBe('NON_NEGLIGIBLE');
    expect(risk.classifyRisk(1, 1)).toBe('NON_NEGLIGIBLE');
  });
});
