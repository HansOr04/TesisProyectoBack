// Vocabulario compartido por las tres herramientas y el núcleo.

export const ASSESSMENT_TOOLS = ['ORGANIZATIONAL', 'CAPACITY', 'RISK'] as const;
export type AssessmentToolCode = (typeof ASSESSMENT_TOOLS)[number];

export const ASSESSMENT_MODULE_CODES = {
  CORE: 'assessment-core',
  ORGANIZATIONAL: 'organizational-tool',
  CAPACITY: 'capacity-tool',
  RISK: 'risk-tool',
} as const;

export const ASSESSMENT_PERMISSION_CODES = [
  'read',
  'write',
  'delete',
  'admin',
] as const;

export const ASSESSMENT_ROLE_CODES = [
  'assessment_admin',
  'assessment_evaluator',
] as const;
export type AssessmentRoleCode = (typeof ASSESSMENT_ROLE_CODES)[number];

export const ACTIVE_EVALUATION_STATUSES = ['DRAFT', 'IN_PROGRESS'] as const;

/** score <= 5 ⇒ KPI crítico (regla transversal RF-03/04/05). */
export const CRITICAL_THRESHOLD = 5;
