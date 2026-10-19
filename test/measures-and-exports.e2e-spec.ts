import { INestApplication } from '@nestjs/common';
import JSZip from 'jszip';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import {
  ORG,
  Evaluation,
  Indicator,
  Tool,
  applicableIndicators,
  bootApp,
  cleanupProfiles,
  createProfile,
  scoreBody,
} from './helpers/assessment-flow';

jest.setTimeout(90 * 1000);

const PPTX =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const XLSX_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const binary: Parameters<request.Test['parse']>[0] = (res, done) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

async function slideText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files).filter((f) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(f),
  );
  const texts = await Promise.all(
    slides.map((f) => zip.file(f)!.async('string')),
  );
  return { count: slides.length, text: texts.join(' ') };
}

// HU-52: plan de acción y reportes. CA-52.1 medidas, su estado y el rechazo
// para indicadores no críticos; CA-52.2 presentación con cada alcance y matriz
// en hoja de cálculo.
describe('Measures and report exports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const profileIds: string[] = [];
  const stamp = Date.now();
  const nameA = `E2E Reportes A ${stamp}`;
  const nameB = `E2E Reportes B ${stamp}`;

  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  // Las notas alternan 3 y 8: los indicadores pares quedan críticos.
  const noteOf = (_: Indicator, i: number) => (i % 2 === 0 ? 3 : 8);

  async function completedEvaluation(tool: Tool, profileId: string) {
    const base = `/${ORG}/assessments/${tool}`;
    const created = await auth(
      http().post(`${base}/evaluations`).send({ profileId }),
    ).expect(201);
    const evaluation = created.body as Evaluation;
    const indicators = applicableIndicators(evaluation);
    await auth(
      http()
        .put(`${base}/evaluations/${evaluation.id}/responses`)
        .send(scoreBody(tool, indicators, noteOf)),
    ).expect(200);
    await auth(
      http().post(`${base}/evaluations/${evaluation.id}/complete`),
    ).expect(201);
    return { evaluationId: evaluation.id, indicators };
  }

  let orgEvalA: { evaluationId: string; indicators: Indicator[] };
  let riskEvalA: { evaluationId: string; indicators: Indicator[] };

  beforeAll(async () => {
    ({ app, prisma, token } = await bootApp());
    const a = await createProfile(app, token, nameA);
    const b = await createProfile(app, token, nameB);
    profileIds.push(a, b);
    orgEvalA = await completedEvaluation('organizational', a);
    riskEvalA = await completedEvaluation('risk', a);
    const orgEvalB = await completedEvaluation('organizational', b);
    // La organización B tiene una medida propia para que aparezca en el
    // cronograma del proyecto completo.
    await auth(
      http()
        .post(
          `/${ORG}/assessments/organizational/evaluations/${orgEvalB.evaluationId}/measures`,
        )
        .send({
          indicatorId: orgEvalB.indicators[0].id,
          name: 'Medida de la organización B',
          responsible: 'Coordinación B',
          startDate: '2026-11-02',
          endDate: '2026-11-27',
        }),
    ).expect(201);
  });

  afterAll(async () => {
    await cleanupProfiles(prisma, profileIds);
    await app.close();
  });

  describe('CA-52.1 action plan measures', () => {
    const base = `/${ORG}/assessments/organizational`;

    it('creates a measure for a critical KPI and derives its status from the progress', async () => {
      const created = await auth(
        http()
          .post(`${base}/evaluations/${orgEvalA.evaluationId}/measures`)
          .send({
            indicatorId: orgEvalA.indicators[0].id,
            name: 'Elaborar el manual de funciones',
            responsible: 'Directiva de la asociación',
            startDate: '2026-11-02',
            endDate: '2026-12-11',
            budgetUsd: 150,
          }),
      ).expect(201);
      expect(created.body.status).toBe('PENDING');

      for (const [progressPct, status] of [
        [40, 'IN_PROGRESS'],
        [100, 'DONE'],
        [0, 'PENDING'],
      ] as const) {
        const updated = await auth(
          http()
            .patch(`${base}/measures/${created.body.id}`)
            .send({ progressPct }),
        ).expect(200);
        expect(updated.body.progressPct).toBe(progressPct);
        expect(updated.body.status).toBe(status);
      }

      const list = await auth(
        http().get(`${base}/evaluations/${orgEvalA.evaluationId}/measures`),
      ).expect(200);
      const ids = (
        Array.isArray(list.body)
          ? list.body
          : (list.body.items ?? list.body.data)
      ).map((m: { id: string }) => m.id);
      expect(ids).toContain(created.body.id);
    });

    it('rejects a measure for a non-critical KPI (422) and an end date before the start (400)', async () => {
      await auth(
        http()
          .post(`${base}/evaluations/${orgEvalA.evaluationId}/measures`)
          .send({
            indicatorId: orgEvalA.indicators[1].id,
            name: 'Medida sobre un KPI con nota 8',
            responsible: 'Directiva',
            startDate: '2026-11-02',
            endDate: '2026-11-30',
          }),
      ).expect(422);
      await auth(
        http()
          .post(`${base}/evaluations/${orgEvalA.evaluationId}/measures`)
          .send({
            indicatorId: orgEvalA.indicators[0].id,
            name: 'Fechas invertidas',
            responsible: 'Directiva',
            startDate: '2026-12-01',
            endDate: '2026-11-01',
          }),
      ).expect(400);
    });

    it('creates mitigation measures only for non-negligible risks and computes the end date', async () => {
      const riskBase = `/${ORG}/assessments/risk`;
      const risks = await auth(
        http().get(`${riskBase}/evaluations/${riskEvalA.evaluationId}/risks`),
      ).expect(200);
      const nonNegligible = risks.body.find(
        (r: { class: string }) => r.class === 'NON_NEGLIGIBLE',
      );
      const negligible = risks.body.find(
        (r: { class: string }) => r.class === 'NEGLIGIBLE',
      );

      const created = await auth(
        http().post(`${riskBase}/risks/${nonNegligible.id}/measures`).send({
          description: 'Georreferenciar las parcelas de los socios',
          responsible: 'Técnico de campo',
          startWeek: '2026-11-02',
          durationDays: 14,
        }),
      ).expect(201);
      expect(new Date(created.body.endDate).toISOString().slice(0, 10)).toBe(
        '2026-11-16',
      );
      expect(created.body.status).toBe('PENDING');

      const updated = await auth(
        http()
          .patch(`${riskBase}/measures/${created.body.id}`)
          .send({ progressPct: 100 }),
      ).expect(200);
      expect(updated.body.status).toBe('DONE');

      await auth(
        http().post(`${riskBase}/risks/${negligible.id}/measures`).send({
          description: 'No corresponde',
          responsible: 'Nadie',
          startWeek: '2026-11-02',
          durationDays: 7,
        }),
      ).expect(422);
    });
  });

  describe('CA-52.2 report exports', () => {
    const base = `/${ORG}/assessments/organizational`;

    it('exports the evaluation matrix as a spreadsheet', async () => {
      const res = await auth(
        http().get(
          `${base}/evaluations/${orgEvalA.evaluationId}/summary/export`,
        ),
      )
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect(res.headers['content-type']).toContain(XLSX_TYPE);
      const book = XLSX.read(res.body, { type: 'buffer' });
      expect(book.SheetNames.length).toBeGreaterThan(0);
      const text = book.SheetNames.map((n) =>
        XLSX.utils.sheet_to_csv(book.Sheets[n]),
      ).join('\n');
      expect(text).toContain(orgEvalA.indicators[0].code);
    });

    it.each(['tool', 'organisation', 'project'] as const)(
      'exports the executive presentation with the %s Gantt scope',
      async (ganttScope) => {
        const res = await auth(
          http()
            .post(
              `${base}/evaluations/${orgEvalA.evaluationId}/summary/export-pptx`,
            )
            .send({ ganttScope }),
        )
          .buffer(true)
          .parse(binary)
          .expect(201);
        expect(res.headers['content-type']).toContain(PPTX);
        const { count, text } = await slideText(res.body);
        expect(count).toBeGreaterThan(1);
        // Solo el cronograma de todo el proyecto incluye a la otra organización.
        if (ganttScope === 'project') expect(text).toContain(nameB);
        else expect(text).not.toContain(nameB);
      },
    );

    it('exports the risk mitigation plan as a spreadsheet and as a presentation', async () => {
      const riskBase = `/${ORG}/assessments/risk`;
      const xlsx = await auth(
        http().get(
          `${riskBase}/evaluations/${riskEvalA.evaluationId}/mitigation-plan/export`,
        ),
      )
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect(xlsx.headers['content-type']).toContain(XLSX_TYPE);
      expect(
        XLSX.read(xlsx.body, { type: 'buffer' }).SheetNames.length,
      ).toBeGreaterThan(0);

      const pptx = await auth(
        http()
          .post(
            `${riskBase}/evaluations/${riskEvalA.evaluationId}/mitigation-plan/export-pptx`,
          )
          .send({ ganttScope: 'tool' }),
      )
        .buffer(true)
        .parse(binary)
        .expect(201);
      expect(pptx.headers['content-type']).toContain(PPTX);
      expect((await slideText(pptx.body)).count).toBeGreaterThan(1);
    });
  });
});
