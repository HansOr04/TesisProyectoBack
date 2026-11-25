import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class KpiResponseRiskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  indicatorId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  score: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  observation: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  riskDescription: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  riskType?: string;

  @IsOptional()
  @IsBoolean()
  manualCritical?: boolean;
}

export class ScoreKpiRiskDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => KpiResponseRiskDto)
  responses: KpiResponseRiskDto[];
}
