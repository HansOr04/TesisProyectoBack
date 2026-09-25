import { Module } from '@nestjs/common';
import { AssessmentCoreModule } from '../assessment-core/assessment-core.module';
import { AssessmentAnalyticsService } from './application/assessment-analytics.service';
import { ANALYTICS_DATASET } from './domain/analytics.types';
import { PrismaAnalyticsDatasetRepository } from './infrastructure/prisma-analytics-dataset.repository';
import { AssessmentAnalyticsController } from './presentation/controllers/assessment-analytics.controller';

// Analítica de datos sobre las evaluaciones: el servicio depende del puerto
// ANALYTICS_DATASET (DIP) y toda la estadística vive en domain/statistics.ts.
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
