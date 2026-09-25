// Funciones estadísticas puras usadas por la analítica. Sin dependencias:
// fáciles de probar y de citar en la memoria de tesis.

export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Desviación estándar muestral (n-1); 0 si hay menos de 2 valores. */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Percentil (0–100) que ocupa `value` dentro de `population` (fracción de valores ≤ value). */
export function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 0;
  const below = population.filter((v) => v <= value).length;
  return round((below / population.length) * 100, 0);
}

/** Coeficiente de correlación de Pearson; null si no hay variabilidad o n < 3. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return round(num / Math.sqrt(dx * dy), 3);
}

export type CorrelationStrength = 'strong' | 'moderate' | 'weak' | 'none';

export function correlationStrength(r: number | null): CorrelationStrength {
  if (r === null) return 'none';
  const a = Math.abs(r);
  if (a >= 0.7) return 'strong';
  if (a >= 0.4) return 'moderate';
  if (a >= 0.2) return 'weak';
  return 'none';
}

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

/** Histograma de valores 0–10 en `bins` intervalos iguales (el último incluye el 10). */
export function histogram(
  values: number[],
  bins = 5,
  min = 0,
  max = 10,
): HistogramBin[] {
  const width = (max - min) / bins;
  const result: HistogramBin[] = Array.from({ length: bins }, (_, i) => ({
    from: round(min + i * width, 2),
    to: round(min + (i + 1) * width, 2),
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    result[idx].count += 1;
  }
  return result;
}

export interface KMeansResult {
  centroids: number[][];
  assignments: number[];
  iterations: number;
}

function distance(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/**
 * K-means determinístico: centroides iniciales espaciados por el orden de la
 * suma de componentes (evita aleatoriedad para que el resultado sea
 * reproducible en la memoria). Lloyd hasta converger o `maxIterations`.
 */
export function kMeans(
  points: number[][],
  k: number,
  maxIterations = 50,
): KMeansResult {
  if (points.length === 0)
    return { centroids: [], assignments: [], iterations: 0 };
  const kk = Math.max(1, Math.min(k, points.length));
  const order = points
    .map((p, i) => ({ i, total: p.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => a.total - b.total);
  let centroids = Array.from({ length: kk }, (_, c) => {
    const idx = order[Math.floor(((c + 0.5) * order.length) / kk)].i;
    return [...points[idx]];
  });
  let assignments = new Array(points.length).fill(0);
  let iterations = 0;
  for (; iterations < maxIterations; iterations++) {
    const next = points.map((p) => {
      let best = 0;
      let bestD = Infinity;
      centroids.forEach((c, ci) => {
        const d = distance(p, c);
        if (d < bestD) {
          bestD = d;
          best = ci;
        }
      });
      return best;
    });
    const changed = next.some((a, i) => a !== assignments[i]);
    assignments = next;
    centroids = centroids.map((c, ci) => {
      const members = points.filter((_, i) => assignments[i] === ci);
      if (members.length === 0) return c;
      return c.map((_, dim) => mean(members.map((m) => m[dim])));
    });
    if (!changed && iterations > 0) break;
  }
  return {
    centroids: centroids.map((c) => c.map((v) => round(v, 2))),
    assignments,
    iterations,
  };
}

/** Regresión lineal simple y = a + b·x; null si x no varía o n < 3. */
export function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number; r2: number } | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return {
    slope: round(slope, 4),
    intercept: round(intercept, 4),
    r2: round(r2, 3),
  };
}
