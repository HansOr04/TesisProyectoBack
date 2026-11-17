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
const PASSWORD = 'clave-de-prueba-e2e';

// Cada superadministrador administra solo los proyectos que creó; en uno
// ajeno entra como cualquier miembro. El visualizador solo lee y solo las
// organizaciones evaluadas que un administrador le habilitó.
describe('Project ownership and viewers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let otherToken: string;
  const suffix = Date.now().toString(36);
  const otherEmail = `superadmin-${suffix}@e2e.local`;
  const viewerEmail = `viewer-${suffix}@e2e.local`;
  const otherOrg = `e2e-${suffix}`;
  const profileIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const as = (token: string) => ({
    get: (path: string) =>
      api().get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object) =>
      api().post(path).set('Authorization', `Bearer ${token}`).send(body),
    put: (path: string, body: object) =>
      api().put(path).set('Authorization', `Bearer ${token}`).send(body),
    patch: (path: string, body: object) =>
      api().patch(path).set('Authorization', `Bearer ${token}`).send(body),
    delete: (path: string) =>
      api().delete(path).set('Authorization', `Bearer ${token}`),
  });

  async function login(credentials: { email: string; password: string }) {
    const res = await api().post('/auth/login').send(credentials).expect(200);
    return res.body.accessToken as string;
  }

  const profile = (name: string) => ({
    name,
    type: 'COMPANY',
    country: 'EC',
    memberCount: 5,
    mainProduct: 'Cacao',
  });

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

    // Segundo superadministrador, sin ningún proyecto propio todavía.
    const created = await as(adminToken)
      .post(`/${ORG}/users`, {
        email: otherEmail,
        name: 'Otro superadministrador',
        password: PASSWORD,
        isSuperAdmin: true,
      })
      .expect(201);
    await as(adminToken).delete(`/${ORG}/users/${created.body.id}`).expect(200);
    otherToken = await login({ email: otherEmail, password: PASSWORD });

    for (const name of [`Visible ${suffix}`, `Oculta ${suffix}`]) {
      const res = await as(adminToken)
        .post(`/${ORG}/assessments/profiles`, profile(name))
        .expect(201);
      profileIds.push(res.body.id);
    }
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [otherEmail, viewerEmail] } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.assessmentOrganisationProfile.deleteMany({
      where: { id: { in: profileIds } },
    });
    await prisma.assessmentTemplate.deleteMany({
      where: { organisation: otherOrg },
    });
    await prisma.assessmentRiskCountryParam.deleteMany({
      where: { organisation: otherOrg },
    });
    await prisma.authUserRole.deleteMany({
      where: { OR: [{ organisation: otherOrg }, { userId: { in: ids } }] },
    });
    await prisma.activityLog.deleteMany({
      where: {
        OR: [{ organisation: otherOrg }, { createdById: { in: ids } }],
      },
    });
    await prisma.organisationMember.deleteMany({
      where: {
        OR: [{ organisationId: otherOrg }, { userId: { in: ids } }],
      },
    });
    await prisma.organisation.deleteMany({ where: { id: otherOrg } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('lets a superadmin create a project and see only their own projects', async () => {
    await as(otherToken)
      .post('/organisations', { id: otherOrg, name: 'Proyecto e2e' })
      .expect(201);
    const mine = await as(otherToken).get('/organisations').expect(200);
    expect(mine.body.map((o: { id: string }) => o.id)).toEqual([otherOrg]);
    const theirs = await as(adminToken).get('/organisations').expect(200);
    expect(theirs.body.map((o: { id: string }) => o.id)).not.toContain(
      otherOrg,
    );
    // Entra a su proyecto con el mismo token, sin volver a iniciar sesión.
    await as(otherToken).get(`/${otherOrg}/assessments/profiles`).expect(200);
  });

  it('keeps a superadmin out of projects created by someone else', async () => {
    await as(otherToken).get(`/${ORG}/assessments/profiles`).expect(403);
    await as(adminToken).get(`/${otherOrg}/assessments/profiles`).expect(403);
    await as(otherToken)
      .patch(`/organisations/${ORG}`, { name: 'Nombre ajeno' })
      .expect(404);
    await as(otherToken)
      .post(`/organisations/${ORG}/provision`, {})
      .expect(404);
    const all = await as(otherToken)
      .get('/assessments/admin/all-profiles')
      .expect(200);
    expect(
      all.body.every(
        (row: { profile: { organisation: string } }) =>
          row.profile.organisation === otherOrg,
      ),
    ).toBe(true);
  });

  it('assigns an existing user to a project, who gets in without a new token', async () => {
    const evaluatorToken = await login(EVALUATOR);
    const directory = await as(otherToken)
      .get('/organisations/assignable-users')
      .expect(200);
    const evaluator = directory.body.find(
      (u: { email: string }) => u.email === EVALUATOR.email,
    );
    expect(evaluator).toBeDefined();
    const res = await as(otherToken)
      .post(`/${otherOrg}/users`, {
        email: evaluator.email,
        name: evaluator.name ?? evaluator.email,
        roleCode: 'assessment_evaluator',
      })
      .expect(201);
    expect(res.body.roles[0].code).toBe('assessment_evaluator');
    await as(evaluatorToken)
      .get(`/${otherOrg}/assessments/profiles`)
      .expect(200);
  });

  it('treats a superadmin added to someone else’s project as a regular member', async () => {
    await as(otherToken)
      .post(`/${otherOrg}/users`, {
        email: ADMIN.email,
        name: 'Administrador',
        roleCode: 'assessment_viewer',
      })
      .expect(201);
    await as(adminToken).get(`/${otherOrg}/assessments/profiles`).expect(200);
    await as(adminToken).get(`/${otherOrg}/users`).expect(403);
    await as(adminToken)
      .post(`/${otherOrg}/assessments/profiles`, profile(`Ajena ${suffix}`))
      .expect(403);
  });

  it('shows a viewer only the organisations enabled for them, read only', async () => {
    const created = await as(adminToken)
      .post(`/${ORG}/users`, {
        email: viewerEmail,
        name: 'Visualizador e2e',
        password: PASSWORD,
        roleCode: 'assessment_viewer',
      })
      .expect(201);
    expect(created.body.roles[0].visibility).toEqual({
      allProfiles: false,
      profileIds: [],
    });
    const viewerToken = await login({ email: viewerEmail, password: PASSWORD });
    const none = await as(viewerToken)
      .get(`/${ORG}/assessments/profiles`)
      .expect(200);
    expect(none.body).toEqual([]);

    const [visible, hidden] = profileIds;
    await as(adminToken)
      .put(`/${ORG}/users/${created.body.id}/visibility`, {
        allProfiles: false,
        profileIds: [visible],
      })
      .expect(200);
    const some = await as(viewerToken)
      .get(`/${ORG}/assessments/profiles`)
      .expect(200);
    expect(some.body.map((p: { id: string }) => p.id)).toEqual([visible]);
    await as(viewerToken)
      .get(`/${ORG}/assessments/profiles/${visible}`)
      .expect(200);
    await as(viewerToken)
      .get(`/${ORG}/assessments/profiles/${hidden}`)
      .expect(404);
    await as(viewerToken)
      .post(`/${ORG}/assessments/profiles`, profile(`Nueva ${suffix}`))
      .expect(403);
    await as(viewerToken).get(`/${ORG}/users`).expect(403);

    await as(adminToken)
      .put(`/${ORG}/users/${created.body.id}/visibility`, {
        allProfiles: true,
        profileIds: [],
      })
      .expect(200);
    const all = await as(viewerToken)
      .get(`/${ORG}/assessments/profiles`)
      .expect(200);
    expect(all.body.map((p: { id: string }) => p.id)).toEqual(
      expect.arrayContaining(profileIds),
    );
  });

  it('only sets visibility for viewers and only with organisations of the project', async () => {
    const users = await as(adminToken).get(`/${ORG}/users`).expect(200);
    const evaluator = users.body.find(
      (u: { email: string }) => u.email === EVALUATOR.email,
    );
    await as(adminToken)
      .put(`/${ORG}/users/${evaluator.id}/visibility`, {
        allProfiles: true,
        profileIds: [],
      })
      .expect(409);
    const viewer = users.body.find(
      (u: { email: string }) => u.email === viewerEmail,
    );
    await as(adminToken)
      .put(`/${ORG}/users/${viewer.id}/visibility`, {
        allProfiles: false,
        profileIds: ['no-existe'],
      })
      .expect(404);
  });
});
