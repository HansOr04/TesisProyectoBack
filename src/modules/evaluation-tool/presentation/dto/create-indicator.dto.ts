import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateAssessmentIndicatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  helpText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  scoringRubric?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}
