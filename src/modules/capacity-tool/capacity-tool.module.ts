import { Module } from '@nestjs/common';
import { AssessmentAiModule } from '../assessment-ai/assessment-ai.module';
import { AssessmentCoreModule } from '../assessment-core/assessment-core.module';
import { AssessmentSessionModule } from '../assessment-session/assessment-session.module';
import { EvaluationToolModule } from '../evaluation-tool/evaluation-tool.module';
import { CapacityToolAiService } from './application/capacity-tool-ai.service';
import { CapacityToolService } from './application/capacity-tool.service';
import { CapacityToolController } from './presentation/controllers/capacity-tool.controller';

// Herramienta de Capacidades. El flujo genérico y los adaptadores de persistencia
// vienen de EvaluationToolModule; del núcleo: auditoría, aplicabilidad, alcance
// y guards; del módulo de IA: el cliente LLM; del de sesión: el gateway.
@Module({
  imports: [
    AssessmentCoreModule,
    AssessmentAiModule,
    AssessmentSessionModule,
    EvaluationToolModule,
  ],
  controllers: [CapacityToolController],
  providers: [CapacityToolService, CapacityToolAiService],
  exports: [CapacityToolService],
})
export class CapacityToolModule {}
