export const ACTIVITY_LOG_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
} as const;
export type ActivityLogLevel =
  (typeof ACTIVITY_LOG_LEVELS)[keyof typeof ACTIVITY_LOG_LEVELS];

export const ACTIVITY_LOG_SOURCE_TYPES = {
  UI: 'UI',
  SYSTEM: 'System',
  SEED: 'Seed',
} as const;
export type ActivityLogSourceType =
  (typeof ACTIVITY_LOG_SOURCE_TYPES)[keyof typeof ACTIVITY_LOG_SOURCE_TYPES];

export interface ActivityLogInput {
  type: string;
  organisation: string;
  createdById?: string;
  sourceType?: ActivityLogSourceType;
  level?: ActivityLogLevel;
  note?: string;
  entityData?: Record<string, unknown>;
  dataPreview?: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Usuario técnico al que se atribuyen acciones sin autor (seeds, jobs). */
export const SYSTEM_USER_ID = 'system';
