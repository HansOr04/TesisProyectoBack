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

// UCA-04: calificación entera 1..10 + observación obligatoria por KPI (regla de
// negocio transversal RF-03/04/05, doc 01 §1).
export class KpiResponseDto {
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

  // El evaluador puede marcar el KPI como "requiere atención" a mano, aunque
  // el score sea alto (RF-03: no todo lo crítico se refleja en la nota).
  @IsOptional()
  @IsBoolean()
  manualCritical?: boolean;
}

export class ScoreKpiDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => KpiResponseDto)
  responses: KpiResponseDto[];
}
