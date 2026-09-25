import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

jest.setTimeout(60 * 1000);

// Requiere la BD de docker-compose migrada y sembrada (npm run bootstrap).
// Los endpoints deben responder con estructura válida aunque no haya datos demo.
const ORG = process.env.SEED_ORGANISATION_ID || 'demo';
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@evaluacion.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};

describe('Assessment analytics (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  const api = () => request(app.getHttpServer());
  const base = `/${ORG}/assessments/analytics`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    const res = await api().post('/auth/login').send(ADMIN).expect(200);
    adminToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await api().get(`${base}/overview`).expect(401);
  });

  it('returns the overview with per-tool statistics', async () => {
    const res = await api()
      .get(`${base}/overview`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('perTool');
    expect(Array.isArray(res.body.perTool)).toBe(true);
    for (const tool of res.body.perTool) {
      expect(tool).toHaveProperty('tool');
      expect(tool).toHaveProperty('evaluatedOrganisations');
    }
  });

  it('returns gaps, correlations, segments, effectiveness and clusters', async () => {
    for (const path of [
      'gaps?tool=ORGANIZATIONAL',
      'correlations',
      'segments',
      'effectiveness',
      'clusters?tool=RISK&k=3',
    ]) {
      const res = await api()
        .get(`${base}/${path}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toBeDefined();
      expect(typeof res.body).toBe('object');
    }
  });

  it('validates query parameters', async () => {
    await api()
      .get(`${base}/gaps?tool=PURPLE`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    await api()
      .get(`${base}/clusters?tool=RISK&k=99`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    await api()
      .get(`${base}/clusters`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('returns 404 for a benchmark of an unknown profile', async () => {
    await api()
      .get(`${base}/benchmark/no-such-profile`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
