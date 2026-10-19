import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/database/prisma.service';

// Requiere la BD de docker-compose migrada y sembrada (npm run bootstrap).
export const ORG = process.env.SEED_ORGANISATION_ID || 'demo';
export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@evaluacion.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};

export type Tool = 'organizational' | 'capacity' | 'risk';

export interface Indicator {
  id: string;
  code: string;
  weight: number | string;
  active: boolean;
  applicable: boolean;
}

export interface Section {
  id: string;
  number: number;
  weight: number | string;
  indicators: Indicator[];
}

export interface Evaluation {
  id: string;
  status: string;
  template: { sections: Section[] };
}

export async function bootApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  const prisma = app.get(PrismaService);
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send(ADMIN)
    .expect(200);
  return { app, prisma, token: res.body.accessToken as string };
}

export async function createProfile(
  app: INestApplication,
  token: string,
  name: string,
  country = 'EC',
) {
  const res = await request(app.getHttpServer())
    .post(`/${ORG}/assessments/profiles`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      type: 'ASSOCIATION',
      country,
      mainProduct: 'cacao',
      memberCount: 30,
    })
    .expect(201);
  return res.body.id as string;
}

export async function cleanupProfiles(
  prisma: PrismaService,
  profileIds: string[],
) {
  if (profileIds.length === 0) return;
  const evaluations = await prisma.assessmentEvaluation.findMany({
    where: { profileId: { in: profileIds } },
    select: { id: true },
  });
  const evaluationIds = evaluations.map((e) => e.id);
  await prisma.assessmentIndicatorMeasure.deleteMany({
    where: { evaluationId: { in: evaluationIds } },
  });
  await prisma.assessmentEvaluation.deleteMany({
    where: { id: { in: evaluationIds } },
  });
  await prisma.assessmentOrganisationProfile.deleteMany({
    where: { id: { in: profileIds } },
  });
}

/** Indicadores que la evaluación exige: activos y aplicables a la organización. */
export function applicableIndicators(evaluation: Evaluation) {
  return evaluation.template.sections.flatMap((s) =>
    s.indicators.filter((i) => i.active && i.applicable !== false),
  );
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function weightedAverage(items: { weight: number; score: number }[]) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  if (total <= 0) return 0;
  return round2(items.reduce((sum, i) => sum + i.weight * i.score, 0) / total);
}

/**
 * Cálculo de referencia de las hojas originales, escrito aparte del motor:
 * promedio ponderado por peso de KPI en cada sección y por peso de sección en
 * el global, ambos redondeados a dos decimales.
 */
export function expectedScores(
  evaluation: Evaluation,
  scores: Map<string, number>,
) {
  const sections = evaluation.template.sections
    .map((s) => ({
      number: s.number,
      weight: Number(s.weight),
      indicators: s.indicators
        .filter((i) => scores.has(i.id))
        .map((i) => ({ weight: Number(i.weight), score: scores.get(i.id)! })),
    }))
    .filter((s) => s.indicators.length > 0)
    .map((s) => ({ ...s, avg: weightedAverage(s.indicators) }));
  return {
    sections: new Map(sections.map((s) => [s.number, s.avg])),
    global: weightedAverage(
      sections.map((s) => ({ weight: s.weight, score: s.avg })),
    ),
  };
}

/** Nota determinista entre 1 y 10 a partir de la posición del indicador. */
export const scoreFor = (index: number) => ((index * 7) % 10) + 1;

export function scoreBody(
  tool: Tool,
  indicators: Indicator[],
  score: (i: Indicator, index: number) => number,
) {
  return {
    responses: indicators.map((indicator, index) => ({
      indicatorId: indicator.id,
      score: score(indicator, index),
      observation: `Observación del KPI ${indicator.code}`,
      ...(tool === 'risk'
        ? { riskDescription: `Riesgo asociado al KPI ${indicator.code}` }
        : {}),
    })),
  };
}
