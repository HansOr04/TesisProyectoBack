import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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

  it('refresh rotates the cookie, and reusing the old one revokes the family', async () => {
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

    // Reuso del token ya rotado → 401 y toda la familia queda revocada.
    await api().post('/auth/refresh').set('Cookie', first).expect(401);
    await api().post('/auth/refresh').set('Cookie', second).expect(401);
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
