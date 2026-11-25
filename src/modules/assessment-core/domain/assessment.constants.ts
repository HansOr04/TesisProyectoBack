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
  'assessment_viewer',
] as const;
export type AssessmentRoleCode = (typeof ASSESSMENT_ROLE_CODES)[number];

export interface ViewerVisibility {
  allProfiles: boolean;
  profileIds: string[];
}

export function readViewerVisibility(raw: unknown): ViewerVisibility {
  const value = (raw ?? {}) as Partial<ViewerVisibility>;
  return {
    allProfiles: value.allProfiles === true,
    profileIds: Array.isArray(value.profileIds)
      ? value.profileIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export const ACTIVE_EVALUATION_STATUSES = ['DRAFT', 'IN_PROGRESS'] as const;

export const CRITICAL_THRESHOLD = 5;
