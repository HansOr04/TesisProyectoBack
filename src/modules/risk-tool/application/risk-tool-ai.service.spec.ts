import { BadGatewayException } from '@nestjs/common';
import {
  parseAiRiskMeasureSuggestions,
  parseAiInconsistencyFindings,
  parseAiReportInsights,
} from './risk-tool-ai.service';

describe('parseAiRiskMeasureSuggestions (anti-hallucination guard)', () => {
  it('parses a valid JSON array of suggestions', () => {
    const raw =
      '[{"indicatorId":"i1","description":"Regularizar los títulos de tierra."}]';

    const result = parseAiRiskMeasureSuggestions(raw, ['i1']);

    expect(result).toEqual([
      { indicatorId: 'i1', description: 'Regularizar los títulos de tierra.' },
    ]);
  });

  it('tolerates surrounding prose around the JSON array', () => {
    const raw =
      'Aquí tienes las sugerencias:\n[{"indicatorId":"i1","description":"d"}]\nEspero que ayude.';

    const result = parseAiRiskMeasureSuggestions(raw, ['i1']);

    expect(result).toHaveLength(1);
  });

  it('drops suggestions whose indicatorId was not in the requested list (hallucinated KPI)', () => {
    const raw = JSON.stringify([
      { indicatorId: 'i1', description: 'd1' },
      { indicatorId: 'i-does-not-exist', description: 'd2' },
    ]);

    const result = parseAiRiskMeasureSuggestions(raw, ['i1']);

    expect(result).toEqual([{ indicatorId: 'i1', description: 'd1' }]);
  });

  it('drops malformed entries missing required fields', () => {
    const raw = JSON.stringify([
      { indicatorId: 'i1' }, // missing description
      { description: 'd2' }, // missing indicatorId
    ]);

    const result = parseAiRiskMeasureSuggestions(raw, ['i1', 'i2']);

    expect(result).toEqual([]);
  });

  it('throws BadGatewayException when the response has no JSON array at all', () => {
    expect(() =>
      parseAiRiskMeasureSuggestions('lo siento, no puedo ayudar con eso', [
        'i1',
      ]),
    ).toThrow(BadGatewayException);
  });

  it('throws BadGatewayException when the JSON is malformed', () => {
    expect(() =>
      parseAiRiskMeasureSuggestions('[{"indicatorId": "i1",]', ['i1']),
    ).toThrow(BadGatewayException);
  });
});

describe('parseAiInconsistencyFindings (anti-hallucination guard)', () => {
  it('parses a valid JSON array of findings', () => {
    const raw =
      '[{"indicatorIds":["i1","i2"],"description":"Contradicción entre observaciones."}]';

    const result = parseAiInconsistencyFindings(raw, ['i1', 'i2']);

    expect(result).toEqual([
      {
        indicatorIds: ['i1', 'i2'],
        description: 'Contradicción entre observaciones.',
      },
    ]);
  });

  it('tolerates surrounding prose around the JSON array', () => {
    const raw =
      'Encontré lo siguiente:\n[{"indicatorIds":["i1"],"description":"d"}]\nFin.';

    const result = parseAiInconsistencyFindings(raw, ['i1']);

    expect(result).toHaveLength(1);
  });

  it('drops findings referencing an indicatorId outside the requested list (hallucinated KPI)', () => {
    const raw = JSON.stringify([
      { indicatorIds: ['i1'], description: 'd1' },
      { indicatorIds: ['i1', 'i-does-not-exist'], description: 'd2' },
    ]);

    const result = parseAiInconsistencyFindings(raw, ['i1']);

    expect(result).toEqual([{ indicatorIds: ['i1'], description: 'd1' }]);
  });

  it('drops malformed entries missing required fields', () => {
    const raw = JSON.stringify([{ indicatorIds: [] }, { description: 'd2' }]);

    const result = parseAiInconsistencyFindings(raw, ['i1']);

    expect(result).toEqual([]);
  });

  it('accepts an empty array when there are no findings', () => {
    const result = parseAiInconsistencyFindings('[]', ['i1']);
    expect(result).toEqual([]);
  });

  it('throws BadGatewayException when the response has no JSON array at all', () => {
    expect(() =>
      parseAiInconsistencyFindings('lo siento, no puedo ayudar con eso', [
        'i1',
      ]),
    ).toThrow(BadGatewayException);
  });

  it('throws BadGatewayException when the JSON is malformed', () => {
    expect(() =>
      parseAiInconsistencyFindings('[{"indicatorIds": ["i1"],]', ['i1']),
    ).toThrow(BadGatewayException);
  });
});

describe('parseAiReportInsights (anti-hallucination guard)', () => {
  it('parses a valid JSON object with all three fields', () => {
    const raw = JSON.stringify({
      keyFindings: ['Hallazgo 1', 'Hallazgo 2'],
      sectionAnalysis: {
        '1': 'Análisis principio 1',
        '2': 'Análisis principio 2',
      },
      recommendations: ['Recomendación 1'],
    });

    const result = parseAiReportInsights(raw, ['1', '2']);

    expect(result).toEqual({
      keyFindings: ['Hallazgo 1', 'Hallazgo 2'],
      sectionAnalysis: {
        '1': 'Análisis principio 1',
        '2': 'Análisis principio 2',
      },
      recommendations: ['Recomendación 1'],
    });
  });

  it('tolerates surrounding prose around the JSON object', () => {
    const raw = `Aquí está el análisis:\n${JSON.stringify({
      keyFindings: ['h1'],
      sectionAnalysis: {},
      recommendations: ['r1'],
    })}\nEspero que ayude.`;

    const result = parseAiReportInsights(raw, []);

    expect(result.keyFindings).toEqual(['h1']);
    expect(result.recommendations).toEqual(['r1']);
  });

  it('drops sectionAnalysis keys referencing a principle number outside the requested list (hallucinated principle)', () => {
    const raw = JSON.stringify({
      keyFindings: [],
      sectionAnalysis: { '1': 'válido', '99': 'inventado' },
      recommendations: [],
    });

    const result = parseAiReportInsights(raw, ['1']);

    expect(result.sectionAnalysis).toEqual({ '1': 'válido' });
  });

  it('defaults missing or malformed fields to empty arrays/object instead of throwing', () => {
    const raw = JSON.stringify({ keyFindings: 'not-an-array' });

    const result = parseAiReportInsights(raw, ['1']);

    expect(result).toEqual({
      keyFindings: [],
      sectionAnalysis: {},
      recommendations: [],
    });
  });

  it('throws BadGatewayException when the response has no JSON object at all', () => {
    expect(() =>
      parseAiReportInsights('lo siento, no puedo ayudar con eso', ['1']),
    ).toThrow(BadGatewayException);
  });

  it('throws BadGatewayException when the JSON is malformed', () => {
    expect(() =>
      parseAiReportInsights('{"keyFindings": ["a",]}', ['1']),
    ).toThrow(BadGatewayException);
  });
});
