import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './modules/audit/audit.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AssessmentAiModule } from './modules/assessment-ai/assessment-ai.module';
import { OrganizationalToolModule } from './modules/organizational-tool/organizational-tool.module';
import { AssessmentCoreModule } from './modules/assessment-core/assessment-core.module';
import { AssessmentSessionModule } from './modules/assessment-session/assessment-session.module';
import { validateEnv } from './shared/infrastructure/config/env.validation';
import { PrismaModule } from './shared/infrastructure/database/prisma.module';
import { RequestIdMiddleware } from './shared/infrastructure/http/request-id.middleware';
import { LoggerModule } from './shared/infrastructure/logging/logger.module';
import { HealthController } from './shared/infrastructure/http/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Límite global generoso; los endpoints de IA aplican su propio límite
    // por usuario (AssessmentAiThrottlerGuard, 10/min).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    LoggerModule,
    AuditModule,
    IdentityModule,
    AssessmentSessionModule,
    AssessmentAiModule,
    AssessmentCoreModule,
    OrganizationalToolModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
