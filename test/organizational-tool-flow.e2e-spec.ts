import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import {
  ORG,
  Evaluation,
  applicableIndicators,
  bootApp,
  cleanupProfiles,
  createProfile,
  expectedScores,
  scoreBody,
  scoreFor,
} from './helpers/assessment-flow';

jest.setTimeout(60 * 1000);

// HU-49: camino principal de la herramienta organizativa (CA-49.1) y sus
// rechazos (CA-49.2), contra una base de datos real.
describe('Organizational tool flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const profileIds: string[] = [];
  const base = `/${ORG}/assessments/organizational`;

  beforeAll(async () => {
    ({ app, prisma, token } = await bootApp());
    profileIds.push(
      await createProfile(app, token, `E2E Organizativa ${Date.now()}`),
    );
  });

  afterAll(async () => {
    await cleanupProfiles(prisma, profileIds);
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  it('creates, scores, completes and summarises an evaluation; rejects missing KPI (422) and scoring a completed one (409)', async () => {
    // Crear
    const created = await auth(
      http().post(`${base}/evaluations`).send({ profileId: profileIds[0] }),
    ).expect(201);
    expect(created.body.status).toBe('DRAFT');
    const evaluation = created.body as Evaluation;
    const indicators = applicableIndicators(evaluation);
    expect(indicators).toHaveLength(73);

    // Crear de nuevo devuelve la misma evaluación abierta, no un duplicado
    const again = await auth(
      http().post(`${base}/evaluations`).send({ profileId: profileIds[0] }),
    ).expect(201);
    expect(again.body.id).toBe(evaluation.id);

    // Calificar la mitad
    const half = indicators.slice(0, 36);
    const firstBatch = await auth(
      http()
        .put(`${base}/evaluations/${evaluation.id}/responses`)
        .send(scoreBody('organizational', half, (_, i) => scoreFor(i))),
    ).expect(200);
    expect(firstBatch.body.status).toBe('IN_PROGRESS');

    // CA-49.2: completar con indicadores sin calificar responde 422 y los lista
    const incomplete = await auth(
      http().post(`${base}/evaluations/${evaluation.id}/complete`),
    ).expect(422);
    expect(incomplete.body.missing).toHaveLength(
      indicators.length - half.length,
    );

    // Calificar el resto y completar
    const rest = indicators.slice(36);
    await auth(
      http()
        .put(`${base}/evaluations/${evaluation.id}/responses`)
        .send(scoreBody('organizational', rest, (_, i) => scoreFor(i + 36))),
    ).expect(200);
    const completed = await auth(
      http().post(`${base}/evaluations/${evaluation.id}/complete`),
    ).expect(201);
    expect(completed.body.status).toBe('COMPLETED');

    // Consultar el resumen: puntajes y críticos iguales al cálculo de referencia
    const scores = new Map(indicators.map((ind, i) => [ind.id, scoreFor(i)]));
    const expected = expectedScores(evaluation, scores);
    const summary = await auth(
      http().get(`${base}/evaluations/${evaluation.id}/summary`),
    ).expect(200);
    expect(summary.body.status).toBe('COMPLETED');
    expect(Number(summary.body.globalScore)).toBeCloseTo(expected.global, 2);
    for (const section of summary.body.sectionScores) {
      expect(Number(section.weightedAvg)).toBeCloseTo(
        expected.sections.get(section.number)!,
        2,
      );
    }
    const expectedCritical = indicators
      .filter((_, i) => scoreFor(i) <= 5)
      .map((ind) => ind.id)
      .sort();
    expect(
      summary.body.criticalIndicators
        .map((c: { indicatorId: string }) => c.indicatorId)
        .sort(),
    ).toEqual(expectedCritical);

    // CA-49.2: calificar una evaluación completada responde 409
    await auth(
      http()
        .put(`${base}/evaluations/${evaluation.id}/responses`)
        .send(scoreBody('organizational', [indicators[0]], () => 9)),
    ).expect(409);
  });

  it('rejects an out-of-range score with 400', async () => {
    const profileId = await createProfile(
      app,
      token,
      `E2E Organizativa nota ${Date.now()}`,
    );
    profileIds.push(profileId);
    const created = await auth(
      http().post(`${base}/evaluations`).send({ profileId }),
    ).expect(201);
    const [first] = applicableIndicators(created.body);
    await auth(
      http()
        .put(`${base}/evaluations/${created.body.id}/responses`)
        .send(scoreBody('organizational', [first], () => 11)),
    ).expect(400);
  });
});
