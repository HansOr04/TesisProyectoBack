import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
