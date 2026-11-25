# compartido

### soft-delete.ts

`src/shared/domain/soft-delete.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `NOT_DELETED` | constante | Convención transversal: los registros se "borran" fijando deletedAt. Todas las consultas de lectura filtran deletedAt: null explícitamente (no hay middleware global de soft-delete como en el sistema de origen). |

### env.validation.ts

`src/shared/infrastructure/config/env.validation.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `EnvironmentVariables` (interno) | clase | Fail-fast: si falta una variable obligatoria el proceso no arranca, en vez de fallar más tarde en la primera petición. |
| `validateEnv(config)` | función | Valida las variables al arrancar |

Campos:

- `EnvironmentVariables.JWT_EXPIRES_IN`: Jornada completa: el token de acceso vive en memoria del navegador, así que al recargar se renueva con el refresh token rotatorio. Con 15 min la renovación era constante y cualquier fallo se notaba enseguida.
- `EnvironmentVariables.ACTIVITY_LOG_RETENTION_MONTHS`: Retención de la auditoría (ActivityLog): meses que se conservan.

Notas:

- `validateEnv`: En producción un secreto débil o el de ejemplo deja los JWT falsificables.

### prisma.module.ts

`src/shared/infrastructure/database/prisma.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PrismaModule` | clase | Acceso global a la base |

### prisma.service.ts

`src/shared/infrastructure/database/prisma.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PrismaService` | clase | Único punto de acceso a la base de datos. Las capas de aplicación lo reciben inyectado; el dominio nunca lo importa. |

| Método | Acceso | Qué hace |
|---|---|---|
| `onModuleInit()` | público | Abre la conexión |
| `onModuleDestroy()` | público | La cierra |

### all-exceptions.filter.ts

`src/shared/infrastructure/http/all-exceptions.filter.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AllExceptionsFilter` | clase | Respuesta de error uniforme: statusCode, message, requestId y timestamp. Los errores no controlados (500) se registran con stack y, en producción, no exponen detalles internos al cliente. |

| Método | Acceso | Qué hace |
|---|---|---|
| `catch(exception, host)` | público | Convierte cualquier error en la respuesta uniforme |

Notas:

- `catch`: Los 502–504 son de un servicio externo (la IA) o de saturación y ya se responden con un mensaje: se registran, pero no son fallas propias.

### health.controller.ts

`src/shared/infrastructure/http/health.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `HealthController` | clase | Estado del servicio |

| Método | Acceso | Qué hace |
|---|---|---|
| `check()` | público | `GET `. Comprueba la base y cuenta los errores recientes |

### request-id.middleware.ts

`src/shared/infrastructure/http/request-id.middleware.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `SAFE_ID` (interno) | constante | Lo que manda el cliente acaba en los registros: solo identificadores cortos. |
| `RequestIdMiddleware` | clase | Correlación de logs/auditoría: respeta X-Request-Id si el cliente lo manda. |

| Método | Acceso | Qué hace |
|---|---|---|
| `use(req, res, next)` | público | Asigna el identificador |

### request-log.middleware.ts

`src/shared/infrastructure/http/request-log.middleware.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RequestLogMiddleware` | clase | Una línea por petición: ruta, estado, duración y usuario. Sin parámetros de consulta, cuerpo ni cabeceras, que pueden llevar datos de las organizaciones. |

| Método | Acceso | Qué hace |
|---|---|---|
| `use(req, res, next)` | público | Registra la petición al terminar |

### logger.module.ts

`src/shared/infrastructure/logging/logger.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `LoggerModule` | clase | Registro y contador de errores |

### server-error-monitor.service.ts

`src/shared/infrastructure/logging/server-error-monitor.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `ServerErrorMonitor` | clase | Cuenta los errores 5xx de la última hora. Los expone /health para que la vigilancia (`.github/workflows/vigilancia.yml`) avise al equipo. Vive en memoria: se reinicia con el servidor, y el detalle queda en los registros. |

| Método | Acceso | Qué hace |
|---|---|---|
| `record(now)` | público | Suma un error |
| `snapshot(now)` | público | Errores de la última hora |
| `prune(now)` | interno |  |

### structured-logger.service.ts

`src/shared/infrastructure/logging/structured-logger.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `LogContext` | tipo |  |
| `StructuredLoggerService` | clase | Logger estructurado (una línea JSON por evento en producción, texto legible en desarrollo). Instancia transitoria: cada servicio fija su propio contexto con setContext() sin pisar el de los demás. |

| Método | Acceso | Qué hace |
|---|---|---|
| `setContext(context)` | público | Fija datos comunes |
| `debug(message, context?)` | público | Solo en desarrollo |
| `info(message, context?)` | público | Informativo |
| `warn(message, context?)` | público | Advertencia |
| `error(message, error?, context?)` | público | Error con traza |
| `write(level, message, context?)` | interno |  |

### excel-cell.util.ts

`src/shared/infrastructure/reports/excel-cell.util.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `EXCEL_CELL_MAX_LENGTH` | constante | Límite de caracteres por celda de Excel. |
| `clampExcelText(value, columnId?)` | función | Recorta un texto al límite de una celda de Excel. |
| `sanitizeForExcelCell(value, columnId?)` | función | Prepara cualquier valor para una celda: recorta solo textos, deja números y booleanos, y reemplaza por un aviso lo que no quepa. |
| `clampForExcelCell` | constante | Nombre anterior de sanitizeForExcelCell. |
| `ExcelColumnKind` | tipo | Hojas con formato (ExcelJS)   Los reportes que se entregan a las organizaciones se generan con ExcelJS: título, encabezado con color, anchos de columna, texto ajustado, filtros y la fila de encabezado inmovilizada. |
| `ExcelColumn` | tipo |  |
| `ExcelSheetSpec` | tipo |  |
| `safeSheetName(name)` (interno) | función | Nombre de hoja válido para Excel: máx. 31 caracteres y sin : \ / ? * [ ] |
| `buildFormattedWorkbook(sheets)` | función | Libro de Excel con formato |

Campos:

- `ExcelColumn.width`: Ancho en caracteres.
- `ExcelSheetSpec.subtitle`: Línea de contexto bajo el título (organización, fecha…).

### export-limiter.ts

`src/shared/infrastructure/reports/export-limiter.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `MAX_CONCURRENT` (interno) | constante | Los exportes (PPTX/Excel) se generan en memoria y son costosos en CPU: un semáforo acota cuántos se construyen a la vez y cuántos esperan en cola, para que un lote de descargas no tumbe el proceso. Sin dependencias. |
| `withExportSlot(task)` | función | Ejecuta `task` cuando hay un cupo libre; rechaza si la cola está llena. |
| `exportLimiterStats()` | función | Estado actual, para pruebas y diagnóstico. |

### pptx-report.util.ts

`src/shared/infrastructure/reports/pptx-report.util.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PptxGenJSCtor` (interno) | constante | `pptxgenjs`'s CJS build does `module.exports = PptxGenJS` (no `.default`), so a plain default import breaks under ts-jest (which honors tsconfig's missing `esModuleInterop`) even though it works fine under the SWC runtime Nest uses. A direct `require` + type cast works identically under both. eslint-disable-next-line @typescript-eslint/no-var-requires |
| `REPORT_COLORS` | constante | Reporte de resultados con el formato de las presentaciones de diagnóstico: barra lateral y títulos en el color de la herramienta (azul Organizativa, naranja Capacidades, verde Riesgos), resultados en porcentaje y colores de semáforo reservados para el nivel de cada puntaje. Todos los gráficos son formas nativas, nunca gráficos de Office: así se ven igual en PowerPoint, Keynote y Google Slides. |
| `mix(from, to, ratio)` | función | Mezcla dos colores hex; `ratio` es la proporción del segundo. |
| `scorePct(score)` | función | Escala   /** Puntaje de 0 a 10 llevado a porcentaje entero. |
| `pctLabel(score)` | función | Porcentaje para mostrar |
| `tierColor(score, lowMax, mediumMax)` | función | Color del semáforo |
| `tierLevel(score)` | función | Nivel bajo, medio o alto |
| `formatDate(date)` (interno) | función | Utilidades de texto |
| `fitFontSize(text, w, h, max, min, charEm, lineEm)` (interno) | función | Tamaño de letra que deja entrar el texto en la caja (estimación por área). |
| `createReportPptx(footerLabel?, opts?)` | función | Presentación y marco de cada lámina |
| `addCoverSlide(pptx, opts)` | función | Portada |
| `ResultCard` | tipo | Resultados globales: barras horizontales por sección |
| `addGlobalResultsSlide(pptx, opts)` | función | Resultados en barras |
| `InsightPoint` | tipo | Lectura ejecutiva y fortalezas/brechas |
| `addPointList(slide, points, box, opts)` (interno) | función | Lista de puntos con viñeta: "Título: detalle". |
| `GAUGE_ZONES` (interno) | constante | Resumen ejecutivo: velocímetro del resultado global y síntesis   Ángulos OOXML: 0° al este, creciendo en sentido horario. El semicírculo superior va de 180° (0 %) a 360° (100 %). Cortes del semáforo: rojo hasta 50 %, amarillo hasta 70 %, verde desde 70 %. |
| `addExecutiveSummarySlide(pptx, opts)` | función | Resumen ejecutivo |
| `addExecutiveReadingSlide(pptx, opts)` | función | Lectura ejecutiva |
| `drawTrafficLight(pptx, slide, x, y, score)` (interno) | función | Una lámina por sección: avance, fortalezas, brechas y semáforo |
| `addSectionDetailSlide(pptx, opts)` | función | Detalle de una sección |
| `TableCell` | tipo | Tabla genérica paginada |
| `TableColumn` | tipo |  |
| `addChips(pptx, slide, chips, y)` (interno) | función | Cifras en píldoras sobre una tabla o un gráfico. |
| `addTableSlide(pptx, opts)` | función | Tabla con encabezado en el color de la herramienta y filas alternas teñidas; cada lámina repite el encabezado. `summary` son cifras en píldoras sobre la tabla. |
| `paginateRows(columns, rows, opts)` (interno) | función | Reparte las filas en láminas según el alto estimado de cada una (las celdas largas ocupan varias líneas), sin pasar de `maxRows` por lámina. |
| `addNumberedListSlide(pptx, opts)` | función | Lista numerada (hallazgos y recomendaciones) |
| `addProportionBar(pptx, slide, opts)` | función | Barra apilada (proporciones de un total) |
| `addClassificationSlide(pptx, opts)` | función | Clasificación de riesgos |
| `PlanMeasure` | tipo | Resumen del plan de acción |
| `addPlanSummarySlide(pptx, opts)` | función | Resumen del plan |
| `addSwotSlide(pptx, opts)` | función | FODA |
| `TimelineMeasure` | tipo | Cronograma (Gantt) |
| `addTimelineSlide(pptx, opts)` | función | Cronograma |
| `EvolutionPoint` | tipo | Evolución entre evaluaciones: barras y línea |
| `addEvolutionSlide(pptx, opts)` | función | Barras por evaluación completada, línea de tendencia y tabla de variaciones. |
| `writePptxBuffer(pptx)` | función | Genera el archivo dentro del cupo de exportes |

Campos:

- `TableColumn.weight`: Ancho relativo; se reparte sobre el ancho útil de la lámina.

Notas:

- `fitFontSize`: Ancho medio de un carácter en em: 0,46 para texto, más para negritas grandes.
- `addCoverSlide`: Círculos de fondo en el color de la herramienta, como motivo de portada.
- `addGlobalResultsSlide`: Promedio global: línea y etiqueta sobre el gráfico.
- `addExecutiveSummarySlide`: "Capacidad alta", "Capacidad media"…
- `addExecutiveSummarySlide`: Síntesis.
- `addSectionDetailSlide`: Avance hacia la meta del 100 %.
- `addSectionDetailSlide`: Tarjeta del semáforo.
- `addPlanSummarySlide`: KPI críticos (o riesgos) que todavía no tienen medida.
- `addPlanSummarySlide`: Avance promedio del plan.
- `addPlanSummarySlide`: Primero lo que vence antes y no está concluido.
- `addTimelineSlide`: Escala por meses completos, del mes de la primera medida al de la última.
- `addTimelineSlide`: Meses: etiqueta y línea vertical; si son muchos, se etiqueta uno de cada n.
- `addEvolutionSlide`: Línea de tendencia que une las barras, en el color de la herramienta.
- `rows`: Se compara ya redondeado, como se muestra.

### pagination.ts

`src/shared/presentation/pagination.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `MAX_PAGE_SIZE` | constante | Máximo por página |
| `MAX_UNPAGED_ROWS` | constante | Tope de filas cuando el cliente no pagina (compatibilidad con listados clásicos). |
| `PaginationQueryDto` | clase | Página y tamaño |
| `Paginated` | tipo |  |
| `pageArgs(query)` | función | Argumentos Prisma (`skip`/`take`) para una consulta paginada o acotada. |
| `pageResult(query, items, total)` | función | Devuelve el sobre paginado cuando el cliente pidió `page`; si no, la lista plana (acotada) para no romper a los consumidores que esperan un array. |
