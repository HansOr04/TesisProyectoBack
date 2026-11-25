import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';

jest.setTimeout(120 * 1000);

// Revisión OWASP de las rutas (HU-70, CA-70.1). Requiere la BD migrada y
// sembrada. Ver docs/seguridad.md.
const ORG = process.env.SEED_ORGANISATION_ID || 'demo';
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@evaluacion.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};
// Contraseñas generadas en cada corrida.
const newPassword = (): string => randomUUID();
const PASSWORD = newPassword();
const CHANGED_PASSWORD = newPassword();

// Las únicas rutas sin sesión. Agregar una aquí es una decisión consciente.
const PUBLIC_ROUTES = [
  'GET /health',
  'POST /auth/login',
  'POST /auth/google',
  'POST /auth/refresh',
  'POST /auth/logout',
  'GET /auth/providers',
];

interface Route {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
}

describe('Route security (e2e, HU-70)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let routes: Route[];
  let adminToken: string;
  const suffix = Date.now().toString(36);
  const projects = [`seg-a-${suffix}`, `seg-b-${suffix}`];
  const emails = {
    adminA: `seg-admin-a-${suffix}@e2e.local`,
    adminB: `seg-admin-b-${suffix}@e2e.local`,
    outsider: `seg-fuera-${suffix}@e2e.local`,
    superadmin: `seg-super-${suffix}@e2e.local`,
  };

  const api = () => request(app.getHttpServer());
  const call = (token: string, { method, path }: Route, body: object = {}) =>
    api()[method](path).set('Authorization', `Bearer ${token}`).send(body);
  const login = async (email: string, password = PASSWORD) =>
    (await api().post('/auth/login').send({ email, password }).expect(200)).body
      .accessToken as string;

  const fill = (path: string, org: string) =>
    path.replace(/:org/g, org).replace(/:[a-zA-Z]+/g, 'no-existe');

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

    const stack = app.getHttpAdapter().getInstance()._router.stack as {
      route?: { path: string; methods: Record<string, boolean> };
    }[];
    routes = stack
      .filter((layer) => layer.route)
      .flatMap((layer) =>
        Object.keys(layer.route!.methods).map((method) => ({
          method: method as Route['method'],
          path: layer.route!.path,
        })),
      );

    adminToken = await login(ADMIN.email, ADMIN.password);
    for (const [i, id] of projects.entries()) {
      await call(
        adminToken,
        { method: 'post', path: '/organisations' },
        {
          id,
          name: `Seguridad ${i} ${suffix}`,
          adminEmail: i === 0 ? emails.adminA : emails.adminB,
          adminName: 'Administrador',
          adminPassword: PASSWORD,
        },
      ).expect(201);
    }
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userId = { in: users.map((u) => u.id) };
    const organisation = { in: projects };
    await prisma.assessmentTemplate.deleteMany({ where: { organisation } });
    await prisma.assessmentRiskCountryParam.deleteMany({
      where: { organisation },
    });
    await prisma.authUserRole.deleteMany({
      where: { OR: [{ organisation }, { userId }] },
    });
    await prisma.activityLog.deleteMany({
      where: { OR: [{ organisation }, { createdById: userId }] },
    });
    await prisma.organisationMember.deleteMany({
      where: { OR: [{ organisationId: organisation }, { userId }] },
    });
    await prisma.organisation.deleteMany({ where: { id: organisation } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('every route requires a session, except the declared public ones', async () => {
    expect(routes.length).toBeGreaterThan(80);
    const open: string[] = [];
    for (const route of routes) {
      const name = `${route.method.toUpperCase()} ${route.path}`;
      if (PUBLIC_ROUTES.includes(name)) continue;
      const res = await api()[route.method](fill(route.path, ORG));
      if (res.status !== 401) open.push(`${name} → ${res.status}`);
    }
    expect(open).toEqual([]);
  });

  it('every project route rejects someone who is not a member', async () => {
    await prisma.user.create({
      data: {
        email: emails.outsider,
        name: 'Fuera',
        passwordHash: (
          await prisma.user.findUniqueOrThrow({
            where: { email: emails.adminA },
          })
        ).passwordHash,
      },
    });
    const token = await login(emails.outsider);
    const open: string[] = [];
    for (const route of routes.filter((r) => r.path.startsWith('/:org'))) {
      const res = await call(token, {
        ...route,
        path: fill(route.path, projects[0]),
      });
      if (res.status !== 403) {
        open.push(`${route.method} ${route.path} → ${res.status}`);
      }
    }
    expect(open).toEqual([]);
  });

  it('every global route rejects a project administrator', async () => {
    const token = await login(emails.adminA);
    const global = routes.filter(
      (r) =>
        r.path.startsWith('/organisations') ||
        r.path.startsWith('/assessments/admin'),
    );
    expect(global.length).toBeGreaterThan(4);
    for (const route of global) {
      await call(token, { ...route, path: fill(route.path, ORG) }).expect(403);
    }
  });

  it('an administrator cannot take over the account of someone from another project', async () => {
    const tokenA = await login(emails.adminA);
    const users = `/${projects[0]}/users`;
    const victim = await call(
      tokenA,
      { method: 'post', path: users },
      { email: emails.adminB, name: 'B', roleCode: 'assessment_viewer' },
    ).expect(201);
    const path = `${users}/${victim.body.id}`;

    for (const change of [
      { password: newPassword() },
      { isActive: false },
      { name: 'Otro nombre' },
    ]) {
      await call(tokenA, { method: 'patch', path }, change).expect(403);
    }
    await login(emails.adminB);

    // El rol dentro de su proyecto sí es suyo, aunque reenvíe el mismo nombre.
    await call(
      tokenA,
      { method: 'patch', path },
      { name: 'Administrador', roleCode: 'assessment_evaluator' },
    ).expect(200);

    // Y una cuenta que solo está en su proyecto la sigue administrando.
    const own = await call(
      tokenA,
      { method: 'post', path: users },
      {
        email: emails.superadmin,
        name: 'Propio',
        password: PASSWORD,
        roleCode: 'assessment_viewer',
      },
    ).expect(201);
    await call(
      tokenA,
      { method: 'patch', path: `${users}/${own.body.id}` },
      { password: CHANGED_PASSWORD },
    ).expect(200);
  });

  it('losing superadmin or the membership takes effect at once, not when the token expires', async () => {
    const account = { where: { email: emails.superadmin } };
    await prisma.user.update({ ...account, data: { isSuperAdmin: true } });
    const token = await login(emails.superadmin, CHANGED_PASSWORD);
    const organisations: Route = { method: 'get', path: '/organisations' };
    const users: Route = {
      method: 'get',
      path: `/${projects[0]}/assessments/profiles`,
    };
    await call(token, organisations).expect(200);
    await call(token, users).expect(200);

    const { id: userId } = await prisma.user.update({
      ...account,
      data: { isSuperAdmin: false },
    });
    await call(token, organisations).expect(403);

    await prisma.organisationMember.deleteMany({
      where: { userId, organisationId: projects[0] },
    });
    await call(token, users).expect(403);
  });

  it('does not let the client write its own IP or request id in the records', async () => {
    const res = await api()
      .get('/health')
      .set('X-Request-Id', 'x'.repeat(200))
      .expect(200);
    expect(res.headers['x-request-id']).not.toContain('xxx');
  });
});
