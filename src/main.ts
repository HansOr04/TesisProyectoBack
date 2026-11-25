import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/infrastructure/http/all-exceptions.filter';
import { ServerErrorMonitor } from './shared/infrastructure/logging/server-error-monitor.service';
import { StructuredLoggerService } from './shared/infrastructure/logging/structured-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const config = app.get(ConfigService);

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN')?.split(',') ?? '*',
    credentials: true,
    maxAge: 7200,
  });
  app.useGlobalFilters(
    new AllExceptionsFilter(
      await app.resolve(StructuredLoggerService),
      app.get(ServerErrorMonitor),
    ),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();

  const swaggerEnabled =
    config.get('NODE_ENV') !== 'production' ||
    config.get('SWAGGER_ENABLED') === 'true';
  if (swaggerEnabled) setupSwagger(app);

  const port = config.get<number>('PORT') ?? 3100;
  await app.listen(port);
  const logger = await app.resolve(StructuredLoggerService);
  logger.setContext({ service: 'Bootstrap' });
  logger.info(
    `API listening on http://localhost:${port}${swaggerEnabled ? ' (docs: /api/docs)' : ''}`,
  );
}

function setupSwagger(app: NestExpressApplication): void {
  const swagger = new DocumentBuilder()
    .setTitle('Assessment API')
    .setDescription(
      'Herramientas Organizational (fortalecimiento organizativo), Capacity (capacidades) y Risk (gestión de riesgos).',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swagger),
  );
}

void bootstrap();
