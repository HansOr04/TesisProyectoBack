import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ExportPptxDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  narrative?: string;
}
