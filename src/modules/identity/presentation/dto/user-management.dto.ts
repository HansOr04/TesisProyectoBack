import {
  ArrayMaxSize,
  IsArray,
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

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsIn(ASSESSMENT_ROLE_CODES)
  roleCode?: (typeof ASSESSMENT_ROLE_CODES)[number];

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

  @IsOptional()
  @IsIn([...ASSESSMENT_ROLE_CODES, null])
  roleCode?: (typeof ASSESSMENT_ROLE_CODES)[number] | null;
}

export class ViewerVisibilityDto {
  @IsBoolean()
  allProfiles: boolean;

  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  profileIds: string[];
}
