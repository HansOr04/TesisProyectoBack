import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  ASSESSMENT_TOOLS,
  AssessmentToolCode,
} from '../../../assessment-core/domain/assessment.constants';

export class ToolQueryDto {
  @IsIn(ASSESSMENT_TOOLS)
  tool: AssessmentToolCode;
}

export class ClustersQueryDto extends ToolQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(6)
  k = 3;
}

export const SEGMENT_KEYS = [
  'country',
  'region',
  'type',
  'mainProduct',
] as const;

export class SegmentsQueryDto {
  @IsOptional()
  @IsIn(SEGMENT_KEYS)
  by: (typeof SEGMENT_KEYS)[number] = 'country';
}
