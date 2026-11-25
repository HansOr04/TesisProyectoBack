import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CONSOLIDATED_PLAN_SCOPES,
  ConsolidatedPlanScope,
} from '../../../assessment-core/application/consolidated-plan.service';

export class ExportPptxDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  narrative?: string;

  @IsOptional()
  @IsIn(CONSOLIDATED_PLAN_SCOPES)
  ganttScope?: ConsolidatedPlanScope;
}
