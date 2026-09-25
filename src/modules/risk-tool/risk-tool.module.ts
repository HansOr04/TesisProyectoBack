import { Module } from '@nestjs/common';
import { AssessmentAiModule } from '../assessment-ai/assessment-ai.module';
import { AssessmentCoreModule } from '../assessment-core/assessment-core.module';
import { AssessmentSessionModule } from '../assessment-session/assessment-session.module';
import { EvaluationToolModule } from '../evaluation-tool/evaluation-tool.module';
import { RISK_REPOSITORY } from './domain/ports/risk.repository';
import { PrismaRiskRepository } from './infrastructure/persistence/prisma-risk.repository';
import { RiskToolAiService } from './application/risk-tool-ai.service';
import { RiskToolService } from './application/risk-tool.service';
import { RiskToolController } from './presentation/controllers/risk-tool.controller';

// Herramienta de Riesgos. Reutiliza del núcleo: auditoría, aplicabilidad,
// alcance de acceso y guards; del módulo de IA: el cliente LLM compartido;
// del módulo de sesión: el gateway de tiempo real (misma instancia).
@Module({
  imports: [
    AssessmentCoreModule,
    AssessmentAiModule,
    AssessmentSessionModule,
    EvaluationToolModule,
  ],
  controllers: [RiskToolController],
  providers: [
    RiskToolService,
    RiskToolAiService,
    { provide: RISK_REPOSITORY, useClass: PrismaRiskRepository },
  ],
  exports: [RiskToolService],
})
export class RiskToolModule {}
