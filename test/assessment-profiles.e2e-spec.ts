import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';

jest.setTimeout(60 * 1000);

// Requiere la BD de docker-compose migrada y sembrada (npm run bootstrap).
// Usa las cuentas del seed: admin (superadmin + assessment_admin) y evaluador
// (assessment_evaluator, sin perfiles asignados).
const ORG = process.env.SEED_ORGANISATION_ID || 'demo';
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@evaluacion.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};
const EVALUATOR = {
  email: process.env.SEED_EVALUATOR_EMAIL || 'evaluador@evaluacion.local',
  password: process.env.SEED_EVALUATOR_PASSWORD || 'evaluador123',
};

describe('Assessment profiles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let evaluatorToken: string;
  const createdProfileIds: string[] = [];

  async function login(credentials: { email: string; password: string }) {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);
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
  });

  afterAll(async () => {
    if (createdProfileIds.length > 0) {
      await prisma.assessmentEvaluation.deleteMany({
        where: { profileId: { in: createdProfileIds } },
      });
      await prisma.assessmentOrganisationProfile.deleteMany({
        where: { id: { in: createdProfileIds } },
      });
    }
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .get(`/${ORG}/assessments/profiles`)
      .expect(401);
  });

  it('rejects an invalid login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN.email, password: 'wrong' })
      .expect(401);
  });

  it('returns the current user with Assessment roles', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.email).toBe(ADMIN.email);
    expect(res.body.organisations).toEqual([
      { organisation: ORG, roles: ['assessment_admin'] },
    ]);
  });

  it('creates, lists, updates and soft-deletes a profile as admin', async () => {
    const name = `E2E Asociación ${Date.now()}`;
    const created = await request(app.getHttpServer())
      .post(`/${ORG}/assessments/profiles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, type: 'ASSOCIATION', country: 'EC', mainProduct: 'cacao' })
      .expect(201);
    createdProfileIds.push(created.body.id);

    const list = await request(app.getHttpServer())
      .get(`/${ORG}/assessments/profiles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.map((p: { id: string }) => p.id)).toContain(
      created.body.id,
    );

    const updated = await request(app.getHttpServer())
      .patch(`/${ORG}/assessments/profiles/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ region: 'Esmeraldas' })
      .expect(200);
    expect(updated.body.region).toBe('Esmeraldas');

    await request(app.getHttpServer())
      .delete(`/${ORG}/assessments/profiles/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/${ORG}/assessments/profiles/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('rejects duplicated profile names within the organisation', async () => {
    const name = `E2E Duplicada ${Date.now()}`;
    const first = await request(app.getHttpServer())
      .post(`/${ORG}/assessments/profiles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, type: 'COMPANY', country: 'EC', mainProduct: 'café' })
      .expect(201);
    createdProfileIds.push(first.body.id);

    await request(app.getHttpServer())
      .post(`/${ORG}/assessments/profiles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, type: 'COMPANY', country: 'EC', mainProduct: 'café' })
      .expect(409);
  });

  it('validates the body (whitelist + forbidNonWhitelisted)', async () => {
    await request(app.getHttpServer())
      .post(`/${ORG}/assessments/profiles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x', type: 'INVALID', country: 'EC', mainProduct: 'cacao' })
      .expect(400);
  });

  it('scopes an evaluator to the profiles assigned to them', async () => {
    const own = await request(app.getHttpServer())
      .get(`/${ORG}/assessments/profiles`)
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .expect(200);
    const admin = await request(app.getHttpServer())
      .get(`/${ORG}/assessments/profiles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(own.body.length).toBeLessThanOrEqual(admin.body.length);
    expect(
      own.body.every(
        (p: { evaluatorId: string | null }) => p.evaluatorId !== null,
      ),
    ).toBe(true);
  });

  it('denies delete to an evaluator (needs assessment-core:delete)', async () => {
    await request(app.getHttpServer())
      .delete(`/${ORG}/assessments/profiles/does-not-matter`)
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .expect(403);
  });

  it('denies the superadmin-only route to a regular user', async () => {
    await request(app.getHttpServer())
      .get('/assessments/admin/all-profiles')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/assessments/admin/all-profiles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('denies access to an organisation the user does not belong to', async () => {
    await request(app.getHttpServer())
      .get('/otra-org/assessments/profiles')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .expect(403);
  });
});
