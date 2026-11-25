import { Module } from '@nestjs/common';
import { AssessmentCoreModule } from '../assessment-core/assessment-core.module';
import { AssessmentAnalyticsService } from './application/assessment-analytics.service';
import { ANALYTICS_DATASET } from './domain/analytics.types';
import { PrismaAnalyticsDatasetRepository } from './infrastructure/prisma-analytics-dataset.repository';
import { AssessmentAnalyticsController } from './presentation/controllers/assessment-analytics.controller';

@Module({
  imports: [AssessmentCoreModule],
  controllers: [AssessmentAnalyticsController],
  providers: [
    AssessmentAnalyticsService,
    { provide: ANALYTICS_DATASET, useClass: PrismaAnalyticsDatasetRepository },
  ],
  exports: [AssessmentAnalyticsService],
})
export class AssessmentAnalyticsModule {}
