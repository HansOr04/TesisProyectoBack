# Mediciones de rendimiento (RNF-04)

## Generación del reporte en presentación (HU-69)

Exportación del PPTX con alcance de **todo el proyecto** (`ganttScope: project`)
sobre evaluaciones completas, medida de extremo a extremo con
`scripts/medir-reporte.mjs`. Límite de CA-69.1: 10 segundos.

Medido el 25 de noviembre de 2026 en local (MacBook, PostgreSQL 15 en Docker,
datos de demostración: 22 evaluaciones completas por herramienta, 3 evaluaciones
medidas de cada una):

| Caso | Organizativa | Capacidades | Riesgos |
|---|---|---|---|
| Primera exportación (la IA redacta) | 4,9 a 6,1 s | 4,1 a 4,7 s | 3,9 a 4,5 s |
| Siguientes (textos en caché) | 0,06 s | 0,05 s | 0,05 s |
| IA que no responde | 8,1 s | 8,1 s | 8,1 s |

El máximo fue **8,1 s**, con el proveedor de IA colgado: la espera está acotada a
8 s y, si se agota, el reporte sale con los textos calculados de los datos.

Para medir en la demo (solo lee y exporta; con una cuenta de prueba). Opcionales:
`REPETICIONES` (3) y `EVALUACIONES` por herramienta (1).

```bash
API_URL=https://evaluartesis-5deec07f5fd8.herokuapp.com ORG=<proyecto> \
EMAIL=<correo> PASSWORD=<clave> node scripts/medir-reporte.mjs
```

## Guardado con 20 evaluadores a la vez (HU-68)

`scripts/carga-guardado.mjs`. Límite de CA-68.1: el 95 % de los guardados en menos
de 1 segundo. Escribe calificaciones de verdad: usar una evaluación de prueba.

```bash
API_URL=<servidor> ORG=<proyecto> EVALUACION_ID=<id> CUENTAS=<archivo> \
node scripts/carga-guardado.mjs
```

`CUENTAS` tiene una línea por evaluador (`correo contraseña`). Con `EMAIL` y
`PASSWORD` en su lugar, todos comparten una sesión. Opcionales: `HERRAMIENTA`
(`organizational` o `capacity`), `USUARIOS` (20), `DURACION_S` (60) y `PAUSA_MS`
(3000, la espera del guardado automático).

| Entorno | Fecha | Inicios de sesión | Guardados | p95 |
|---|---|---|---|---|
| Local, antes de corregir los límites | 8 nov 2026 | 9 de 20 | 300 de 396 | 59 ms |
| Local, después | 8 nov 2026 | 20 de 20 | 391 de 391 | 61 ms |
| Local, con los límites por cuenta de HU-71 | 25 nov 2026 | 20 de 20 | 393 de 393 | 53 ms |
| Local, versión publicada, 20 cuentas propias | 25 nov 2026 | 20 de 20 | 396 de 396 | 57 ms |
