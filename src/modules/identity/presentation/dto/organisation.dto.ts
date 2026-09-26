import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganisationDto {
  /** Identificador en las URLs (`/:org/assessments/...`). No se puede cambiar después. */
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/, {
    message:
      'Solo minúsculas, números y guiones; no puede empezar ni terminar en guion.',
  })
  id: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  /** Si se omite, el superadministrador que la crea queda como administrador. */
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  adminName?: string;

  /** Obligatoria solo si el correo no corresponde a un usuario existente. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  adminPassword?: string;
}

export class UpdateOrganisationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;
}
