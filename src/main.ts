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
import { StructuredLoggerService } from './shared/infrastructure/logging/structured-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const config = app.get(ConfigService);

  // Heroku atiende detrás de un enrutador que agrega X-Forwarded-For. Sin
  // confiar en ese primer salto, req.ip era la del enrutador y los límites por
  // IP (300 peticiones y 10 inicios de sesión por minuto) se compartían entre
  // todos los usuarios de la plataforma: un taller podía quedarse sin poder
  // iniciar sesión.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN')?.split(',') ?? '*',
    credentials: true,
    // Sin esto el navegador repite el preflight OPTIONS antes de cada
    // PUT/POST, un viaje de red extra por guardado. 7200 s es el tope de Chrome.
    maxAge: 7200,
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
