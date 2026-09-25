# Terra360 — API

Backend de la plataforma de evaluación organizacional (NestJS + Prisma + PostgreSQL).

Arquitectura por módulos con clean architecture (domain / application / infrastructure / presentation).
Herramientas: Organizativa, de Capacidades y de Riesgos, todas sobre el mismo motor genérico de evaluación (`evaluation-tool`).

## Desarrollo

```bash
npm install
npx prisma migrate deploy
npm run start:dev
```

API en `http://localhost:3100` (Swagger en `/api/docs`). Variables de entorno: ver `.env.example`.

| Comando | Qué hace |
|---|---|
| `npm run bootstrap` | `docker compose up postgres` + `prisma migrate deploy` + seed |
| `npm run prisma:seed:demo` | datos de demo reproducibles (semilla fija) para poblar analítica |
| `npm run prisma:seed:prod` | bootstrap de un entorno real: solo organización + superadmin |
| `npm test` / `npm run test:e2e` | unitarias / e2e (con BD) |

## Analítica (`src/modules/assessment-analytics`)

| Endpoint | Cálculo |
|---|---|
| `GET /:org/assessments/analytics/overview` | promedio/mediana/σ por herramienta, histograma, promedio por sección, tendencia mensual, cobertura de medidas |
| `…/gaps?tool=` | prioridad sistémica por KPI = tasa crítica × peso × (6 − promedio); mapa de calor organización × sección |
| `…/correlations` | Pearson: sección vs global (drivers), sección×sección entre herramientas, global entre herramientas, nº socios / antigüedad vs global (+ regresión lineal) |
| `…/segments?by=country\|region\|type\|mainProduct` | promedio, σ y KPI críticos por grupo |
| `…/effectiveness` | Δ por KPI entre primera y última evaluación, según si el KPI crítico tuvo medida concluida / en curso / ninguna; efecto = Δ(con medida) − Δ(sin medida) |
| `…/clusters?tool=&k=` | k-means determinístico sobre el vector de puntajes por sección |
| `…/benchmark/:profileId` | percentil, ranking y brecha por sección frente a la cohorte |

## Usuarios y permisos (`identity`)

| Endpoint | Permiso | Descripción |
|---|---|---|
| `GET /:org/users` | `assessment-core:admin` | miembros de la organización con sus roles |
| `POST /:org/users` | `assessment-core:admin` | crea (o vincula si ya existe) un usuario: email, nombre, contraseña opcional, rol (`assessment_admin` / `assessment_evaluator`), superadmin (solo superadmin) |
| `PATCH /:org/users/:id` | `assessment-core:admin` | nombre, activo/inactivo, contraseña, rol (null = sin rol), superadmin |
| `DELETE /:org/users/:id` | `assessment-core:admin` | quita al usuario de la organización y revoca sus roles |

Los cambios de rol/organización se reflejan en el siguiente inicio de sesión (el JWT lleva las organizaciones).

## Despliegue (Heroku)

El repo incluye `Procfile` (fase `release` con `prisma migrate deploy`, dyno `web` con `npm run start:prod`) y `heroku-postbuild` (`nest build`).

```bash
heroku create <nombre-app>
heroku addons:create heroku-postgresql:mini
heroku config:set CORS_ORIGIN=https://<tu-frontend>.vercel.app JWT_SECRET=... GEMINI_API_KEY=...
git push heroku main
heroku run npm run prisma:seed:prod
```

`DATABASE_URL` la define el addon de Postgres; `PORT` lo define Heroku en runtime. El resto de variables son las de `.env.example`.
