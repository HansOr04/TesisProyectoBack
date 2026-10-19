import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import {
  ORG,
  Evaluation,
  Tool,
  applicableIndicators,
  bootApp,
  cleanupProfiles,
  createProfile,
  expectedScores,
  scoreBody,
  scoreFor,
} from './helpers/assessment-flow';

jest.setTimeout(60 * 1000);

// HU-50: las herramientas de capacidades y de riesgos cumplen el mismo camino
// principal que la organizativa (CA-50.1) y los riesgos se clasifican con y
// sin umbral propio del país (CA-50.2).
describe('Capacity and risk tool flows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const profileIds: string[] = [];
  // Países ficticios para no tocar la configuración real de EC.
  const COUNTRY_WITH_PARAM = 'ZZ';
  const COUNTRY_WITHOUT_PARAM = 'ZY';

  beforeAll(async () => {
    ({ app, prisma, token } = await bootApp());
  });

  afterAll(async () => {
    await request(app.getHttpServer())
      .delete(`/${ORG}/assessments/risk/country-params/${COUNTRY_WITH_PARAM}`)
      .set('Authorization', `Bearer ${token}`);
    await cleanupProfiles(prisma, profileIds);
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  it.each<[Tool, number]>([
    ['capacity', 30],
    ['risk', 46],
  ])(
    'covers create, score, complete and summary in the %s tool',
    async (tool, kpiCount) => {
      const base = `/${ORG}/assessments/${tool}`;
      const profileId = await createProfile(
        app,
        token,
        `E2E ${tool} ${Date.now()}`,
      );
      profileIds.push(profileId);

      const created = await auth(
        http().post(`${base}/evaluations`).send({ profileId }),
      ).expect(201);
      expect(created.body.status).toBe('DRAFT');
      const evaluation = created.body as Evaluation;
      const indicators = applicableIndicators(evaluation);
      expect(indicators).toHaveLength(kpiCount);

      await auth(
        http()
          .put(`${base}/evaluations/${evaluation.id}/responses`)
          .send(scoreBody(tool, indicators.slice(0, 5), (_, i) => scoreFor(i))),
      ).expect(200);
      await auth(
        http().post(`${base}/evaluations/${evaluation.id}/complete`),
      ).expect(422);

      await auth(
        http()
          .put(`${base}/evaluations/${evaluation.id}/responses`)
          .send(scoreBody(tool, indicators, (_, i) => scoreFor(i))),
      ).expect(200);
      const completed = await auth(
        http().post(`${base}/evaluations/${evaluation.id}/complete`),
      ).expect(201);
      expect(completed.body.status).toBe('COMPLETED');

      const expected = expectedScores(
        evaluation,
        new Map(indicators.map((ind, i) => [ind.id, scoreFor(i)])),
      );
      const summary = await auth(
        http().get(`${base}/evaluations/${evaluation.id}/summary`),
      ).expect(200);
      expect(Number(summary.body.globalScore)).toBeCloseTo(expected.global, 2);
      for (const section of summary.body.sectionScores) {
        expect(Number(section.weightedAvg)).toBeCloseTo(
          expected.sections.get(section.number)!,
          2,
        );
      }
      expect(summary.body.criticalIndicators).toHaveLength(
        indicators.filter((_, i) => scoreFor(i) <= 5).length,
      );

      await auth(
        http()
          .put(`${base}/evaluations/${evaluation.id}/responses`)
          .send(scoreBody(tool, [indicators[0]], () => 9)),
      ).expect(409);
    },
  );

  it('classifies risks with the country threshold and falls back to the template threshold', async () => {
    const base = `/${ORG}/assessments/risk`;
    await auth(
      http()
        .put(`${base}/country-params`)
        .send({ country: COUNTRY_WITH_PARAM, riskThreshold: 7 }),
    ).expect(200);

    async function classify(country: string, score: number) {
      const profileId = await createProfile(
        app,
        token,
        `E2E riesgo ${country} ${Date.now()}`,
        country,
      );
      profileIds.push(profileId);
      const created = await auth(
        http().post(`${base}/evaluations`).send({ profileId }),
      ).expect(201);
      const [indicator] = applicableIndicators(created.body);
      await auth(
        http()
          .put(`${base}/evaluations/${created.body.id}/responses`)
          .send(scoreBody('risk', [indicator], () => score)),
      ).expect(200);
      const risks = await auth(
        http().get(`${base}/evaluations/${created.body.id}/risks`),
      ).expect(200);
      return risks.body.find(
        (r: { indicatorId: string }) => r.indicatorId === indicator.id,
      ).class;
    }

    // Con umbral propio del país (7): una nota de 6 no lo supera.
    expect(await classify(COUNTRY_WITH_PARAM, 6)).toBe('NON_NEGLIGIBLE');
    expect(await classify(COUNTRY_WITH_PARAM, 8)).toBe('NEGLIGIBLE');
    // Sin umbral del país se usa el de la plantilla (5): una nota de 6 lo supera.
    expect(await classify(COUNTRY_WITHOUT_PARAM, 6)).toBe('NEGLIGIBLE');
    expect(await classify(COUNTRY_WITHOUT_PARAM, 5)).toBe('NON_NEGLIGIBLE');
  });
});
