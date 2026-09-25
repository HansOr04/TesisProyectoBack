import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ASSESSMENT_TOOLS,
  AssessmentToolCode,
  CRITICAL_THRESHOLD,
} from '../../assessment-core/domain/assessment.constants';
import {
  ANALYTICS_DATASET,
  AnalyticsDataset,
  AnalyticsDatasetPort,
  AnalyticsEvaluation,
  AnalyticsProfile,
  AnalyticsProfileScope,
  AnalyticsToolDataset,
} from '../domain/analytics.types';
import {
  correlationStrength,
  histogram,
  kMeans,
  linearRegression,
  mean,
  median,
  pearson,
  percentileRank,
  round,
  stdDev,
} from '../domain/statistics';

export type SegmentKey = 'country' | 'region' | 'type' | 'mainProduct';

const MIN_SAMPLE = 3;

/** Última evaluación con respuestas por perfil (estado actual), y las completadas ordenadas (histórico). */
function latestByProfile(
  tool: AnalyticsToolDataset,
): Map<string, AnalyticsEvaluation> {
  const map = new Map<string, AnalyticsEvaluation>();
  for (const e of tool.evaluations) {
    if (e.responses.length === 0) continue;
    const current = map.get(e.profileId);
    if (!current || e.startedAt > current.startedAt) map.set(e.profileId, e);
  }
  return map;
}

function completedByProfile(
  tool: AnalyticsToolDataset,
): Map<string, AnalyticsEvaluation[]> {
  const map = new Map<string, AnalyticsEvaluation[]>();
  for (const e of tool.evaluations) {
    if (e.status !== 'COMPLETED' || !e.completedAt) continue;
    const list = map.get(e.profileId) ?? [];
    list.push(e);
    map.set(e.profileId, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        (a.completedAt as Date).getTime() - (b.completedAt as Date).getTime(),
    );
  }
  return map;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Analítica descriptiva, comparativa y de efectividad sobre las evaluaciones.
// Todo es determinístico (sin IA) y reproducible: cada método documenta la
// fórmula que usa para poder citarla en la memoria.
@Injectable()
export class AssessmentAnalyticsService {
  constructor(
    @Inject(ANALYTICS_DATASET) private readonly datasets: AnalyticsDatasetPort,
  ) {}

  private load(organisation: string, scope: AnalyticsProfileScope) {
    return this.datasets.load(organisation, scope);
  }

  // ── 1. Panorama ──────────────────────────────────────────────────────────
  async overview(organisation: string, scope: AnalyticsProfileScope) {
    const data = await this.load(organisation, scope);
    const perTool = ASSESSMENT_TOOLS.map((tool) => {
      const ds = data.tools[tool];
      const latest = [...latestByProfile(ds).values()];
      const globals = latest
        .map((e) => e.globalScore)
        .filter((g): g is number => g !== null);
      const sectionAverages = ds.sections.map((s) => {
        const values = latest
          .map((e) => e.sectionScores[s.number])
          .filter((v): v is number => v !== undefined);
        return {
          number: s.number,
          name: s.name,
          weight: s.weight,
          avg: round(mean(values)),
          min: values.length ? round(Math.min(...values)) : 0,
          max: values.length ? round(Math.max(...values)) : 0,
          criticalRate: values.length
            ? round(
                values.filter((v) => v <= CRITICAL_THRESHOLD).length /
                  values.length,
                3,
              )
            : 0,
          n: values.length,
        };
      });
      const criticalKpis = latest.reduce(
        (acc, e) =>
          acc + e.responses.filter((r) => r.score <= CRITICAL_THRESHOLD).length,
        0,
      );
      const measures = latest.flatMap((e) => e.measures);
      return {
        tool,
        evaluatedOrganisations: latest.length,
        completedEvaluations: ds.evaluations.filter(
          (e) => e.status === 'COMPLETED',
        ).length,
        avgGlobal: round(mean(globals)),
        medianGlobal: round(median(globals)),
        stdDevGlobal: round(stdDev(globals)),
        criticalOrganisations: globals.filter((g) => g <= CRITICAL_THRESHOLD)
          .length,
        highOrganisations: globals.filter((g) => g >= 7).length,
        histogram: histogram(globals, 5),
        sectionAverages,
        criticalKpis,
        measures: {
          total: measures.length,
          done: measures.filter((m) => m.status === 'DONE').length,
          inProgress: measures.filter((m) => m.status === 'IN_PROGRESS').length,
          avgProgress: round(mean(measures.map((m) => m.progressPct)), 0),
          coverage: criticalKpis
            ? round(
                new Set(measures.map((m) => m.indicatorCode)).size /
                  criticalKpis,
                3,
              )
            : 0,
        },
      };
    });

    // Tendencia mensual de evaluaciones completadas (promedio de puntaje global).
    const trendMap = new Map<string, Record<string, number[]>>();
    for (const tool of ASSESSMENT_TOOLS) {
      for (const e of data.tools[tool].evaluations) {
        if (
          e.status !== 'COMPLETED' ||
          !e.completedAt ||
          e.globalScore === null
        )
          continue;
        const key = monthKey(e.completedAt);
        const entry = trendMap.get(key) ?? {};
        (entry[tool] ??= []).push(e.globalScore);
        trendMap.set(key, entry);
      }
    }
    const trend = [...trendMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, byTool]) => ({
        month,
        ...Object.fromEntries(
          ASSESSMENT_TOOLS.map((t) => [
            t,
            byTool[t]
              ? { avg: round(mean(byTool[t])), count: byTool[t].length }
              : null,
          ]),
        ),
      }));

    return {
      organisations: data.profiles.length,
      evaluatedOrganisations: new Set(
        ASSESSMENT_TOOLS.flatMap((t) => [
          ...latestByProfile(data.tools[t]).keys(),
        ]),
      ).size,
      perTool,
      trend,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── 2. Brechas sistémicas ────────────────────────────────────────────────
  // prioridad = tasa crítica × peso del KPI × (umbral + 1 − promedio): un KPI
  // que falla en muchas organizaciones, pesa mucho y tiene promedio bajo
  // sube al tope — es la brecha que más conviene atacar de forma colectiva.
  async systemicGaps(
    organisation: string,
    scope: AnalyticsProfileScope,
    tool: AssessmentToolCode,
  ) {
    const data = await this.load(organisation, scope);
    const ds = data.tools[tool];
    const latest = [...latestByProfile(ds).values()];
    const profileById = new Map(data.profiles.map((p) => [p.id, p]));

    const gaps = ds.indicators
      .map((ind) => {
        const scores = latest
          .map(
            (e) => e.responses.find((r) => r.indicatorCode === ind.code)?.score,
          )
          .filter((s): s is number => s !== undefined);
        const criticalCount = scores.filter(
          (s) => s <= CRITICAL_THRESHOLD,
        ).length;
        const criticalRate = scores.length ? criticalCount / scores.length : 0;
        const avg = mean(scores);
        // Organizaciones donde este KPI es crítico, con su puntaje y si ya
        // registraron una medida — alimenta el detalle expandible del ranking.
        const criticalOrganisations = latest
          .map((e) => {
            const response = e.responses.find(
              (r) => r.indicatorCode === ind.code,
            );
            if (!response || response.score > CRITICAL_THRESHOLD) return null;
            const measure = e.measures.find(
              (m) => m.indicatorCode === ind.code,
            );
            return {
              profileId: e.profileId,
              profileName: profileById.get(e.profileId)?.name ?? e.profileId,
              score: response.score,
              hasMeasure: Boolean(measure),
              measureStatus: measure?.status ?? null,
              measureProgress: measure?.progressPct ?? null,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((a, b) => a.score - b.score);
        const withMeasure = criticalOrganisations.filter(
          (o) => o.hasMeasure,
        ).length;
        const section = ds.sections.find((s) => s.number === ind.sectionNumber);
        return {
          code: ind.code,
          name: ind.name,
          sectionNumber: ind.sectionNumber,
          sectionName: section?.name ?? '',
          weight: ind.weight,
          evaluated: scores.length,
          criticalCount,
          criticalRate: round(criticalRate, 3),
          avgScore: round(avg),
          withMeasure,
          measureCoverage: criticalCount
            ? round(withMeasure / criticalCount, 3)
            : 0,
          criticalOrganisations,
          priority: round(
            criticalRate *
              ind.weight *
              Math.max(0.5, CRITICAL_THRESHOLD + 1 - avg),
          ),
        };
      })
      .filter((g) => g.evaluated > 0)
      .sort((a, b) => b.priority - a.priority);

    const heatmap = latest
      .map((e) => ({
        profileId: e.profileId,
        profileName: profileById.get(e.profileId)?.name ?? e.profileId,
        globalScore: e.globalScore,
        sections: ds.sections.map((s) => ({
          number: s.number,
          score: e.sectionScores[s.number] ?? null,
        })),
      }))
      .sort((a, b) => (a.globalScore ?? 0) - (b.globalScore ?? 0));

    return {
      tool,
      sections: ds.sections,
      organisations: latest.length,
      gaps,
      heatmap,
    };
  }

  // ── 3. Correlaciones y drivers ───────────────────────────────────────────
  async correlations(organisation: string, scope: AnalyticsProfileScope) {
    const data = await this.load(organisation, scope);
    const latest = Object.fromEntries(
      ASSESSMENT_TOOLS.map((t) => [t, latestByProfile(data.tools[t])]),
    ) as Record<AssessmentToolCode, Map<string, AnalyticsEvaluation>>;

    // Drivers: correlación de cada sección con el puntaje global de su herramienta.
    const drivers = ASSESSMENT_TOOLS.map((tool) => {
      const evals = [...latest[tool].values()].filter(
        (e) => e.globalScore !== null,
      );
      const globals = evals.map((e) => e.globalScore as number);
      return {
        tool,
        n: evals.length,
        sections: data.tools[tool].sections
          .map((s) => {
            const pairs = evals
              .map((e, i) => [e.sectionScores[s.number], globals[i]] as const)
              .filter(
                (p): p is readonly [number, number] => p[0] !== undefined,
              );
            const r = pearson(
              pairs.map((p) => p[0]),
              pairs.map((p) => p[1]),
            );
            return {
              number: s.number,
              name: s.name,
              weight: s.weight,
              r,
              strength: correlationStrength(r),
              n: pairs.length,
            };
          })
          .sort((a, b) => (b.r ?? -2) - (a.r ?? -2)),
      };
    });

    // Cruce entre herramientas: sección de A vs sección de B, sobre organizaciones con ambas.
    const crossTool: {
      toolA: AssessmentToolCode;
      sectionA: number;
      nameA: string;
      toolB: AssessmentToolCode;
      sectionB: number;
      nameB: string;
      r: number | null;
      strength: ReturnType<typeof correlationStrength>;
      n: number;
    }[] = [];
    const pairs: [AssessmentToolCode, AssessmentToolCode][] = [
      ['ORGANIZATIONAL', 'CAPACITY'],
      ['ORGANIZATIONAL', 'RISK'],
      ['CAPACITY', 'RISK'],
    ];
    for (const [a, b] of pairs) {
      const shared = [...latest[a].keys()].filter((id) => latest[b].has(id));
      for (const sa of data.tools[a].sections) {
        for (const sb of data.tools[b].sections) {
          const xs: number[] = [];
          const ys: number[] = [];
          for (const id of shared) {
            const va = latest[a].get(id)?.sectionScores[sa.number];
            const vb = latest[b].get(id)?.sectionScores[sb.number];
            if (va !== undefined && vb !== undefined) {
              xs.push(va);
              ys.push(vb);
            }
          }
          const r = pearson(xs, ys);
          crossTool.push({
            toolA: a,
            sectionA: sa.number,
            nameA: sa.name,
            toolB: b,
            sectionB: sb.number,
            nameB: sb.name,
            r,
            strength: correlationStrength(r),
            n: xs.length,
          });
        }
      }
    }
    const topCrossTool = crossTool
      .filter((c) => c.r !== null && c.n >= MIN_SAMPLE)
      .sort((x, y) => Math.abs(y.r as number) - Math.abs(x.r as number))
      .slice(0, 10);

    // Puntaje global entre herramientas (¿la organización fuerte en una lo es en las demás?).
    const globalCross = pairs.map(([a, b]) => {
      const shared = [...latest[a].keys()].filter((id) => latest[b].has(id));
      const xs = shared
        .map((id) => latest[a].get(id)?.globalScore)
        .filter((v): v is number => v !== null && v !== undefined);
      const ys = shared
        .map((id) => latest[b].get(id)?.globalScore)
        .filter((v): v is number => v !== null && v !== undefined);
      const r = pearson(xs, ys);
      return {
        toolA: a,
        toolB: b,
        r,
        strength: correlationStrength(r),
        n: Math.min(xs.length, ys.length),
        points: shared.map((id) => ({
          profileId: id,
          x: latest[a].get(id)?.globalScore ?? null,
          y: latest[b].get(id)?.globalScore ?? null,
        })),
      };
    });

    // Factores del perfil: tamaño (socios) y antigüedad vs puntaje global.
    const year = new Date().getFullYear();
    const profileById = new Map(data.profiles.map((p) => [p.id, p]));
    const profileFactors = ASSESSMENT_TOOLS.map((tool) => {
      const evals = [...latest[tool].values()].filter(
        (e) => e.globalScore !== null,
      );
      const factor = (
        pick: (p: AnalyticsProfile) => number | null,
        key: string,
      ) => {
        const pts = evals
          .map((e) => ({
            x: pick(profileById.get(e.profileId) as AnalyticsProfile),
            y: e.globalScore as number,
            profileId: e.profileId,
          }))
          .filter(
            (p): p is { x: number; y: number; profileId: string } =>
              p.x !== null && p.x !== undefined,
          );
        const r = pearson(
          pts.map((p) => p.x),
          pts.map((p) => p.y),
        );
        return {
          key,
          r,
          strength: correlationStrength(r),
          n: pts.length,
          regression: linearRegression(
            pts.map((p) => p.x),
            pts.map((p) => p.y),
          ),
          points: pts,
        };
      };
      return {
        tool,
        memberCount: factor((p) => p.memberCount, 'memberCount'),
        age: factor(
          (p) => (p.yearStarted ? year - p.yearStarted : null),
          'age',
        ),
      };
    });

    return {
      drivers,
      crossTool,
      topCrossTool,
      globalCross,
      profileFactors,
      minSample: MIN_SAMPLE,
    };
  }

  // ── 4. Segmentación ──────────────────────────────────────────────────────
  async segments(
    organisation: string,
    scope: AnalyticsProfileScope,
    by: SegmentKey,
  ) {
    const data = await this.load(organisation, scope);
    const groups = new Map<string, AnalyticsProfile[]>();
    for (const p of data.profiles) {
      const key = (p[by] as string | null) || '—';
      (groups.get(key) ?? groups.set(key, []).get(key))!.push(p);
    }
    const latest = Object.fromEntries(
      ASSESSMENT_TOOLS.map((t) => [t, latestByProfile(data.tools[t])]),
    ) as Record<AssessmentToolCode, Map<string, AnalyticsEvaluation>>;
    const rows = [...groups.entries()]
      .map(([key, profiles]) => ({
        key,
        organisations: profiles.length,
        tools: Object.fromEntries(
          ASSESSMENT_TOOLS.map((tool) => {
            const evals = profiles
              .map((p) => latest[tool].get(p.id))
              .filter(
                (e): e is AnalyticsEvaluation => !!e && e.globalScore !== null,
              );
            const globals = evals.map((e) => e.globalScore as number);
            const critical = evals.reduce(
              (acc, e) =>
                acc +
                e.responses.filter((r) => r.score <= CRITICAL_THRESHOLD).length,
              0,
            );
            return [
              tool,
              {
                n: evals.length,
                avgGlobal: round(mean(globals)),
                stdDev: round(stdDev(globals)),
                criticalKpiAvg: evals.length
                  ? round(critical / evals.length, 1)
                  : 0,
                criticalOrganisations: globals.filter(
                  (g) => g <= CRITICAL_THRESHOLD,
                ).length,
              },
            ];
          }),
        ),
      }))
      .sort((a, b) => b.organisations - a.organisations);
    return { by, segments: rows };
  }

  // ── 5. Efectividad de las medidas ────────────────────────────────────────
  // Para cada organización con ≥ 2 evaluaciones completadas de una herramienta
  // compara, KPI por KPI, la primera con la última: Δ = último − primero.
  // Separa los KPI críticos que recibieron una medida (concluida / en curso)
  // de los que no la recibieron. Si Δ(con medida) > Δ(sin medida) las medidas
  // están funcionando; el ratio de medidas concluidas se correlaciona con la
  // mejora global.
  async measureEffectiveness(
    organisation: string,
    scope: AnalyticsProfileScope,
  ) {
    const data = await this.load(organisation, scope);
    const profileById = new Map(data.profiles.map((p) => [p.id, p]));
    const perTool = ASSESSMENT_TOOLS.map((tool) => {
      const byProfile = completedByProfile(data.tools[tool]);
      const organisations: {
        profileId: string;
        profileName: string;
        evaluations: number;
        firstScore: number;
        lastScore: number;
        delta: number;
        measuresTotal: number;
        measuresDone: number;
        firstDate: Date;
        lastDate: Date;
      }[] = [];
      const deltas = {
        withDoneMeasure: [] as number[],
        withOpenMeasure: [] as number[],
        withoutMeasure: [] as number[],
        nonCritical: [] as number[],
      };

      for (const [profileId, evals] of byProfile) {
        if (evals.length < 2) continue;
        const first = evals[0];
        const last = evals[evals.length - 1];
        const measuresBefore = evals.slice(0, -1).flatMap((e) => e.measures);
        const doneCodes = new Set(
          measuresBefore
            .filter((m) => m.status === 'DONE')
            .map((m) => m.indicatorCode),
        );
        const openCodes = new Set(
          measuresBefore
            .filter((m) => m.status !== 'DONE')
            .map((m) => m.indicatorCode),
        );
        for (const r0 of first.responses) {
          const r1 = last.responses.find(
            (r) => r.indicatorCode === r0.indicatorCode,
          );
          if (!r1) continue;
          const delta = r1.score - r0.score;
          if (r0.score > CRITICAL_THRESHOLD) deltas.nonCritical.push(delta);
          else if (doneCodes.has(r0.indicatorCode))
            deltas.withDoneMeasure.push(delta);
          else if (openCodes.has(r0.indicatorCode))
            deltas.withOpenMeasure.push(delta);
          else deltas.withoutMeasure.push(delta);
        }
        organisations.push({
          profileId,
          profileName: profileById.get(profileId)?.name ?? profileId,
          evaluations: evals.length,
          firstScore: first.globalScore ?? 0,
          lastScore: last.globalScore ?? 0,
          delta: round((last.globalScore ?? 0) - (first.globalScore ?? 0)),
          measuresTotal: measuresBefore.length,
          measuresDone: measuresBefore.filter((m) => m.status === 'DONE')
            .length,
          firstDate: first.completedAt as Date,
          lastDate: last.completedAt as Date,
        });
      }
      const ratios = organisations.map((o) =>
        o.measuresTotal ? o.measuresDone / o.measuresTotal : 0,
      );
      const r = pearson(
        ratios,
        organisations.map((o) => o.delta),
      );
      const summarize = (values: number[]) => ({
        n: values.length,
        avgDelta: round(mean(values)),
        improved: values.filter((v) => v > 0).length,
        improvedRate: values.length
          ? round(values.filter((v) => v > 0).length / values.length, 3)
          : 0,
      });
      return {
        tool,
        organisationsWithHistory: organisations.length,
        avgGlobalDelta: round(mean(organisations.map((o) => o.delta))),
        groups: {
          withDoneMeasure: summarize(deltas.withDoneMeasure),
          withOpenMeasure: summarize(deltas.withOpenMeasure),
          withoutMeasure: summarize(deltas.withoutMeasure),
          nonCritical: summarize(deltas.nonCritical),
        },
        effect: round(
          mean(deltas.withDoneMeasure) - mean(deltas.withoutMeasure),
        ),
        doneRatioVsDelta: {
          r,
          strength: correlationStrength(r),
          n: organisations.length,
        },
        organisations: organisations.sort((a, b) => b.delta - a.delta),
      };
    });
    return { perTool };
  }

  // ── 6. Clústeres (k-means sobre el perfil de secciones) ──────────────────
  async clusters(
    organisation: string,
    scope: AnalyticsProfileScope,
    tool: AssessmentToolCode,
    k: number,
  ) {
    const data = await this.load(organisation, scope);
    const ds = data.tools[tool];
    const latest = [...latestByProfile(ds).values()].filter(
      (e) => e.globalScore !== null,
    );
    const profileById = new Map(data.profiles.map((p) => [p.id, p]));
    const dims = ds.sections.map((s) => s.number);
    const points = latest.map((e) => dims.map((n) => e.sectionScores[n] ?? 0));
    const result = kMeans(points, Math.max(1, Math.min(k, 6)));
    const clusters = result.centroids.map((centroid, ci) => {
      const members = latest.filter((_, i) => result.assignments[i] === ci);
      const avg = mean(centroid);
      const ranked = centroid
        .map((v, i) => ({
          number: dims[i],
          name: ds.sections[i].name,
          value: round(v),
        }))
        .sort((a, b) => b.value - a.value);
      return {
        index: ci,
        // `level` es el código estable (el cliente lo traduce); `label` se
        // conserva por compatibilidad.
        level:
          avg >= 7
            ? ('HIGH' as const)
            : avg > CRITICAL_THRESHOLD
              ? ('MEDIUM' as const)
              : ('INTERVENTION' as const),
        label:
          avg >= 7
            ? 'Alto desempeño'
            : avg > CRITICAL_THRESHOLD
              ? 'Desempeño medio'
              : 'Requiere intervención',
        size: members.length,
        avgGlobal: round(mean(members.map((m) => m.globalScore as number))),
        centroid: dims.map((n, i) => ({
          number: n,
          name: ds.sections[i].name,
          value: centroid[i],
        })),
        strongest: ranked[0] ?? null,
        weakest: ranked[ranked.length - 1] ?? null,
        members: members
          .map((m) => ({
            profileId: m.profileId,
            profileName: profileById.get(m.profileId)?.name ?? m.profileId,
            globalScore: m.globalScore,
            country: profileById.get(m.profileId)?.country ?? '',
          }))
          .sort((a, b) => (b.globalScore ?? 0) - (a.globalScore ?? 0)),
      };
    });
    return {
      tool,
      k: result.centroids.length,
      iterations: result.iterations,
      sections: ds.sections,
      clusters: clusters.sort((a, b) => b.avgGlobal - a.avgGlobal),
    };
  }

  // ── 7. Posición relativa de una organización (benchmark) ─────────────────
  async benchmark(
    organisation: string,
    scope: AnalyticsProfileScope,
    profileId: string,
  ) {
    const data = await this.load(organisation, scope);
    const profile = data.profiles.find((p) => p.id === profileId);
    if (!profile)
      throw new NotFoundException('Assessment organisation profile not found');
    const tools = ASSESSMENT_TOOLS.map((tool) => {
      const latest = latestByProfile(data.tools[tool]);
      const own = latest.get(profileId);
      const all = [...latest.values()]
        .map((e) => e.globalScore)
        .filter((g): g is number => g !== null);
      if (!own || own.globalScore === null) return { tool, evaluated: false };
      return {
        tool,
        evaluated: true,
        globalScore: own.globalScore,
        cohortAvg: round(mean(all)),
        percentile: percentileRank(own.globalScore, all),
        rank: all.filter((g) => g > own.globalScore).length + 1,
        cohort: all.length,
        sections: data.tools[tool].sections.map((s) => {
          const values = [...latest.values()]
            .map((e) => e.sectionScores[s.number])
            .filter((v): v is number => v !== undefined);
          const ownValue = own.sectionScores[s.number] ?? null;
          return {
            number: s.number,
            name: s.name,
            own: ownValue,
            cohortAvg: round(mean(values)),
            gap: ownValue === null ? null : round(ownValue - mean(values)),
          };
        }),
      };
    });
    return { profile, tools };
  }
}

export type AssessmentAnalyticsDataset = AnalyticsDataset;
