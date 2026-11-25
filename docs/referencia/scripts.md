# scripts

### carga-guardado.mjs

`scripts/carga-guardado.mjs`

| Elemento | Tipo | Qué es |
|---|---|---|
| `env` (interno) | constante | Prueba de carga del guardado de calificaciones (HU-68, RNF-04). Simula USUARIOS evaluadores calificando a la vez la misma evaluación en curso durante DURACION_S segundos y mide el tiempo de respuesta del guardado (PUT .../responses). CA-68.1: con 20 usuarios, el 95 % responde en menos de 1 segundo. Uso (sin dependencias, Node 18 o superior): API_URL=https://&lt;servidor> ORG=&lt;proyecto> EVALUACION_ID=&lt;id> \ CUENTAS=&lt;archivo> node scripts/carga-guardado.mjs CUENTAS es un archivo con una cuenta por línea («correo contraseña»): cada evaluador simulado usa la suya y todos inician sesión a la vez, como al empezar un taller. Con EMAIL y PASSWORD en lugar de CUENTAS, todos comparten una sola sesión. Variables opcionales: HERRAMIENTA (organizational \| capacity, por defecto organizational), USUARIOS (20), DURACION_S (60), PAUSA_MS (3000, la espera del guardado automático de la web entre un cambio y el siguiente). Escribe calificaciones de verdad: usar una evaluación de prueba. |
| `loginStatuses` (interno) | constante | Todos inician sesión a la vez, como al empezar un taller. |

Notas:

- `evaluator`: Cada evaluador empieza en un momento distinto, como en un taller real.
- `evaluator`: se cuenta como error de red

### medir-reporte.mjs

`scripts/medir-reporte.mjs`

| Elemento | Tipo | Qué es |
|---|---|---|
| `env` (interno) | constante | Tiempo de generación del reporte en presentación (HU-69, RNF-04). Exporta el PPTX de una evaluación completa con alcance de proyecto y mide cuánto tarda. CA-69.1: menos de 10 segundos. La primera exportación redacta los textos con IA; las siguientes los toman de la caché. Uso (sin dependencias, Node 18 o superior): API_URL=https://&lt;servidor> ORG=&lt;proyecto> EMAIL=&lt;correo> PASSWORD=&lt;clave> \ node scripts/medir-reporte.mjs Variables opcionales: REPETICIONES (3), EVALUACIONES por herramienta (1). Solo lee y exporta: no cambia ninguna evaluación. |
