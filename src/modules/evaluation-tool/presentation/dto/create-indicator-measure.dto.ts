import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

// Plan de acción de las herramientas por KPI: la medida se liga directamente a
// un KPI crítico de la evaluación (AssessmentResponse.isCritical).
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

  // "Apoyo" del Excel original: persona/rol de soporte al responsable.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  support?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  // "Inversión ($ USD)" del Excel original: presupuesto estimado de la medida.
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetUsd?: number;

  // "Medios de verificación" del Excel original: enlace/evidencia de cumplimiento.
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
