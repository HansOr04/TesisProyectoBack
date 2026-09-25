import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Precondición: la organización a evaluar debe existir; la plantilla vigente
// de la herramienta se resuelve en el servicio (no la elige el cliente).
export class CreateAssessmentEvaluationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  profileId: string;
}
