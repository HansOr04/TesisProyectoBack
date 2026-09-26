import { Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { OrganisationManagementService } from './application/organisation-management.service';
import { OrganisationManagementController } from './presentation/organisation-management.controller';
import { RefreshTokenService } from './application/refresh-token.service';
import { AuthService } from './application/auth.service';
import { AuthorizationService } from './application/authorization.service';
import { RequestContextService } from './application/request-context.service';
import { OAUTH_VERIFIER, PASSWORD_HASHER, TOKEN_ISSUER } from './domain/ports';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';
import { GoogleOAuthVerifier } from './infrastructure/google-oauth-verifier';
import { JwtTokenIssuer } from './infrastructure/jwt-token-issuer';
import { AuthController } from './presentation/auth.controller';
import { UserManagementController } from './presentation/user-management.controller';
import { UserManagementService } from './application/user-management.service';
import { AssessmentCoreModule } from '../assessment-core/assessment-core.module';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';

// Global: RequestContextService y AuthorizationService los usan todos los
// módulos Assessment, igual que el guard JWT que se registra como APP_GUARD.
@Global()
@Module({
  imports: [
    forwardRef(() => AssessmentCoreModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '12h',
        },
      }),
    }),
  ],
  controllers: [
    AuthController,
    UserManagementController,
    OrganisationManagementController,
  ],
  providers: [
    AuthService,
    OrganisationManagementService,
    RefreshTokenService,
    UserManagementService,
    AuthorizationService,
    RequestContextService,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    { provide: OAUTH_VERIFIER, useClass: GoogleOAuthVerifier },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [
    AuthService,
    RefreshTokenService,
    AuthorizationService,
    RequestContextService,
    TOKEN_ISSUER,
    PASSWORD_HASHER,
  ],
})
export class IdentityModule {}
