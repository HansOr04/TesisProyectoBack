// Prueba de carga del guardado de calificaciones (HU-68, RNF-04).
//
// Simula USUARIOS evaluadores calificando a la vez la misma evaluación en
// curso durante DURACION_S segundos y mide el tiempo de respuesta del
// guardado (PUT .../responses). CA-68.1: con 20 usuarios, el 95 % responde en
// menos de 1 segundo.
//
// Uso (sin dependencias, Node 18 o superior):
//   API_URL=https://<servidor> ORG=<proyecto> EVALUACION_ID=<id> \
//   CUENTAS=<archivo> node scripts/carga-guardado.mjs
//
// CUENTAS es un archivo con una cuenta por línea («correo contraseña»): cada
// evaluador simulado usa la suya y todos inician sesión a la vez, como al
// empezar un taller. Con EMAIL y PASSWORD en lugar de CUENTAS, todos
// comparten una sola sesión.
//
// Variables opcionales: HERRAMIENTA (organizational | capacity, por defecto
// organizational), USUARIOS (20), DURACION_S (60), PAUSA_MS (3000, la espera
// del guardado automático de la web entre un cambio y el siguiente).
//
// Escribe calificaciones de verdad: usar una evaluación de prueba.

const env = process.env;
const API = (env.API_URL ?? 'http://localhost:3100').replace(/\/$/, '');
const ORG = env.ORG ?? 'demo';
const TOOL = env.HERRAMIENTA ?? 'organizational';
const USERS = Number(env.USUARIOS ?? 20);
const DURATION_MS = Number(env.DURACION_S ?? 60) * 1000;
const PAUSE_MS = Number(env.PAUSA_MS ?? 3000);
const LIMIT_MS = 1000;

const fs = await import('node:fs');
const accounts = env.CUENTAS
  ? fs
      .readFileSync(env.CUENTAS, 'utf8')
      .split('\n')
      .map((l) => l.trim().split(/\s+/))
      .filter(([email, password]) => email && password)
      .map(([email, password]) => ({ email, password }))
  : env.EMAIL && env.PASSWORD
    ? [{ email: env.EMAIL, password: env.PASSWORD }]
    : [];
if (!env.EVALUACION_ID || accounts.length === 0) {
  console.error('Faltan EVALUACION_ID y CUENTAS (o EMAIL y PASSWORD).');
  process.exit(2);
}

// Todos inician sesión a la vez, como al empezar un taller.
const loginStatuses = new Map();
const sessions = await Promise.all(
  accounts.slice(0, USERS).map(async ({ email, password }) => {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    loginStatuses.set(r.status, (loginStatuses.get(r.status) ?? 0) + 1);
    if (!r.ok) return null;
    const { accessToken } = await r.json();
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }),
);
const logged = sessions.filter(Boolean);
console.log(
  `Inicios de sesión: ${JSON.stringify(Object.fromEntries(loginStatuses))}`,
);
if (logged.length === 0) {
  console.error('Ninguna cuenta pudo iniciar sesión.');
  process.exit(1);
}
const headers = logged[0];

const base = `${API}/${ORG}/assessments/${TOOL}/evaluations/${env.EVALUACION_ID}`;
const evaluation = await fetch(base, { headers }).then((r) => r.json());
const indicators = (evaluation.template?.sections ?? [])
  .flatMap((s) => s.indicators)
  .filter((i) => i.active !== false && i.applicable !== false);
if (indicators.length === 0) {
  console.error('La evaluación no tiene KPI para calificar.');
  process.exit(1);
}

const latencies = [];
const statuses = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = Date.now() + DURATION_MS;

async function evaluator(n) {
  const headers = logged[(n - 1) % logged.length];
  // Cada evaluador empieza en un momento distinto, como en un taller real.
  await sleep(Math.random() * PAUSE_MS);
  while (Date.now() < until) {
    const indicator = indicators[Math.floor(Math.random() * indicators.length)];
    const body = JSON.stringify({
      responses: [
        {
          indicatorId: indicator.id,
          score: 1 + Math.floor(Math.random() * 10),
          observation: `Prueba de carga · evaluador ${n} · ${new Date().toISOString()}`,
        },
      ],
    });
    const t0 = performance.now();
    let status = 'error de red';
    try {
      const r = await fetch(`${base}/responses`, {
        method: 'PUT',
        headers,
        body,
      });
      await r.arrayBuffer();
      status = r.status;
    } catch {
      /* se cuenta como error de red */
    }
    latencies.push(performance.now() - t0);
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
    await sleep(PAUSE_MS);
  }
}

console.log(
  `${USERS} evaluadores · ${DURATION_MS / 1000} s · pausa ${PAUSE_MS} ms · ${indicators.length} KPI · ${API}`,
);
await Promise.all(Array.from({ length: USERS }, (_, i) => evaluator(i + 1)));

latencies.sort((a, b) => a - b);
const pct = (p) =>
  latencies[
    Math.min(latencies.length - 1, Math.ceil((p / 100) * latencies.length) - 1)
  ];
const ok = statuses.get(200) ?? 0;
const p95 = pct(95);
console.log(
  `Guardados: ${latencies.length} · respuestas: ${JSON.stringify(Object.fromEntries(statuses))}`,
);
console.log(
  `Tiempo (ms): p50 ${pct(50).toFixed(0)} · p95 ${p95.toFixed(0)} · p99 ${pct(99).toFixed(0)} · máximo ${latencies.at(-1).toFixed(0)}`,
);
const passed = p95 < LIMIT_MS && ok === latencies.length;
console.log(
  passed
    ? `CUMPLE: el 95 % respondió en menos de ${LIMIT_MS} ms y todos los guardados fueron correctos.`
    : `NO CUMPLE: p95 ${p95.toFixed(0)} ms, ${latencies.length - ok} guardados con error.`,
);
process.exit(passed ? 0 : 1);
