const env = process.env;
const API = (env.API_URL ?? 'http://localhost:3100').replace(/\/$/, '');
const ORG = env.ORG ?? 'demo';
const REPEAT = Number(env.REPETICIONES ?? 3);
const PER_TOOL = Number(env.EVALUACIONES ?? 1);
const LIMIT_MS = 10_000;

if (!env.EMAIL || !env.PASSWORD) {
  console.error('Faltan EMAIL y PASSWORD.');
  process.exit(2);
}

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.EMAIL, password: env.PASSWORD }),
});
if (!login.ok) {
  console.error(`No se pudo iniciar sesión (${login.status}).`);
  process.exit(2);
}
const { accessToken } = await login.json();
const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};

const TOOLS = {
  Organizativa: ['organizational', 'summary/export-pptx'],
  Capacidades: ['capacity', 'summary/export-pptx'],
  Riesgos: ['risk', 'mitigation-plan/export-pptx'],
};

const rows = [];
for (const [label, [tool, path]] of Object.entries(TOOLS)) {
  const base = `${API}/${ORG}/assessments/${tool}/evaluations`;
  const list = await (await fetch(base, { headers })).json();
  const completed = (Array.isArray(list) ? list : (list.items ?? []))
    .filter((e) => e.status === 'COMPLETED')
    .slice(0, PER_TOOL);
  for (const evaluation of completed) {
    for (let i = 1; i <= REPEAT; i++) {
      const start = performance.now();
      const res = await fetch(`${base}/${evaluation.id}/${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ganttScope: 'project' }),
      });
      const size = (await res.arrayBuffer()).byteLength;
      rows.push({
        herramienta: label,
        exportacion: i,
        estado: res.status,
        segundos: +((performance.now() - start) / 1000).toFixed(2),
        KB: Math.round(size / 1024),
      });
    }
  }
}

console.table(rows);
const ok = rows.length > 0 && rows.every((r) => r.estado < 300);
const slowest = Math.max(...rows.map((r) => r.segundos));
console.log(`Máximo: ${slowest} s (límite ${LIMIT_MS / 1000} s)`);
console.log(
  ok && slowest * 1000 < LIMIT_MS ? 'CA-69.1: CUMPLE' : 'CA-69.1: NO CUMPLE',
);
process.exit(ok && slowest * 1000 < LIMIT_MS ? 0 : 1);
