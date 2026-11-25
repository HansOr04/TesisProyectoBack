import { Module } from '@nestjs/common';
import { AssessmentAccessScopeService } from '../assessment-core/application/assessment-access-scope.service';
import { REALTIME_NOTIFIER } from './domain/ports/realtime-notifier.port';
import { AssessmentSessionGateway } from './infrastructure/assessment-session.gateway';

@Module({
  providers: [
    AssessmentAccessScopeService,
    AssessmentSessionGateway,
    { provide: REALTIME_NOTIFIER, useExisting: AssessmentSessionGateway },
  ],
  exports: [AssessmentSessionGateway, REALTIME_NOTIFIER],
})
export class AssessmentSessionModule {}
