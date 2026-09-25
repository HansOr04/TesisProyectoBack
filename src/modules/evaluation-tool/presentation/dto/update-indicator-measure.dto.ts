import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateIndicatorMeasureDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progressPct: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  support?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetUsd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  verificationLink?: string;

  // Resultado esperado al ejecutar la medida (se define al planificar).
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  expectedResult?: string;

  // Mejoras aplicadas / evidencia narrativa registrada al actualizar el avance.
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  appliedImprovements?: string;
}
