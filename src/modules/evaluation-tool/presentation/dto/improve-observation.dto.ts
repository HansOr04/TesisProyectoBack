import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

// El KPI puede no estar guardado todavía (el usuario está calificando en el
// wizard) — la calificación y observación viajan en el body en vez de leerse
// de la respuesta persistida, para que "Mejorar redacción" funcione sobre el
// borrador sin exigir un guardado previo.
export class ImproveObservationDto {
  @IsInt()
  @Min(1)
  @Max(10)
  score: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  observation: string;
}
