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

// RF-06 (UCV-07): medida de mitigación ligada a un riesgo NON_NEGLIGIBLE. `startWeek`
// es el lunes de la semana de inicio (selector); `endDate` la calcula el servicio como
// `startWeek + durationDays`, nunca el cliente.
export class CreateAssessmentRiskMeasureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;

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
  startWeek: string;

  @IsInt()
  @Min(1)
  durationDays: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resources?: string;

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
