import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { createHash } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';

jest.setTimeout(60 * 1000);

// Requiere la BD de docker-compose migrada y sembrada (npm run bootstrap).
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@evaluacion.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};
const COOKIE = 'assessment_refresh';

function refreshCookie(res: request.Response): string | undefined {
  const header = res.headers['set-cookie'] as string[] | string | undefined;
  const list = Array.isArray(header) ? header : header ? [header] : [];
  return list.find((c) => c.startsWith(`${COOKIE}=`));
}

const hashOf = (cookie: string) =>
  createHash('sha256')
    .update(cookie.slice(`${COOKIE}=`.length).split(';')[0])
    .digest('hex');

describe('Auth session: refresh token rotation (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login sets an HttpOnly refresh cookie scoped to /auth and returns a short access token', async () => {
    const res = await api().post('/auth/login').send(ADMIN).expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toBeUndefined();
    const cookie = refreshCookie(res) as string;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/auth');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('refresh rotates the cookie, and reusing the old one later revokes the family', async () => {
    const login = await api().post('/auth/login').send(ADMIN).expect(200);
    const first = refreshCookie(login) as string;

    const refreshed = await api()
      .post('/auth/refresh')
      .set('Cookie', first)
      .expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.user.email).toBe(ADMIN.email);
    const second = refreshCookie(refreshed) as string;
    expect(second).not.toBe(first);

    // El token nuevo sirve para la API.
    await api()
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);

    // Pasado el margen de pestañas simultáneas, reusar el token ya rotado →
    // 401 y toda la familia queda revocada.
    await app.get(PrismaService).refreshToken.update({
      where: { tokenHash: hashOf(first) },
      data: { revokedAt: new Date(Date.now() - 60 * 1000) },
    });
    await api().post('/auth/refresh').set('Cookie', first).expect(401);
    await api().post('/auth/refresh').set('Cookie', second).expect(401);
  });

  // HU-71, CA-71.1: las dos pestañas mandan la misma cookie.
  it('two tabs refreshing at the same time both keep the session', async () => {
    const login = await api().post('/auth/login').send(ADMIN).expect(200);
    const shared = refreshCookie(login) as string;

    const tabs = await Promise.all(
      [1, 2, 3].map(() =>
        api().post('/auth/refresh').set('Cookie', shared).expect(200),
      ),
    );
    const cookies = tabs.map((t) => refreshCookie(t) as string);
    expect(new Set(cookies).size).toBe(3);

    // Cada pestaña sigue renovando con la cookie que le quedó.
    for (const cookie of cookies) {
      await api().post('/auth/refresh').set('Cookie', cookie).expect(200);
    }
  });

  it('logout closes the session for every tab, even within the grace period', async () => {
    const login = await api().post('/auth/login').send(ADMIN).expect(200);
    const first = refreshCookie(login) as string;
    const refreshed = await api()
      .post('/auth/refresh')
      .set('Cookie', first)
      .expect(200);
    const second = refreshCookie(refreshed) as string;

    await api().post('/auth/logout').set('Cookie', second).expect(200);
    await api().post('/auth/refresh').set('Cookie', first).expect(401);
    await api().post('/auth/refresh').set('Cookie', second).expect(401);
  });

  // HU-71, CA-71.2: más de 24 h de trabajo. El token de acceso ya venció y la
  // sesión se renueva con la cookie, sin pedir la contraseña.
  it('renews without the password after more than 24 hours', async () => {
    const login = await api().post('/auth/login').send(ADMIN).expect(200);
    const cookie = refreshCookie(login) as string;
    const prisma = app.get(PrismaService);
    const stored = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashOf(cookie) },
    });
    const day = 24 * 60 * 60 * 1000;
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        createdAt: new Date(stored.createdAt.getTime() - 1.25 * day),
        expiresAt: new Date(stored.expiresAt.getTime() - 1.25 * day),
      },
    });

    const renewed = await api()
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);
    expect(renewed.body.user.email).toBe(ADMIN.email);
  });

  it('limits password attempts per account without blocking other accounts', async () => {
    const email = `fuerza-bruta-${Date.now()}@example.invalid`;
    const attempt = (e: string) =>
      api().post('/auth/login').send({ email: e, password: 'incorrecta-123' });
    for (let i = 0; i < 10; i++) await attempt(email).expect(401);
    await attempt(email).expect(429);
    // Otra persona detrás de la misma IP puede entrar.
    await attempt(`otra-${email}`).expect(401);
  });

  it('refresh without cookie answers an anonymous session; logout revokes it', async () => {
    const anon = await api().post('/auth/refresh').expect(200);
    expect(anon.body).toEqual({ accessToken: null, user: null });

    const login = await api().post('/auth/login').send(ADMIN).expect(200);
    const cookie = refreshCookie(login) as string;
    await api().post('/auth/logout').set('Cookie', cookie).expect(200);
    await api().post('/auth/refresh').set('Cookie', cookie).expect(401);
  });
});
