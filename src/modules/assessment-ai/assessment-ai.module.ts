import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AssessmentLlmClientService } from './application/assessment-llm-client.service';

// Importado (no reproveído) por los módulos Organizativa/Capacidades/Riesgos para que las
// 3 herramientas compartan la MISMA instancia de AssessmentLlmClientService —
// un solo circuit breaker y una sola selección de proveedor.
@Module({
  imports: [HttpModule],
  providers: [AssessmentLlmClientService],
  exports: [AssessmentLlmClientService],
})
export class AssessmentAiModule {}
