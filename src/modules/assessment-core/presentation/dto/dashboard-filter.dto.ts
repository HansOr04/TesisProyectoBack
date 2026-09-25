import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// RF-07/F6-B01: filtros del panel consolidado. Todos opcionales — sin
// filtros, el endpoint devuelve todas las organizaciones visibles para el
// usuario (ya recortadas por AssessmentAccessScopeService si es evaluador).
export class DashboardFilterDto {
  @IsOptional()
  @IsIn(['ORGANIZATIONAL', 'CAPACITY', 'RISK'])
  tool?: 'ORGANIZATIONAL' | 'CAPACITY' | 'RISK';

  @IsOptional()
  @IsIn(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  region?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
