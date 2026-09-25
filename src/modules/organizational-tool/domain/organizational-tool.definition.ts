import { OrganizationalStrategy } from '../../assessment-core/domain/scoring.engine';
import { EvaluationToolDefinition } from '../../evaluation-tool/domain/evaluation-tool.definition';
import { AiDomainContext } from '../../evaluation-tool/application/evaluation-tool-ai.service';

// Herramienta Organizativa: diagnóstico de fortalecimiento organizativo por dimensiones.
export const ORGANIZATIONAL_TOOL_DEFINITION: EvaluationToolDefinition = {
  code: 'ORGANIZATIONAL',
  slug: 'organizational',
  displayName: 'Herramienta Organizativa',
  section: {
    singular: 'Dimensión',
    plural: 'Dimensiones',
    singularEn: 'Dimension',
  },
  report: {
    subtitle: 'Diagnóstico de fortalecimiento organizativo',
    scoreLevelPrefix: 'Capacidad',
  },
  strategy: new OrganizationalStrategy(),
};

export const ORGANIZATIONAL_AI_CONTEXT: AiDomainContext = {
  domain: 'fortalecimiento organizativo',
  sectionLabel: 'dimensión',
  sectionLabelPlural: 'dimensiones',
  logLabel: 'Organizational',
};
