import { Prisma, PrismaClient } from '@prisma/client';

// Datos de demostración para la analítica: organizaciones con perfiles
// variados, evaluaciones completadas de las 3 herramientas, medidas sobre KPI
// críticos y re-evaluaciones donde los KPI con medida concluida mejoran más.
// Determinístico (PRNG con semilla) para que la memoria pueda reproducirlo.
// Re-ejecutable: borra y vuelve a crear las organizaciones "Demo —".

const DEMO_PREFIX = 'Demo — ';
const TOOLS = ['ORGANIZATIONAL', 'CAPACITY', 'RISK'] as const;
type Tool = (typeof TOOLS)[number];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoOrg {
  name: string;
  type: 'ASSOCIATION' | 'COMPANY';
  country: string;
  region: string;
  mainProduct: string;
  memberCount: number;
  yearStarted: number;
  /** Capacidad latente 0–1: mueve todos los puntajes de la organización. */
  capability: number;
  /** Segunda evaluación completada (histórico) para medir efectividad. */
  reevaluate: boolean;
  /** Sesgos por herramienta (p.ej. fuerte en organización, débil en riesgos). */
  bias: Partial<Record<Tool, number>>;
}

const ORGS: DemoOrg[] = [
  {
    name: 'Asociación Cacao del Norte',
    type: 'ASSOCIATION',
    country: 'EC',
    region: 'Esmeraldas',
    mainProduct: 'cacao',
    memberCount: 180,
    yearStarted: 2006,
    capability: 0.78,
    reevaluate: true,
    bias: { RISK: -0.08 },
  },
  {
    name: 'Cooperativa Café Andino',
    type: 'ASSOCIATION',
    country: 'EC',
    region: 'Loja',
    mainProduct: 'café',
    memberCount: 95,
    yearStarted: 2012,
    capability: 0.62,
    reevaluate: true,
    bias: { ORGANIZATIONAL: 0.06 },
  },
  {
    name: 'Productores Unidos del Río',
    type: 'ASSOCIATION',
    country: 'EC',
    region: 'Manabí',
    mainProduct: 'cacao',
    memberCount: 45,
    yearStarted: 2019,
    capability: 0.38,
    reevaluate: true,
    bias: { CAPACITY: -0.05 },
  },
  {
    name: 'AgroExport Pacífico S.A.',
    type: 'COMPANY',
    country: 'EC',
    region: 'Guayas',
    mainProduct: 'cacao',
    memberCount: 12,
    yearStarted: 2003,
    capability: 0.84,
    reevaluate: false,
    bias: { ORGANIZATIONAL: -0.04 },
  },
  {
    name: 'Asociación Selva Viva',
    type: 'ASSOCIATION',
    country: 'PE',
    region: 'San Martín',
    mainProduct: 'cacao',
    memberCount: 220,
    yearStarted: 2009,
    capability: 0.7,
    reevaluate: true,
    bias: { RISK: 0.05 },
  },
  {
    name: 'Cafetaleros de la Sierra',
    type: 'ASSOCIATION',
    country: 'PE',
    region: 'Cajamarca',
    mainProduct: 'café',
    memberCount: 140,
    yearStarted: 2001,
    capability: 0.55,
    reevaluate: false,
    bias: {},
  },
  {
    name: 'Finca Los Almendros',
    type: 'COMPANY',
    country: 'PE',
    region: 'Piura',
    mainProduct: 'cacao',
    memberCount: 8,
    yearStarted: 2016,
    capability: 0.47,
    reevaluate: true,
    bias: { CAPACITY: 0.08 },
  },
  {
    name: 'Asociación Cacao Real',
    type: 'ASSOCIATION',
    country: 'CO',
    region: 'Santander',
    mainProduct: 'cacao',
    memberCount: 310,
    yearStarted: 1998,
    capability: 0.88,
    reevaluate: false,
    bias: {},
  },
  {
    name: 'Red de Mujeres Cafeteras',
    type: 'ASSOCIATION',
    country: 'CO',
    region: 'Huila',
    mainProduct: 'café',
    memberCount: 75,
    yearStarted: 2014,
    capability: 0.58,
    reevaluate: true,
    bias: { ORGANIZATIONAL: 0.1, RISK: -0.06 },
  },
  {
    name: 'Comercializadora Tierra Fértil',
    type: 'COMPANY',
    country: 'CO',
    region: 'Antioquia',
    mainProduct: 'café',
    memberCount: 20,
    yearStarted: 2010,
    capability: 0.66,
    reevaluate: false,
    bias: { CAPACITY: 0.05 },
  },
  {
    name: 'Asociación Nuevo Amanecer',
    type: 'ASSOCIATION',
    country: 'EC',
    region: 'Los Ríos',
    mainProduct: 'cacao',
    memberCount: 60,
    yearStarted: 2021,
    capability: 0.3,
    reevaluate: true,
    bias: {},
  },
  {
    name: 'Cacaoteros del Valle',
    type: 'ASSOCIATION',
    country: 'PE',
    region: 'Huánuco',
    mainProduct: 'cacao',
    memberCount: 130,
    yearStarted: 2007,
    capability: 0.5,
    reevaluate: false,
    bias: { RISK: -0.1 },
  },
  {
    name: 'Agrícola Montebello Ltda.',
    type: 'COMPANY',
    country: 'CO',
    region: 'Tolima',
    mainProduct: 'café',
    memberCount: 15,
    yearStarted: 2008,
    capability: 0.74,
    reevaluate: false,
    bias: {},
  },
  {
    name: 'Asociación Frontera Verde',
    type: 'ASSOCIATION',
    country: 'EC',
    region: 'Sucumbíos',
    mainProduct: 'cacao',
    memberCount: 52,
    yearStarted: 2017,
    capability: 0.42,
    reevaluate: true,
    bias: { CAPACITY: -0.08 },
  },
];

function clampScore(v: number): number {
  return Math.max(1, Math.min(10, Math.round(v)));
}

function weightedAvg(items: { weight: number; score: number }[]): number {
  const tw = items.reduce((a, i) => a + i.weight, 0);
  if (tw <= 0) return 0;
  return (
    Math.round((items.reduce((a, i) => a + i.weight * i.score, 0) / tw) * 100) /
    100
  );
}

function monthsAgo(months: number, day = 15): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months, day);
  d.setHours(10, 0, 0, 0);
  return d;
}

export async function seedDemoData(
  prisma: PrismaClient,
  organisation: string,
  seed = 42,
) {
  const rand = mulberry32(seed);
  const admin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  const actor = admin?.id ?? 'system';

  console.log(`Seeding demo analytics data for "${organisation}"...`);
  const existing = await prisma.assessmentOrganisationProfile.findMany({
    where: { organisation, name: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  if (existing.length) {
    const ids = existing.map((p) => p.id);
    await prisma.assessmentEvaluation.deleteMany({
      where: { profileId: { in: ids } },
    });
    await prisma.assessmentOrganisationProfile.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`  Removed ${ids.length} previous demo organisations`);
  }

  const templates = await Promise.all(
    TOOLS.map((tool) =>
      prisma.assessmentTemplate.findFirst({
        where: { organisation, tool, active: true, deletedAt: null },
        orderBy: { version: 'desc' },
        include: {
          sections: {
            where: { deletedAt: null },
            orderBy: { number: 'asc' },
            include: {
              indicators: {
                where: { deletedAt: null },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      }),
    ),
  );
  if (templates.some((t) => !t)) {
    throw new Error(
      'Faltan plantillas activas. Ejecuta primero el seed base (npm run prisma:seed).',
    );
  }

  let evaluationCount = 0;
  let measureCount = 0;

  for (const [orgIndex, org] of ORGS.entries()) {
    const profile = await prisma.assessmentOrganisationProfile.create({
      data: {
        organisation,
        name: DEMO_PREFIX + org.name,
        type: org.type,
        associationLevel: org.type === 'ASSOCIATION' ? 'LEVEL_1' : null,
        country: org.country,
        region: org.region,
        mainProduct: org.mainProduct,
        memberCount: org.memberCount,
        yearStarted: org.yearStarted,
        mainActivity:
          org.mainProduct === 'cacao'
            ? 'producción y comercialización de cacao'
            : 'producción y comercialización de café',
        mainMarkets: rand() > 0.5 ? 'UE, EE. UU.' : 'mercado nacional, UE',
      },
    });

    for (const [ti, tool] of TOOLS.entries()) {
      const template = templates[ti]!;
      const base = Math.min(
        0.95,
        Math.max(0.15, org.capability + (org.bias[tool] ?? 0)),
      );
      // Sesgo por sección estable para la organización (fortalezas/debilidades).
      const sectionBias = new Map(
        template.sections.map((s) => [s.id, (rand() - 0.5) * 2.2]),
      );
      const firstScores = new Map<string, number>();
      for (const s of template.sections) {
        for (const i of s.indicators) {
          firstScores.set(
            i.id,
            clampScore(
              1 + base * 9 + (sectionBias.get(s.id) ?? 0) + (rand() - 0.5) * 3,
            ),
          );
        }
      }
      const firstDate = monthsAgo(
        org.reevaluate ? 11 + (orgIndex % 3) : 2 + (orgIndex % 5),
      );

      const createEvaluation = async (
        scores: Map<string, number>,
        completedAt: Date,
      ) => {
        const sectionInputs = template.sections.map((s) => ({
          sectionId: s.id,
          number: s.number,
          name: s.name,
          weight: Number(s.weight),
          indicators: s.indicators.map((i) => ({
            weight: Number(i.weight),
            score: scores.get(i.id) as number,
          })),
        }));
        const sectionScores = sectionInputs.map((s) => {
          const weightedAvgValue = weightedAvg(s.indicators);
          return {
            sectionId: s.sectionId,
            number: s.number,
            name: s.name,
            weight: s.weight,
            weightedAvg: weightedAvgValue,
            critical: weightedAvgValue <= 5,
          };
        });
        const globalScore = weightedAvg(
          sectionScores.map((s) => ({
            weight: s.weight,
            score: s.weightedAvg,
          })),
        );
        const startedAt = new Date(completedAt);
        startedAt.setDate(startedAt.getDate() - 7);
        const evaluation = await prisma.assessmentEvaluation.create({
          data: {
            organisation,
            templateId: template.id,
            profileId: profile.id,
            status: 'COMPLETED',
            startedBy: actor,
            startedAt,
            completedAt,
            createdAt: startedAt,
            globalScore,
            sectionScores: sectionScores as unknown as Prisma.InputJsonValue,
            responses: {
              create: template.sections.flatMap((s) =>
                s.indicators.map((i) => ({
                  indicatorId: i.id,
                  score: scores.get(i.id) as number,
                  observation: `Observación registrada en taller de evaluación (${i.code}).`,
                  isCritical: (scores.get(i.id) as number) <= 5,
                  scoredBy: actor,
                  scoredAt: completedAt,
                })),
              ),
            },
          },
        });
        evaluationCount++;
        if (tool === 'RISK') {
          await prisma.assessmentRisk.createMany({
            data: template.sections.flatMap((s) =>
              s.indicators.map((i) => ({
                evaluationId: evaluation.id,
                indicatorId: i.id,
                description: `Riesgo identificado en ${i.code}`,
                riskType: ['legal', 'ambiental', 'social', 'trazabilidad'][
                  Math.floor(rand() * 4)
                ],
                class:
                  (scores.get(i.id) as number) > 5
                    ? 'NEGLIGIBLE'
                    : 'NON_NEGLIGIBLE',
                identifiedBy: actor,
              })),
            ),
          });
        }
        return evaluation;
      };

      const first = await createEvaluation(firstScores, firstDate);

      // Medidas sobre ~60 % de los KPI críticos de la primera evaluación.
      const criticalIds = [...firstScores.entries()]
        .filter(([, s]) => s <= 5)
        .map(([id]) => id);
      const measureStatus = new Map<
        string,
        'PENDING' | 'IN_PROGRESS' | 'DONE'
      >();
      for (const indicatorId of criticalIds) {
        if (rand() > 0.6) continue;
        const roll = rand();
        const status: 'PENDING' | 'IN_PROGRESS' | 'DONE' = org.reevaluate
          ? roll < 0.55
            ? 'DONE'
            : roll < 0.85
              ? 'IN_PROGRESS'
              : 'PENDING'
          : roll < 0.3
            ? 'DONE'
            : roll < 0.7
              ? 'IN_PROGRESS'
              : 'PENDING';
        const progressPct =
          status === 'DONE'
            ? 100
            : status === 'IN_PROGRESS'
              ? 25 + Math.floor(rand() * 60)
              : 0;
        measureStatus.set(indicatorId, status);
        const start = new Date(firstDate);
        start.setDate(start.getDate() + 14);
        const end = new Date(start);
        end.setDate(end.getDate() + 60 + Math.floor(rand() * 90));
        const common = {
          responsible: [
            'Gerente',
            'Presidente',
            'Coordinador técnico',
            'Contador',
          ][Math.floor(rand() * 4)],
          progressPct,
          status,
          updatedBy: actor,
          createdAt: start,
          budgetUsd: Math.round(200 + rand() * 3000),
          expectedResult:
            'Cerrar la brecha detectada y evidenciarla en la siguiente evaluación.',
        };
        if (tool === 'ORGANIZATIONAL' || tool === 'CAPACITY') {
          await prisma.assessmentIndicatorMeasure.create({
            data: {
              organisation,
              evaluationId: first.id,
              indicatorId,
              name:
                tool === 'ORGANIZATIONAL'
                  ? 'Medida de fortalecimiento'
                  : 'Medida de cierre de brecha',
              description: 'Plan de acción definido en taller.',
              startDate: start,
              endDate: end,
              ...common,
            },
          });
        } else {
          const risk = await prisma.assessmentRisk.findFirst({
            where: { evaluationId: first.id, indicatorId },
          });
          if (risk) {
            await prisma.assessmentMitigationMeasure.create({
              data: {
                riskId: risk.id,
                description: 'Medida de mitigación definida en taller.',
                startWeek: start,
                durationDays: 60,
                endDate: end,
                ...common,
              },
            });
          }
        }
        measureCount++;
      }

      if (org.reevaluate) {
        // Segunda evaluación: los KPI con medida concluida mejoran +2..+4, en curso +0..+2,
        // sin medida −1..+1 (efecto real de las medidas, con ruido).
        const secondScores = new Map<string, number>();
        for (const [id, score] of firstScores) {
          const status = measureStatus.get(id);
          const delta =
            status === 'DONE'
              ? 2 + Math.floor(rand() * 3)
              : status === 'IN_PROGRESS'
                ? Math.floor(rand() * 3)
                : Math.floor(rand() * 3) - 1;
          secondScores.set(id, clampScore(score + delta));
        }
        await createEvaluation(secondScores, monthsAgo(1 + (orgIndex % 2)));
      }
    }
  }

  console.log(
    `  Created ${ORGS.length} organisations, ${evaluationCount} completed evaluations, ${measureCount} measures`,
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedDemoData(prisma, process.env.SEED_ORGANISATION_ID || 'demo')
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
