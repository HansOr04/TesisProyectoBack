import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganisationDto {
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

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  adminName?: string;

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
