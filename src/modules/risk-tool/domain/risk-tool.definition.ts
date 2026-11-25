import { RiskStrategy } from '../../assessment-core/domain/scoring.engine';
import { EvaluationToolDefinition } from '../../evaluation-tool/domain/evaluation-tool.definition';
import { AiDomainContext } from '../../evaluation-tool/application/evaluation-tool-ai.service';

export const RISK_TOOL_DEFINITION: EvaluationToolDefinition = {
  code: 'RISK',
  slug: 'risk',
  displayName: 'Herramienta de Riesgos',
  section: {
    singular: 'Principio',
    plural: 'Principios',
    singularEn: 'Principle',
  },
  report: {
    subtitle: 'Identificación y gestión de riesgos',
    scoreLevelPrefix: 'Capacidad',
    accentColor: '239F71',
  },
  strategy: new RiskStrategy(),
};

export const RISK_AI_CONTEXT: AiDomainContext = {
  domain:
    'identificación y gestión de riesgos de deforestación y debida diligencia en cadenas de suministro agrícolas',
  sectionLabel: 'principio',
  sectionLabelPlural: 'principios',
  logLabel: 'Risk',
};
