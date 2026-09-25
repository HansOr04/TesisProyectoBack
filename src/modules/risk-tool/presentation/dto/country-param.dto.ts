import { IsNumber, IsString, Length, Matches, Max, Min } from 'class-validator';

// Umbral de despreciabilidad por país (score > umbral ⇒ riesgo despreciable).
export class UpsertRiskCountryParamDto {
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Za-z]+$/)
  country: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  riskThreshold: number;
}
