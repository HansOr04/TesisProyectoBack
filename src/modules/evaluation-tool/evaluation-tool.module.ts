import { Module } from '@nestjs/common';
import { AssessmentCoreModule } from '../assessment-core/assessment-core.module';
import { EVALUATION_REPOSITORY } from './domain/ports/evaluation.repository';
import { INDICATOR_MEASURE_REPOSITORY } from './domain/ports/indicator-measure.repository';
import { TEMPLATE_REPOSITORY } from './domain/ports/template.repository';
import { PrismaEvaluationRepository } from './infrastructure/persistence/prisma-evaluation.repository';
import { PrismaIndicatorMeasureRepository } from './infrastructure/persistence/prisma-indicator-measure.repository';
import { PrismaTemplateRepository } from './infrastructure/persistence/prisma-template.repository';

@Module({
  imports: [AssessmentCoreModule],
  providers: [
    { provide: TEMPLATE_REPOSITORY, useClass: PrismaTemplateRepository },
    { provide: EVALUATION_REPOSITORY, useClass: PrismaEvaluationRepository },
    {
      provide: INDICATOR_MEASURE_REPOSITORY,
      useClass: PrismaIndicatorMeasureRepository,
    },
  ],
  exports: [
    TEMPLATE_REPOSITORY,
    EVALUATION_REPOSITORY,
    INDICATOR_MEASURE_REPOSITORY,
  ],
})
export class EvaluationToolModule {}
