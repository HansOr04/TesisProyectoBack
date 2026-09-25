import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// RF-05: calificación entera 1..10 + observación obligatoria por KPI (misma regla
// transversal que Organizativa/Capacidades), más la descripción de riesgo obligatoria y el tipo de
// riesgo opcional que exige la Herramienta de Riesgos (doc 03 §4: "igual que Organizational más
// riskDescription (obligatoria) y riskType"). El servicio clasifica el riesgo y
// upserta AssessmentRisk a partir de estos dos campos — no se persisten en AssessmentResponse.
export class KpiResponseRiskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  indicatorId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  score: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  observation: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  riskDescription: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  riskType?: string;
}

export class ScoreKpiRiskDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => KpiResponseRiskDto)
  responses: KpiResponseRiskDto[];
}
