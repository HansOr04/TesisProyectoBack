import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

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
