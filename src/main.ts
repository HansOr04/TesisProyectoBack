import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/infrastructure/http/all-exceptions.filter';
import { StructuredLoggerService } from './shared/infrastructure/logging/structured-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN')?.split(',') ?? '*',
    credentials: true,
  });
  app.useGlobalFilters(
    new AllExceptionsFilter(await app.resolve(StructuredLoggerService)),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Socket.IO para AssessmentSessionGateway (NestFactory no lo enlaza solo)
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();

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

  const port = config.get<number>('PORT') ?? 3100;
  await app.listen(port);
  const logger = await app.resolve(StructuredLoggerService);
  logger.setContext({ service: 'Bootstrap' });
  logger.info(`API listening on http://localhost:${port} (docs: /api/docs)`);
}

void bootstrap();
