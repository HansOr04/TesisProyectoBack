import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV = 'development';

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? 3100 : Number(value),
  )
  @IsInt()
  PORT = 3100;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN = '24h';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS = 7;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  ACTIVITY_LOG_RETENTION_MONTHS = 24;

  @IsOptional()
  @IsString()
  CORS_ORIGIN = '*';

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_ID?: string;

  @IsOptional()
  @IsIn(['gemini', 'nvidia'])
  AI_PROVIDER = 'gemini';
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (validated.NODE_ENV === 'production') {
    const secret = validated.JWT_SECRET ?? '';
    if (secret.length < 32 || secret.includes('cambia-este-secreto')) {
      throw new Error(
        'JWT_SECRET debe tener al menos 32 caracteres aleatorios en producción (p. ej. `openssl rand -base64 48`).',
      );
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `Configuración inválida:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }
  return validated;
}
