import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

// El administrador define la estructura de una sección de la plantilla (número,
// nombre, descripción, peso). El peso pondera la sección en el puntaje global.
export class CreateAssessmentSectionDto {
  @IsInt()
  @Min(1)
  number: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}
