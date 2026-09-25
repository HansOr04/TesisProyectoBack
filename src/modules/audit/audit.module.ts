import { Global, Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';
import { AssessmentCoreModule } from '../assessment-core/assessment-core.module';
import { ActivityLogQueryService } from './application/activity-log-query.service';
import { AuditRetentionService } from './application/audit-retention.service';
import { ActivityLogController } from './presentation/activity-log.controller';
import { ActivityLogService } from './application/activity-log.service';

@Global()
@Module({
  imports: [forwardRef(() => AssessmentCoreModule)],
  controllers: [ActivityLogController],
  providers: [
    ActivityLogService,
    ActivityLogQueryService,
    AuditRetentionService,
  ],
  exports: [ActivityLogService, AuditRetentionService],
})
export class AuditModule {}
