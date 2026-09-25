import { IsIn } from 'class-validator';

export class ExecutiveNarrativeDto {
  @IsIn(['technical', 'informative', 'formal'])
  tone: 'technical' | 'informative' | 'formal';
}
