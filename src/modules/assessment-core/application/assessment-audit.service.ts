import { Injectable, Optional } from '@nestjs/common';
import { ActivityLogService } from '../../audit/application/activity-log.service';
import {
  ACTIVITY_LOG_LEVELS,
  ACTIVITY_LOG_SOURCE_TYPES,
} from '../../audit/domain/activity-log.types';
import { RequestContextService } from '../../identity/application/request-context.service';

// Wrapper fino y tipado sobre ActivityLogService: cada acción auditable de
// Assessment tiene un nombre estable que el historial de roles y los reportes
// pueden consultar. Nuevos bloques extienden AssessmentAuditAction sin tocar
// el resto del servicio.
export type AssessmentAuditAction =
  | 'organisation.create'
  | 'organisation.update'
  | 'organisation.reprovision'
  | 'assessment-role.assign'
  | 'assessment-role.revoke'
  | 'assessment-profile.create'
  | 'assessment-profile.update'
  | 'assessment-profile.delete'
  | 'assessment-profile.applicability-update'
  | 'assessment-template.new-version'
  | 'assessment-template.change'
  | 'assessment-risk.country-params-update'
  | 'assessment-evaluation.create'
  | 'assessment-evaluation.complete'
  | 'assessment-evaluation.delete'
  | 'assessment-response.upsert'
  | 'assessment-measure.create'
  | 'assessment-measure.progress'
  | 'assessment-risk.upsert'
  | 'assessment-ai.call'
  | 'assessment-export.generate';

const WARN_ACTIONS: ReadonlySet<AssessmentAuditAction> = new Set([
  'assessment-role.revoke',
  'assessment-profile.delete',
  'assessment-evaluation.delete',
]);

@Injectable()
export class AssessmentAuditService {
  constructor(
    private readonly activityLogService: ActivityLogService,
    @Optional() private readonly requestContext?: RequestContextService,
  ) {}

  async record(
    organisation: string,
    action: AssessmentAuditAction,
    entityData: Record<string, unknown>,
    createdById?: string,
  ): Promise<void> {
    await this.activityLogService.createActivityLog({
      type: action,
      organisation,
      createdById,
      sourceType: ACTIVITY_LOG_SOURCE_TYPES.UI,
      entityData,
      level: WARN_ACTIONS.has(action)
        ? ACTIVITY_LOG_LEVELS.WARNING
        : ACTIVITY_LOG_LEVELS.INFO,
      requestId: this.requestContext?.getRequestId(),
      ipAddress: this.requestContext?.getRequestIp(),
      userAgent: this.requestContext?.getUserAgent(),
    });
  }
}
