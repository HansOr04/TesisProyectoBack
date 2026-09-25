import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ASSESSMENT_ROLE_CODES } from '../../../assessment-core/domain/assessment.constants';

export class CreateOrganisationUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(120)
  name: string;

  // Opcional: sin contraseña el usuario solo podrá entrar por OAuth.
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsIn(ASSESSMENT_ROLE_CODES)
  roleCode?: (typeof ASSESSMENT_ROLE_CODES)[number];

  // Solo un superadmin puede otorgarlo.
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;
}

export class UpdateOrganisationUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;

  // Rol de evaluación dentro de la organización; null = sin rol.
  @IsOptional()
  @IsIn([...ASSESSMENT_ROLE_CODES, null])
  roleCode?: (typeof ASSESSMENT_ROLE_CODES)[number] | null;
}
