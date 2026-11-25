import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateAssessmentRiskMeasureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  responsible: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  support?: string;

  @IsDateString()
  startWeek: string;

  @IsInt()
  @Min(1)
  durationDays: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resources?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetUsd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  verificationLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  expectedResult?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  appliedImprovements?: string;
}
