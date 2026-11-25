import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateIndicatorMeasureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  indicatorId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  responsible: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  support?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

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
