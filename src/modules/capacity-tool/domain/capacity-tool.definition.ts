import { CapacityStrategy } from '../../assessment-core/domain/scoring.engine';
import { EvaluationToolDefinition } from '../../evaluation-tool/domain/evaluation-tool.definition';
import { AiDomainContext } from '../../evaluation-tool/application/evaluation-tool-ai.service';

export const CAPACITY_TOOL_DEFINITION: EvaluationToolDefinition = {
  code: 'CAPACITY',
  slug: 'capacity',
  displayName: 'Herramienta de Capacidades',
  section: { singular: 'Área', plural: 'Áreas', singularEn: 'Area' },
  report: {
    subtitle: 'Análisis de capacidades frente al marco normativo aplicable',
    scoreLevelPrefix: 'Capacidad',
    accentColor: 'F78008',
  },
  strategy: new CapacityStrategy(),
};

export const CAPACITY_AI_CONTEXT: AiDomainContext = {
  domain: 'capacidades de cumplimiento normativo',
  sectionLabel: 'área',
  sectionLabelPlural: 'áreas',
  logLabel: 'Capacity',
};
