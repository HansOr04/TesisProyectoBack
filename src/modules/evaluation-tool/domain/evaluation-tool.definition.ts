import { AssessmentToolCode } from '../../assessment-core/domain/assessment.constants';
import { ToolScoringStrategy } from '../../assessment-core/domain/scoring.engine';

/**
 * Parametriza el servicio genérico de evaluación (Template Method): todo lo que
 * cambia entre la Herramienta Organizativa, la de Capacidades y la de Riesgos
 * en el flujo común (plantilla → evaluación → puntuación → panel) vive acá.
 */
export interface EvaluationToolDefinition {
  code: AssessmentToolCode;
  /** Identificador en minúsculas para nombres de archivo y rutas. */
  slug: string;
  /** Nombre visible de la herramienta (reportes). */
  displayName: string;
  /** Cómo llama esta herramienta a la sección de la plantilla. */
  section: {
    singular: string; // "Dimensión"
    plural: string; // "Dimensiones"
    /** Forma en inglés para mensajes de error de la API. */
    singularEn: string; // "Dimension"
  };
  report: {
    subtitle: string;
    scoreLevelPrefix: string; // "Capacidad" → "Capacidad Alta"
  };
  strategy: ToolScoringStrategy;
}
