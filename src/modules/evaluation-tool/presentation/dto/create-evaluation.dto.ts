import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAssessmentEvaluationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  profileId: string;
}
