import { ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService, AuthenticatedSession } from '../application/auth.service';
import { RequestContextService } from '../application/request-context.service';
import { AuthorizationService } from '../application/authorization.service';
import { Public, RequireAuthenticated } from './decorators/auth.decorators';
import { LoginDto, OAuthLoginDto } from './dto/login.dto';

export const REFRESH_COOKIE = 'assessment_refresh';
// Solo se envía a /auth/*: el resto de la API nunca ve la cookie.
const REFRESH_COOKIE_PATH = '/auth';

@ApiTags('Autenticación')
@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly authorizationService: AuthorizationService,
    private readonly requestContext: RequestContextService,
    config: ConfigService,
  ) {
    this.secureCookies = config.get('NODE_ENV') === 'production';
  }

  // El refresh token viaja en cookie HttpOnly (inaccesible desde JS) y el
  // token de acceso, corto, en el cuerpo — el frontend lo guarda en memoria.
  private issue(res: Response, session: AuthenticatedSession) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      expires: session.refreshExpiresAt,
    });
    return { accessToken: session.accessToken, user: session.user };
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> })
      .cookies;
    return cookies?.[REFRESH_COOKIE];
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.loginWithPassword(
      dto.email,
      dto.password,
      userAgent,
    );
    return this.issue(res, session);
  }

  @Post('google')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async loginWithGoogle(
    @Body() dto: OAuthLoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.loginWithOAuth(
      dto.idToken,
      userAgent,
    );
    return this.issue(res, session);
  }

  // Renueva el token de acceso rotando el refresh token de la cookie.
  @Post('refresh')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async refresh(
    @Req() req: Request,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = this.readRefreshCookie(req);
    if (!raw) {
      res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
      return { accessToken: null, user: null };
    }
    try {
      const session = await this.authService.refresh(raw, userAgent);
      return this.issue(res, session);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { success: true };
  }

  @Get('providers')
  @Public()
  providers() {
    return { password: true, oauth: this.authService.oauthProviders() };
  }

  // Perfil + roles Assessment por organización, para que el frontend sepa qué
  // menús mostrar sin adivinar.
  @Get('me')
  @RequireAuthenticated()
  async me() {
    const user = await this.requestContext.requireCurrentUser();
    const organisations = this.requestContext.getCurrentUserOrganisations();
    const roles = await Promise.all(
      organisations.map(async (organisation) => ({
        organisation,
        roles: (
          await this.authorizationService.getUserRoles(organisation, user.id)
        ).map((r) => r.role.code),
      })),
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      organisations: roles,
    };
  }
}
