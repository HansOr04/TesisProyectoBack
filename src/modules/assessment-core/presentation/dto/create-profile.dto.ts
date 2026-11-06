import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';
import { isValidContactPhone } from '../../domain/contact-phone';

export const CONTACT_PHONE_MESSAGE =
  'contactPhone must be "+<dial code> <national number>" with the digits of that country (e.g. 9 for Ecuador, 10 for Colombia)';

// Prefijo de país + número nacional con los dígitos de ese país, igual al
// formato que arma el asistente del frontend (`+<dialCode> <número>`).
export function IsContactPhone(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isContactPhone',
      validator: {
        validate: isValidContactPhone,
        defaultMessage: () => CONTACT_PHONE_MESSAGE,
      },
    },
    options,
  );
}

export const ASSESSMENT_PROFILE_TYPES = ['ASSOCIATION', 'COMPANY'] as const;
export type AssessmentProfileType = (typeof ASSESSMENT_PROFILE_TYPES)[number];

export const ASSESSMENT_ASSOCIATION_LEVELS = ['LEVEL_1', 'LEVEL_2'] as const;
export type AssessmentAssociationLevel =
  (typeof ASSESSMENT_ASSOCIATION_LEVELS)[number];

export class CreateAssessmentProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @IsString()
  @IsIn(ASSESSMENT_PROFILE_TYPES)
  @MaxLength(255)
  type: AssessmentProfileType;

  // Solo aplica cuando type = "ASSOCIATION"
  @IsOptional()
  @IsIn(ASSESSMENT_ASSOCIATION_LEVELS)
  associationLevel?: AssessmentAssociationLevel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  region?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  yearStarted?: number;

  @IsInt()
  @Min(1)
  memberCount: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  mainActivity?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mainProduct: string;

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
  @IsContactPhone()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  evaluatorId?: string;

  // Excluye este perfil de la vista cross-organización del Administrador (RF-08)
  @IsOptional()
  @IsBoolean()
  confidential?: boolean;

  // Solo aplica si el perfil padre es type="ASSOCIATION" y associationLevel="LEVEL_2"
  @IsOptional()
  @IsString()
  @MaxLength(64)
  parentProfileId?: string;
}
