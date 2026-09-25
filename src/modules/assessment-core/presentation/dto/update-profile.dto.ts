import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import {
  ASSESSMENT_ASSOCIATION_LEVELS,
  ASSESSMENT_PROFILE_TYPES,
  AssessmentAssociationLevel,
  AssessmentProfileType,
} from './create-profile.dto';

export class UpdateAssessmentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @IsOptional()
  @IsIn(ASSESSMENT_PROFILE_TYPES)
  type?: AssessmentProfileType;

  @IsOptional()
  @IsIn(ASSESSMENT_ASSOCIATION_LEVELS)
  associationLevel?: AssessmentAssociationLevel;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  region?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  yearStarted?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  memberCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  mainActivity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mainProduct?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  secondaryProducts?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  certifications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  mainMarkets?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalRep?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPhone?: string;

  // `null` limpia explícitamente el evaluador asignado (a diferencia de
  // `undefined`, que Prisma trata como "no tocar este campo").
  @IsOptional()
  @IsString()
  @MaxLength(64)
  evaluatorId?: string | null;

  // Excluye este perfil de la vista cross-organización del Administrador (RF-08)
  @IsOptional()
  @IsBoolean()
  confidential?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  parentProfileId?: string;
}
