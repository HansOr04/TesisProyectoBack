# Reglas de negocio

## Puntuación

Archivo: `assessment-core/domain/scoring.engine.ts`.

| Regla | Fórmula |
|---|---|
| Nota de un KPI | Entero de 1 a 10, con observación obligatoria |
| Promedio de sección | Σ(peso KPI × nota) ÷ Σ(peso KPI), con dos decimales |
| Puntaje global | Σ(peso sección × promedio) ÷ Σ(peso sección), con dos decimales |
| KPI crítico | Nota ≤ 5, o marcado a mano |
| Nivel | Bajo hasta 5, medio entre 5 y 7, alto desde 7 |
| Porcentaje del reporte | Puntaje × 10, redondeado |

Cuentan solo los KPI **activos** en la plantilla, **aplicables** a la organización y
ya **calificados**. Una sección sin ninguno no entra en el global. En curso se
calcula al momento; al completar se guarda y no cambia más.

## Aplicabilidad

Cada organización puede marcar secciones o KPI como «no aplica»: no se exigen ni
puntúan. Excluir una sección excluye sus KPI. Se guarda por id, pero se aplica por
**código de KPI y número de sección**, para que valga en cualquier versión de la
plantilla, siempre dentro del mismo proyecto y herramienta.

`active` (plantilla, para todos) y aplicable (una organización) son independientes:
un KPI cuenta si cumple las dos.

## Plantillas

- Hay una versión vigente por herramienta y proyecto.
- Si nadie la usa, se edita. Si ya hay evaluaciones, se **clona** como versión nueva
  y la anterior queda desactivada: una evaluación nunca cambia bajo quien la llena.
- Un KPI no se borra, se desactiva.
- Editar algo ya calificado en evaluaciones en curso pide confirmación.
- Cada cambio queda en la auditoría con el valor anterior y el nuevo.

## Evaluaciones

- Una en curso por organización y herramienta: iniciarla de nuevo devuelve la misma.
- La primera calificación la pasa de borrador a en progreso.
- Completar exige todos los KPI que aplican (422 con los que faltan).
- Completada no se modifica. «Volver a tomar» crea otra; se comparan en el historial.
- Al calificar, cada KPI debe pertenecer a la plantilla de esa evaluación.

## Planes de mejora

- Organizativa y Capacidades: la medida se liga a un KPI crítico.
- Riesgos: se liga a un riesgo no despreciable, y el fin es inicio + duración, lo
  calcula el servidor.
- Estado según avance: 0 % pendiente, 1 a 99 % en progreso, 100 % concluida.
- Para concluir, la web exige escribir qué se implementó.
- Prioridad de impacto = peso × brecha bajo el umbral.

## Riesgos

- Despreciable si la nota **supera** el umbral; si no, requiere mitigación.
- Umbral: el del país de la organización, si no el de la plantilla, si no 5.
- Calificar exige describir el riesgo. Nota y riesgo se guardan en una transacción.
- Críticos del panel = riesgos no despreciables sin medida.

## Asociaciones

Una asociación de nivel 2 agrupa asociaciones de nivel 1 y empresas. No se anidan
de nivel 2 ni una puede ser su propio padre. Sin evaluación propia, su fila del
panel es el promedio de sus miembros.

## Roles y acceso

| Rol | Permisos | Alcance |
|---|---|---|
| `assessment_admin` | Todos en los 4 módulos | Todo el proyecto |
| `assessment_evaluator` | Leer y escribir | Organizaciones asignadas a él |
| `assessment_viewer` | Leer | Las que le habiliten; sin configurar, ninguna |
| Superadministrador dueño | Todo | Los proyectos que creó |
| Superadministrador en proyecto ajeno | Los de su rol ahí | Como un miembro más |

- Un usuario puede tener varios roles; se unen sus permisos. El
  alcance es el del rol más amplio: administrador, luego evaluador y luego
  visualizador. Sin rol, solo lo asignado a él.
- Lo que registra un evaluador queda a su cargo; elegir evaluador es del administrador.
- Solo un superadministrador otorga o quita ese nivel, y nadie se lo quita a sí mismo.
- Nombre, contraseña y estado de una cuenta que está en otro proyecto, o de un
  superadministrador, solo los cambia un superadministrador.
- Agregar una cuenta existente nunca cambia su contraseña.
- Desactivar, cambiar contraseña o sacar del proyecto cierra las sesiones.
- Las organizaciones **confidenciales** no salen en la vista global.

## Proyectos

Crear uno deja listas sus tres plantillas, los umbrales de riesgo y su administrador;
este se valida antes de crear nada. El identificador va en las direcciones y no
cambia. El nombre de una organización es único dentro del proyecto.

## Teléfonos

`+prefijo número`, con los dígitos de su país. La tabla está en
`contact-phone.ts` (servidor) y en `new.page.tsx` (web): se cambian juntas.

## Analítica

Sin IA y reproducible. Usa la última evaluación de cada organización.

| Análisis | Cómo se calcula |
|---|---|
| Panorama | Promedio, mediana, desviación muestral (n−1), histograma y tendencia mensual |
| Brechas | Prioridad = tasa crítica × peso × (umbral + 1 − promedio) |
| Correlaciones | Pearson, desde 3 datos. Fuerte ≥ 0,7, moderada ≥ 0,4, débil ≥ 0,2 |
| Efectividad | Con 2 o más evaluaciones completadas: última − primera por KPI, con medida frente a sin medida |
| Tipologías | K-medias con centros iniciales fijos, para que el resultado se repita |
| Posición | Percentil frente al conjunto |
| Simulador | Recalcula el puntaje con notas objetivo (en la web) |

## Auditoría

| Acción | Cuándo |
|---|---|
| `organisation.create`, `.update`, `.reprovision` | Proyectos |
| `assessment-role.assign`, `.revoke`, `.viewer-visibility` | Roles |
| `assessment-profile.create`, `.update`, `.delete`, `.applicability-update` | Organizaciones |
| `assessment-template.new-version`, `.change` | Estructura |
| `assessment-evaluation.create`, `.complete`, `.delete` | Evaluaciones |
| `assessment-response.upsert` | Calificaciones |
| `assessment-measure.create`, `.progress` | Medidas |
| `assessment-risk.upsert`, `.country-params-update` | Riesgos |
| `assessment-ai.call`, `assessment-export.generate` | IA y reportes |

Revocar roles y borrar se registran como advertencia. Un fallo al auditar nunca
deshace la operación.
