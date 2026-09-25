import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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

describe('Admin configuration: country risk params + activity logs (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let evaluatorToken: string;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    adminToken = (await api().post('/auth/login').send(ADMIN)).body.accessToken;
    evaluatorToken = (await api().post('/auth/login').send(EVALUATOR)).body
      .accessToken;
  });

  afterAll(async () => {
    await api()
      .delete(`/${ORG}/assessments/risk/country-params/ZZ`)
      .set('Authorization', `Bearer ${adminToken}`);
    await app.close();
  });

  it('lets an admin configure the risk threshold per country and audits it', async () => {
    await api()
      .put(`/${ORG}/assessments/risk/country-params`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ country: 'zz', riskThreshold: 6.5 })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ country: 'ZZ', riskThreshold: 6.5 });
      });
    const list = await api()
      .get(`/${ORG}/assessments/risk/country-params`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.some((p: { country: string }) => p.country === 'ZZ')).toBe(
      true,
    );

    const logs = await api()
      .get(
        `/${ORG}/activity-logs?type=assessment-risk.country-params-update&limit=5`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(logs.body.total).toBeGreaterThanOrEqual(1);
    expect(logs.body.items[0]).toMatchObject({
      type: 'assessment-risk.country-params-update',
      createdBy: { email: ADMIN.email },
    });
  });

  it('rejects invalid thresholds and denies evaluators', async () => {
    await api()
      .put(`/${ORG}/assessments/risk/country-params`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ country: 'ZZ', riskThreshold: 42 })
      .expect(400);
    await api()
      .put(`/${ORG}/assessments/risk/country-params`)
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({ country: 'ZZ', riskThreshold: 5 })
      .expect(403);
    await api()
      .get(`/${ORG}/activity-logs`)
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .expect(403);
  });

  it('paginates the activity log', async () => {
    const res = await api()
      .get(`/${ORG}/activity-logs?page=1&limit=2`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.items.length).toBeLessThanOrEqual(2);
    expect(res.body).toMatchObject({ page: 1, limit: 2 });
    expect(res.body.pages).toBeGreaterThanOrEqual(1);
  });
});
