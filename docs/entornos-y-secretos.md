# Entornos, variables y secretos

Cómo se separan los entornos de la plataforma y dónde vive cada variable
(HU-63, HU-64). Este documento lista solo **nombres**: ningún valor real se
guarda en el repositorio.

## Entornos

| Entorno | Aplicación web | Servidor | Base de datos | Se actualiza |
|---|---|---|---|---|
| Local | `localhost:5173` (Vite) | `localhost:3100` | PostgreSQL en Docker (`docker-compose.yml`, puerto 5434) con el seed de demostración | A mano |
| Pruebas automáticas | Compilación en GitHub Actions | Jest y Supertest en GitHub Actions | PostgreSQL 15 desechable, creada y destruida en cada ejecución | En cada pull request a `develop` y a `main` |
| Vista previa de la web | URL propia de Vercel por cada pull request (entorno *Preview*) | La API de la demo | La de la demo | En cada pull request del repositorio web |
| **Demo desplegada (entorno de pruebas con la fundación)** | Vercel, entorno *Production* (`evaluar-ochre.vercel.app`) | Heroku, aplicación `evaluartesis` | Heroku Postgres (complemento de la aplicación) | Al integrar en `main`, solo con la integración continua en verde |

Flujo de un cambio: rama `feature/*` o `fix/*` → pull request a `develop`
(pruebas automáticas) → pull request de versión a `main` (pruebas otra vez)
→ Vercel y Heroku publican la demo. `main` y `develop` están protegidas: no
aceptan cambios sin pull request ni con las pruebas en rojo.

## Variables y dónde vive cada una

Los valores reales están **solo** en el gestor de cada servicio. En GitHub
quedan los nombres, en los `.env.example` de cada repositorio, con valores
de ejemplo.

### Servidor — Heroku › Settings › Config Vars

| Variable | Secreta | Notas |
|---|---|---|
| `DATABASE_URL` | Sí | La define el complemento Heroku Postgres. No se escribe a mano. |
| `JWT_SECRET` | Sí | Al menos 32 caracteres aleatorios (`openssl rand -base64 48`). El servidor no arranca en producción con uno más corto. Cambiarlo cierra todas las sesiones. |
| `GEMINI_API_KEY`, `NVIDIA_API_KEY` | Sí | Claves del modelo de lenguaje. Sin ellas la IA responde «no configurada» (503). |
| `GOOGLE_OAUTH_CLIENT_ID` | No | Identificador público de OAuth; debe coincidir con el de la web. |
| `SEED_ADMIN_PASSWORD` | Sí | Solo para `npm run prisma:seed:prod`; se puede borrar después. |
| `CORS_ORIGIN` | No | URL de la web en Vercel. |
| `NODE_ENV` | No | `production`. |
| `PORT` | No | La define Heroku. |
| `JWT_EXPIRES_IN`, `REFRESH_TOKEN_TTL_DAYS`, `ACTIVITY_LOG_RETENTION_MONTHS`, `AI_PROVIDER`, `GEMINI_MODEL`, `NVIDIA_MODEL`, `EXPORT_MAX_CONCURRENCY`, `EXPORT_MAX_QUEUED`, `SEED_ORGANISATION_ID`, `SEED_ORGANISATION_NAME`, `SEED_ADMIN_EMAIL` | No | Configuración; los valores por defecto están en `.env.example`. |

### Aplicación web — Vercel › Settings › Environment Variables

| Variable | Secreta | Notas |
|---|---|---|
| `VITE_API_URL` | No | URL del servidor en Heroku, sin `/api`. |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | No | El mismo identificador de OAuth del servidor. |

Todo lo que empieza con `VITE_` termina dentro del JavaScript que descarga el
navegador, así que **nunca** debe llevar una clave secreta.

### GitHub Actions

La integración continua no usa secretos: genera un `JWT_SECRET` de prueba con
`openssl` en cada ejecución y levanta su propia base PostgreSQL desechable.

## Reglas

- Ningún archivo `.env` real se sube al repositorio: `.gitignore` ignora `.env`
  y cualquier `.env.*`, salvo `.env.example`.
- GitGuardian revisa cada pull request en busca de claves filtradas.
- Si una clave se filtra, se revoca en su proveedor y se reemplaza en Heroku o
  Vercel; borrarla del código no basta, porque queda en el historial.
- Las contraseñas `admin123` y `evaluador123` del seed son solo para el entorno
  local; el seed de producción exige `SEED_ADMIN_PASSWORD`.

## Verificación del 8 de noviembre de 2026

- Historial completo de los dos repositorios (68 y 82 commits): ningún archivo
  `.env` versionado y ninguna coincidencia con patrones de claves (Google,
  NVIDIA, GitHub, Heroku, URL de PostgreSQL con contraseña, claves privadas,
  `JWT_SECRET` o claves de IA con valor).
- GitHub no guarda secretos ni variables en ninguno de los dos repositorios ni
  en sus entornos.
