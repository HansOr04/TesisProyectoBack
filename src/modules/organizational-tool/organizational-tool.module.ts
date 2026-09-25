import { Module } from '@nestjs/common';
import { AssessmentAiModule } from '../assessment-ai/assessment-ai.module';
import { AssessmentCoreModule } from '../assessment-core/assessment-core.module';
import { AssessmentSessionModule } from '../assessment-session/assessment-session.module';
import { EvaluationToolModule } from '../evaluation-tool/evaluation-tool.module';
import { OrganizationalToolAiService } from './application/organizational-tool-ai.service';
import { OrganizationalToolService } from './application/organizational-tool.service';
import { OrganizationalToolController } from './presentation/controllers/organizational-tool.controller';

// Herramienta Organizativa. El flujo genérico y los adaptadores de persistencia
// vienen de EvaluationToolModule; del núcleo: auditoría, aplicabilidad, alcance
// y guards; del módulo de IA: el cliente LLM; del de sesión: el gateway.
@Module({
  imports: [
    AssessmentCoreModule,
    AssessmentAiModule,
    AssessmentSessionModule,
    EvaluationToolModule,
  ],
  controllers: [OrganizationalToolController],
  providers: [OrganizationalToolService, OrganizationalToolAiService],
  exports: [OrganizationalToolService],
})
export class OrganizationalToolModule {}
