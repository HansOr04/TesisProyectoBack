# datos-iniciales

### seed.ts

`prisma/seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `prisma` (interno) | constante | `npm run prisma:seed` — idempotente: se puede correr N veces. |

### assessment.seed.ts

`prisma/seeds/assessment.seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentSeedOptions` | tipo |  |
| `seedAssessment(client, options)` | función | Siembra módulos, permisos, roles de sistema, plantillas y parámetros de riesgo |

Campos:

- `AssessmentSeedOptions.roleAssignments`: userId → roleCode a asignar en la organización (p.ej. admin/evaluador demo).

Notas:

- `seedAssessmentRoles`: Reconstruye los permisos en cada corrida para que un cambio de la plantilla se refleje sin dejar permisos viejos; es seguro porque son roles de sistema, no personalizaciones de un proyecto.
- `seedAssessmentTemplate`: Parámetros de riesgo por país (configurables luego desde administración).

### demo-data.seed.ts

`prisma/seeds/demo-data.seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `DEMO_PREFIX` (interno) | constante | Datos de demostración para la analítica: organizaciones con perfiles variados, evaluaciones completadas de las 3 herramientas, medidas sobre KPI críticos y re-evaluaciones donde los KPI con medida concluida mejoran más. Determinístico (PRNG con semilla) para que la memoria pueda reproducirlo. Re-ejecutable: borra y vuelve a crear las organizaciones "Demo —". |
| `seedDemoData(prisma, organisation, seed)` | función | Crea los datos de demostración |

Campos:

- `DemoOrg.capability`: Capacidad latente 0–1: mueve todos los puntajes de la organización.
- `DemoOrg.reevaluate`: Segunda evaluación completada (histórico) para medir efectividad.
- `DemoOrg.bias`: Sesgos por herramienta (p.ej. fuerte en organización, débil en riesgos).

Notas:

- `seedDemoData`: Sesgo por sección estable para la organización (fortalezas/debilidades).
- `seedDemoData`: Medidas sobre ~60 % de los KPI críticos de la primera evaluación.
- `seedDemoData`: Segunda evaluación: los KPI con medida concluida mejoran +2..+4, en curso +0..+2, sin medida −1..+1 (efecto real de las medidas, con ruido).

### identity.seed.ts

`prisma/seeds/identity.seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `SeededIdentity` | tipo |  |
| `seedIdentity(prisma)` | función | Usuario técnico 'system' (autor de auditorías sin actor), organización demo y dos cuentas: admin (assessment_admin) y evaluador (assessment_evaluator). |

Notas:

- `seedIdentity`: El administrador inicial es el superadministrador dueño del proyecto base: solo el que crea un proyecto tiene acceso total a él.

### production.seed.ts

`prisma/seeds/production.seed.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `prisma` (interno) | constante | `npm run prisma:seed:prod` — arranque de un entorno real: crea SOLO la organización y un superadministrador (con la contraseña pedida por consola o SEED_ADMIN_PASSWORD), más módulos/permisos/roles y plantillas. No crea cuentas de demostración ni contraseñas por defecto. |

Notas:

- `ask`: Oculta la contraseña mientras se escribe.
- `main`: El administrador inicial es el superadministrador dueño del proyecto base: solo el que crea un proyecto tiene acceso total a él.
