import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';

jest.setTimeout(60 * 1000);

// Requiere la BD de docker-compose migrada y sembrada (npm run bootstrap).
const ORG = process.env.SEED_ORGANISATION_ID || 'demo';
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@evaluacion.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};
const EVALUATOR = {
  email: process.env.SEED_EVALUATOR_EMAIL || 'evaluador@evaluacion.local',
  password: process.env.SEED_EVALUATOR_PASSWORD || 'evaluador123',
};

describe('User management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let evaluatorToken: string;
  const createdEmails: string[] = [];
  const suffix = Date.now().toString(36);

  const api = () => request(app.getHttpServer());

  async function login(credentials: { email: string; password: string }) {
    const res = await api().post('/auth/login').send(credentials).expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    adminToken = await login(ADMIN);
    evaluatorToken = await login(EVALUATOR);
    const me = await api()
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    adminId = me.body.id;
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      const users = await prisma.user.findMany({
        where: { email: { in: createdEmails } },
        select: { id: true },
      });
      const ids = users.map((u) => u.id);
      await prisma.authUserRole.deleteMany({ where: { userId: { in: ids } } });
      await prisma.organisationMember.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.activityLog.deleteMany({
        where: { createdById: { in: ids } },
      });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  it('denies user management to an evaluator', async () => {
    await api()
      .get(`/${ORG}/users`)
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .expect(403);
    await api()
      .post(`/${ORG}/users`)
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({
        email: `x-${suffix}@test.local`,
        name: 'X',
        password: 'secret123',
      })
      .expect(403);
  });

  it('creates a user with a role, lists it and lets it log in', async () => {
    const email = `nuevo-${suffix}@test.local`;
    createdEmails.push(email);
    const created = await api()
      .post(`/${ORG}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email,
        name: 'Usuario Nuevo',
        password: 'secret123',
        roleCode: 'assessment_evaluator',
      })
      .expect(201);
    expect(created.body.email).toBe(email);
    expect(created.body.roles.map((r: { code: string }) => r.code)).toEqual([
      'assessment_evaluator',
    ]);
    expect(created.body.passwordHash).toBeUndefined();

    const list = await api()
      .get(`/${ORG}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.some((u: { email: string }) => u.email === email)).toBe(
      true,
    );

    const paged = await api()
      .get(`/${ORG}/users?page=1&limit=1`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.total).toBeGreaterThanOrEqual(3);
    expect(paged.body.pages).toBeGreaterThanOrEqual(3);

    await login({ email, password: 'secret123' });
  });

  it('rejects a duplicated email in the same organisation (409)', async () => {
    const email = `nuevo-${suffix}@test.local`;
    await api()
      .post(`/${ORG}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, name: 'Otro', password: 'secret123' })
      .expect(409);
  });

  it('rejects a weak password (400)', async () => {
    await api()
      .post(`/${ORG}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `debil-${suffix}@test.local`, name: 'D', password: '123' })
      .expect(400);
  });

  it('deactivates a user and blocks their token afterwards', async () => {
    const email = `inactivo-${suffix}@test.local`;
    createdEmails.push(email);
    const created = await api()
      .post(`/${ORG}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, name: 'Inactivo', password: 'secret123' })
      .expect(201);
    const token = await login({ email, password: 'secret123' });
    await api()
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await api()
      .patch(`/${ORG}/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);

    // El guard rechaza tokens de cuentas inactivas aunque el JWT siga vigente.
    await api()
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    await api()
      .post('/auth/login')
      .send({ email, password: 'secret123' })
      .expect(401);
  });

  it('prevents an admin from deactivating or removing themselves (409)', async () => {
    await api()
      .patch(`/${ORG}/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(409);
    await api()
      .delete(`/${ORG}/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('removes a member from the organisation', async () => {
    const email = `saliente-${suffix}@test.local`;
    createdEmails.push(email);
    const created = await api()
      .post(`/${ORG}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, name: 'Saliente', password: 'secret123' })
      .expect(201);
    await api()
      .delete(`/${ORG}/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const list = await api()
      .get(`/${ORG}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.some((u: { email: string }) => u.email === email)).toBe(
      false,
    );
  });
});
