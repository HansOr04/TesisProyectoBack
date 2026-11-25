import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AssessmentLlmClientService } from './application/assessment-llm-client.service';

@Module({
  imports: [HttpModule],
  providers: [AssessmentLlmClientService],
  exports: [AssessmentLlmClientService],
})
export class AssessmentAiModule {}
