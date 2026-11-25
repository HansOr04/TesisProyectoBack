# Manual técnico · Evalúa

Para el equipo que mantenga la plataforma: cómo está hecha, cómo se instala en
local, cómo se despliega y cómo se restaura un respaldo.

## 1. Arquitectura

| Parte | Tecnología | Repositorio | Dónde corre |
|---|---|---|---|
| Web | React 18, Vite, TanStack Router y Query | [TesisFrontend](https://github.com/HansOr04/TesisFrontend) | Vercel |
| API y tiempo real | NestJS 10, Prisma 5, Socket.IO | [TesisProyectoBack](https://github.com/HansOr04/TesisProyectoBack) | Heroku (`evaluartesis`) |
| Base de datos | PostgreSQL | Migraciones en `prisma/migrations` | Heroku Postgres |
| IA | Gemini (o NVIDIA) | `src/modules/assessment-ai` | Servicio externo |

```mermaid
flowchart LR
  N[Navegador] -->|páginas| V[Vercel]
  N -->|/auth, cookie de sesión| V -->|reenvía /auth| H[API en Heroku]
  N -->|datos, Bearer| H
  N <-->|Socket.IO| H
  H --> P[(PostgreSQL)]
  H --> G[Gemini]
```

### Servidor

Cada módulo de `src/modules` se divide en `domain` (reglas puras), `application`
(casos de uso), `infrastructure` (base, reportes) y `presentation` (rutas y
guardas).

| Módulo | Qué hace |
|---|---|
| `identity` | Sesión, usuarios, proyectos y autorización |
| `assessment-core` | Organizaciones evaluadas, roles, alcance, aplicabilidad, panel y plan consolidado |
| `evaluation-tool` | Motor común de las herramientas: plantillas, calificación, resumen, medidas, IA y reportes |
| `organizational-tool`, `capacity-tool` | Configuración de esas dos herramientas sobre el motor común |
| `risk-tool` | Herramienta de Riesgos: riesgo, mitigación y parámetros por país |
| `assessment-session` | Avance en vivo entre facilitadores |
| `assessment-analytics` | Analítica del conjunto |
| `assessment-ai` | Cliente del modelo, con caché y límites |
| `audit` | Auditoría y su retención |

### Conceptos que conviene conocer

- **Proyecto** (`Organisation`). Es el inquilino: todas las tablas llevan
  `organisation` y casi todas las rutas empiezan por `/:org`. La **organización
  evaluada** es `AssessmentOrganisationProfile`.
- **Acceso.** Tres capas: `JwtAuthGuard` (sesión y pertenencia al proyecto; una
  ruta sin declaración se rechaza), `AssessmentPermissionGuard` (permiso del
  rol) y `AssessmentScopeGuard` (organizaciones que ve un evaluador o un
  visualizador). Un superadministrador solo tiene acceso total en los proyectos
  que creó.
- **Sesión.** El token de acceso vive en memoria del navegador. El de renovación
  va en una cookie HttpOnly, rota en cada uso y tolera 30 segundos de pestañas
  simultáneas.
- **Plantillas con versiones.** Cambiar la estructura de una herramienta con
  evaluaciones crea una versión nueva; las evaluaciones viejas conservan la suya.
- **Evaluación completada.** Es de solo lectura.
- **Reportes.** PowerPoint con `pptxgenjs` y Excel con ExcelJS, en
  `shared/infrastructure/reports`. La IA tiene 8 segundos; si no llega, el reporte
  sale con textos calculados.

### Web

`src/routes` define las páginas (el nombre del archivo es la ruta) y
`src/modules` repite la división por capas. Los textos están en
`src/shared/i18n/{es,en}.json`. Lo calificado sin conexión se encola en IndexedDB
(`src/modules/realtime`).

## 2. Instalar en local

Requisitos: Node 22, Git y Docker. Probado desde cero el 25 de noviembre de 2026.

```bash
# Base de datos
docker run -d --name evalua-pg -p 5434:5432 -e POSTGRES_USER=assessment \
  -e POSTGRES_PASSWORD=assessment -e POSTGRES_DB=assessment postgres:15-alpine

# Servidor, en http://localhost:3100 (Swagger en /api/docs)
git clone -b develop https://github.com/HansOr04/TesisProyectoBack.git
cd TesisProyectoBack
cp .env.example .env        # y cambiar JWT_SECRET: openssl rand -base64 48
npm ci
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

# Web, en otra terminal: http://localhost:5173
git clone -b develop https://github.com/HansOr04/TesisFrontend.git
cd TesisFrontend
cp .env.example .env
npm ci
npm run dev
```

Las cuentas iniciales son las de `SEED_*` en `.env`. `npm run prisma:seed:demo`
agrega datos de demostración. Sin `GEMINI_API_KEY` todo funciona menos la IA.

| Comando | Servidor | Web |
|---|---|---|
| Estilo | `npm run lint` | `npm run lint` |
| Tipos | `npx tsc --noEmit` | `npm run typecheck` |
| Unitarias | `npm test` | `npm test` |
| Integración (necesita la base con seed) | `npm run test:e2e` | |
| Mutación | `npm run test:mutation` | `npm run test:mutation` |

**Cambiar la base de datos:** editar `prisma/schema.prisma` y ejecutar
`npx prisma migrate dev --name <descripcion>`. Nunca editar una migración ya
publicada. Como Heroku aplica la migración antes de arrancar la versión nueva,
debe ser compatible con la que está corriendo.

**Agregar una ruta:** declarar su acceso con `@RequireAuthenticated()`, su
permiso con `@RequireAssessmentPermission` y, si toca datos de una organización,
`@ScopedTo`. `test/security-routes.e2e-spec.ts` falla si queda abierta.

## 3. Desplegar

1. Rama `feature/*` o `fix/*` desde `develop`. Commits con Conventional Commits.
2. Pull request a `develop`. El pipeline (`.github/workflows/ci.yml`) corre en
   paralelo estilo, tipos, cobertura, integración, migraciones, mutación,
   seguridad y CodeQL. Si algo falla, no se puede integrar.
3. Pull request de versión de `develop` a `main`. El pipeline corre otra vez.
4. Al integrar en `main`, Heroku espera el pipeline en verde, compila, aplica las
   migraciones y publica. Vercel publica la web. Primero el servidor y después la
   web cuando un cambio abarca los dos.
5. «Despliegue» espera a que termine y verifica producción. Después se sigue la
   [lista de verificación](lista-verificacion.md).

Antes de una versión con migraciones se saca un respaldo:

```bash
heroku pg:backups:capture -a evaluartesis
```

**Volver atrás.** Servidor: `heroku rollback -a evaluartesis`; no deshace
migraciones. Web: panel de Vercel › Deployments › Instant Rollback. Si una
migración dañó datos, se restaura el respaldo previo.

Variables y secretos: [entornos-y-secretos.md](entornos-y-secretos.md).

**Publicar en un entorno nuevo.** En Heroku: crear la aplicación, agregar Heroku
Postgres, definir las variables, conectar el repositorio con despliegue
automático de `main` («Wait for CI») y ejecutar una vez `npm run prisma:seed:prod`.
En Vercel: importar el repositorio y definir `VITE_API_URL`. Cambiar la URL del
servidor en `vercel.json`, y las de `despliegue.yml` y `vigilancia.yml`.

## 4. Restaurar un respaldo

Hay un respaldo diario a las 03:00 (Guayaquil), con 7 días de historia. Probarlo
en una base desechable, sin tocar producción:

```bash
heroku pg:backups -a evaluartesis
heroku pg:backups:download <id> -a evaluartesis
heroku pg:info -a evaluartesis | grep 'PG Version'
docker run -d --name restauracion -e POSTGRES_PASSWORD=restauracion -p 5436:5432 postgres:<versión>
docker cp latest.dump restauracion:/latest.dump
docker exec restauracion pg_restore --no-owner --no-acl -U postgres -d postgres /latest.dump
```

Levantar el servidor contra esa base
(`DATABASE_URL=postgresql://postgres:restauracion@localhost:5436/postgres`),
revisar los datos y borrar el contenedor y el archivo, que tiene datos reales.

Restaurar en producción **reemplaza todos los datos**. Solo ante una falla real:

```bash
heroku maintenance:on -a evaluartesis
heroku pg:backups:capture -a evaluartesis
heroku pg:backups:restore <id> DATABASE_URL -a evaluartesis --confirm evaluartesis
heroku run npx prisma migrate deploy -a evaluartesis
heroku maintenance:off -a evaluartesis
```

Detalle y pruebas hechas: [respaldos.md](respaldos.md).

## 5. Operación

| Documento | Para qué |
|---|---|
| [monitoreo.md](monitoreo.md) | Registros, alertas y qué hacer ante una falla |
| [seguridad.md](seguridad.md) | Revisión OWASP y riesgos aceptados |
| [rendimiento.md](rendimiento.md) | Mediciones de guardado y reportes |
| [puesta-en-marcha.md](puesta-en-marcha.md) | Carga de datos reales y capacitación |
