import { IsArray, IsString } from 'class-validator';

// Reemplaza el conjunto completo de secciones/indicadores marcados como "no
// aplica" para un perfil (RF-02/03/04/05: aplicabilidad por organización, no
// por plantilla). Excluir una sección implica excluir todos sus indicadores
// (se resuelve en el servicio de scoring, no se duplica en la exclusión).
export class SetAssessmentProfileApplicabilityDto {
  @IsArray()
  @IsString({ each: true })
  excludedSectionIds: string[];

  @IsArray()
  @IsString({ each: true })
  excludedIndicatorIds: string[];
}
