import { IsArray, IsString } from 'class-validator';

export class SetAssessmentProfileApplicabilityDto {
  @IsArray()
  @IsString({ each: true })
  excludedSectionIds: string[];

  @IsArray()
  @IsString({ each: true })
  excludedIndicatorIds: string[];
}
