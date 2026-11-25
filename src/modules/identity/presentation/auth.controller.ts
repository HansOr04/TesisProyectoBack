import { ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  ExecutionContext,
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
import { createHash } from 'crypto';
import { CookieOptions, Request, Response } from 'express';
import { AuthService, AuthenticatedSession } from '../application/auth.service';
import { RequestContextService } from '../application/request-context.service';
import { AuthorizationService } from '../application/authorization.service';
import { Public, RequireAuthenticated } from './decorators/auth.decorators';
import { AUTH_LIMIT_PER_IP, IP_THROTTLER } from './guards/ip-throttler';
import { LoginDto, OAuthLoginDto } from './dto/login.dto';

export const REFRESH_COOKIE = 'assessment_refresh';
// Solo se envía a /auth/*: el resto de la API nunca ve la cookie.
const REFRESH_COOKIE_PATH = '/auth';

// La web llega a /auth a través de Vercel (cookie propia, HU-71): varias
// personas comparten la IP, así que el inicio de sesión cuenta por correo y la
// renovación por sesión. El tope por IP de abajo frena a quien prueba muchas
// cuentas y deja entrar a la vez a todo un taller (HU-68).
const LOGIN_LIMIT_PER_ACCOUNT = 10;
const LOGIN_LIMIT_PER_IP = 120;
const REFRESH_LIMIT_PER_SESSION = 30;
const MINUTE = 60000;

const loginTracker = (req: Record<string, any>): string => {
  const email = req.body?.email;
  return typeof email === 'string'
    ? `login:${req.ip}:${email.trim().toLowerCase().slice(0, 255)}`
    : `login:${req.ip}`;
};

const refreshTracker = (req: Record<string, any>): string => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  return typeof raw === 'string'
    ? `refresh:${createHash('sha256').update(raw).digest('hex')}`
    : `refresh:${req.ip}`;
};

// Sin cookie no hay sesión que renovar (cada visita a la web pasa por aquí) y
// ni siquiera se consulta la base: queda solo el tope por IP.
const refreshLimit = (context: ExecutionContext): number =>
  context.switchToHttp().getRequest().cookies?.[REFRESH_COOKIE]
    ? REFRESH_LIMIT_PER_SESSION
    : AUTH_LIMIT_PER_IP;

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
  // En producción la web llama a /auth en su propio dominio (Vercel lo reenvía
  // aquí): la cookie es propia y los navegadores que bloquean las de terceros
  // la aceptan. SameSite=None cubre a quien todavía llame directo a Heroku.
  private get cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: this.secureCookies ? 'none' : 'lax',
      path: REFRESH_COOKIE_PATH,
    };
  }

  private issue(res: Response, session: AuthenticatedSession) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.cookieOptions,
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
  @Throttle({
    default: {
      limit: LOGIN_LIMIT_PER_ACCOUNT,
      ttl: MINUTE,
      getTracker: loginTracker,
    },
    [IP_THROTTLER]: { limit: LOGIN_LIMIT_PER_IP, ttl: MINUTE },
  })
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
  @Throttle({ default: { limit: LOGIN_LIMIT_PER_IP, ttl: MINUTE } })
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
  @Throttle({
    default: { limit: refreshLimit, ttl: MINUTE, getTracker: refreshTracker },
  })
  async refresh(
    @Req() req: Request,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = this.readRefreshCookie(req);
    if (!raw) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions);
      return { accessToken: null, user: null };
    }
    try {
      const session = await this.authService.refresh(raw, userAgent);
      return this.issue(res, session);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions);
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
