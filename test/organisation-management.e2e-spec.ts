import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';

jest.setTimeout(120 * 1000);

// Requiere la BD de docker-compose migrada y sembrada (npm run bootstrap).
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@evaluacion.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};
const EVALUATOR = {
  email: process.env.SEED_EVALUATOR_EMAIL || 'evaluador@evaluacion.local',
  password: process.env.SEED_EVALUATOR_PASSWORD || 'evaluador123',
};

describe('Organisation management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let evaluatorToken: string;
  const api = () => request(app.getHttpServer());
  const orgId = `e2e-org-${Date.now().toString(36)}`;

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
    adminToken = (await api().post('/auth/login').send(ADMIN)).body.accessToken;
    evaluatorToken = (await api().post('/auth/login').send(EVALUATOR)).body
      .accessToken;
  });

  afterAll(async () => {
    // Orden inverso a las dependencias; la organización de prueba se queda sin rastro.
    const evaluations = await prisma.assessmentEvaluation.findMany({
      where: { organisation: orgId },
      select: { id: true },
    });
    const evaluationIds = evaluations.map((e) => e.id);
    await prisma.assessmentIndicatorMeasure.deleteMany({
      where: { organisation: orgId },
    });
    await prisma.assessmentResponse.deleteMany({
      where: { evaluationId: { in: evaluationIds } },
    });
    await prisma.assessmentEvaluation.deleteMany({
      where: { organisation: orgId },
    });
    await prisma.assessmentOrganisationProfile.deleteMany({
      where: { organisation: orgId },
    });
    await prisma.assessmentTemplate.deleteMany({
      where: { organisation: orgId },
    });
    await prisma.assessmentRiskCountryParam.deleteMany({
      where: { organisation: orgId },
    });
    await prisma.authUserRole.deleteMany({ where: { organisation: orgId } });
    await prisma.activityLog.deleteMany({ where: { organisation: orgId } });
    await prisma.organisationMember.deleteMany({
      where: { organisationId: orgId },
    });
    await prisma.organisation.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  it('denies organisation management to non-superadmins', async () => {
    await api()
      .get('/organisations')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .expect(403);
    await api()
      .post('/organisations')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({ id: 'no-deberia', name: 'No debería crearse' })
      .expect(403);
    await api().get('/organisations').expect(401);
  });

  it('creates an organisation ready to use: templates, KPI and administrator', async () => {
    const res = await api()
      .post('/organisations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id: orgId, name: 'Organización E2E' })
      .expect(201);

    expect(res.body.organisation).toMatchObject({
      id: orgId,
      name: 'Organización E2E',
      templates: 3,
    });
    // Las tres herramientas quedan sembradas con sus KPI reales.
    const byTool = Object.fromEntries(
      res.body.templates.map((t: { tool: string; indicators: number }) => [
        t.tool,
        t.indicators,
      ]),
    );
    expect(byTool).toEqual({ ORGANIZATIONAL: 73, CAPACITY: 30, RISK: 46 });
    expect(res.body.admin.email).toBe(ADMIN.email);

    // El administrador puede operar de inmediato en la organización nueva.
    const profile = await api()
      .post(`/${orgId}/assessments/profiles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Perfil E2E',
        type: 'ASSOCIATION',
        country: 'EC',
        mainProduct: 'cacao',
        memberCount: 25,
      })
      .expect(201);
    const evaluation = await api()
      .post(`/${orgId}/assessments/organizational/evaluations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ profileId: profile.body.id })
      .expect(201);
    expect(evaluation.body.status).toBe('DRAFT');
    expect(
      evaluation.body.template.sections.reduce(
        (sum: number, s: { indicators: unknown[] }) =>
          sum + s.indicators.length,
        0,
      ),
    ).toBe(73);
  });

  it('rejects invalid, reserved and duplicated identifiers', async () => {
    const cases: [string, number][] = [
      ['MAYUSCULAS', 400],
      ['con espacio', 400],
      ['-guion-inicial', 400],
      ['ab', 400],
      ['auth', 400],
      [orgId, 409],
    ];
    for (const [id, status] of cases) {
      await api()
        .post('/organisations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id, name: 'Nombre válido' })
        .expect(status);
    }
  });

  it('renames an organisation and records the change in the audit log', async () => {
    await api()
      .patch(`/organisations/${orgId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nombre Corregido' })
      .expect(200)
      .expect((res) => expect(res.body.name).toBe('Nombre Corregido'));

    const logs = await api()
      .get(`/${orgId}/activity-logs?type=organisation.update&limit=5`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(logs.body.total).toBeGreaterThanOrEqual(1);
  });

  it('re-applies the base templates without duplicating anything', async () => {
    const before = await api()
      .get('/organisations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const templatesBefore = before.body.find(
      (o: { id: string }) => o.id === orgId,
    ).templates;

    await api()
      .post(`/organisations/${orgId}/provision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const after = await api()
      .get('/organisations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      after.body.find((o: { id: string }) => o.id === orgId).templates,
    ).toBe(templatesBefore);
  });
});
