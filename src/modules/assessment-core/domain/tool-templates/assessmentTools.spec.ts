import {
  ORGANIZATIONAL_TOOL_TEMPLATE,
  CAPACITY_TOOL_TEMPLATE,
  RISK_TOOL_TEMPLATE,
} from './index';

function countIndicators(
  template:
    | typeof ORGANIZATIONAL_TOOL_TEMPLATE
    | typeof CAPACITY_TOOL_TEMPLATE
    | typeof RISK_TOOL_TEMPLATE,
): number {
  return template.sections.reduce((sum, s) => sum + s.indicators.length, 0);
}

describe('assessmentTools templates (F1-B03)', () => {
  it('Organizational has 73 KPI across 6 dimensions', () => {
    expect(ORGANIZATIONAL_TOOL_TEMPLATE.sections).toHaveLength(6);
    expect(countIndicators(ORGANIZATIONAL_TOOL_TEMPLATE)).toBe(73);
  });

  it('Capacity has 30 KPI across 4 áreas estratégicas', () => {
    expect(CAPACITY_TOOL_TEMPLATE.sections).toHaveLength(4);
    expect(countIndicators(CAPACITY_TOOL_TEMPLATE)).toBe(30);
  });

  it('Risk has 46 KPI across 4 principios', () => {
    expect(RISK_TOOL_TEMPLATE.sections).toHaveLength(4);
    expect(countIndicators(RISK_TOOL_TEMPLATE)).toBe(46);
  });

  it('Risk carries a default risk threshold and EC country override', () => {
    expect(RISK_TOOL_TEMPLATE.riskThreshold).toBe(5);
    expect(RISK_TOOL_TEMPLATE.countryRiskParams?.EC?.riskThreshold).toBe(5);
  });

  it.each([
    ['ORGANIZATIONAL', ORGANIZATIONAL_TOOL_TEMPLATE],
    ['CAPACITY', CAPACITY_TOOL_TEMPLATE],
    ['RISK', RISK_TOOL_TEMPLATE],
  ] as const)(
    '%s has unique indicator codes and positive weights',
    (_, template) => {
      const codes = new Set<string>();
      for (const section of template.sections) {
        expect(section.weight).toBeGreaterThan(0);
        for (const indicator of section.indicators) {
          expect(codes.has(indicator.code)).toBe(false);
          codes.add(indicator.code);
          expect(indicator.weight).toBeGreaterThan(0);
        }
      }
    },
  );
});
