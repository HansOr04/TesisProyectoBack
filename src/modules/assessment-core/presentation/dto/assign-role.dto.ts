import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import {
  ASSESSMENT_ROLE_CODES,
  AssessmentRoleCode,
} from '../../domain/assessment.constants';

export { ASSESSMENT_ROLE_CODES, AssessmentRoleCode };

export class AssignAssessmentRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId: string;

  @IsString()
  @IsIn(ASSESSMENT_ROLE_CODES)
  @MaxLength(255)
  roleCode: AssessmentRoleCode;
}
