import { AssessmentSeedTemplate, AssessmentSeedIndicator } from './types';

const CODE_PREFIX = 'AZ';

// KPI reales de la Herramienta Organizativa (Diagnóstico Asociativo), transcritos del Excel original
// de la herramienta (HERRAMIENTA ORGANIZATIONAL DIAGNOSTICO ASOCIATIVO_V3_2025.xlsm, hoja "DATA 6 DIM"):
// nombre, cálculo del indicador y peso exactos por KPI dentro de cada dimensión (los 6 totales
// de peso ya suman 100 en el archivo fuente). 73 KPI en 6 dimensiones.
//
// helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) o registro(s)
// requerido(s), qué campos debe tener, quién lo firma/llena, y dónde/cómo verificarlo. A
// diferencia de Capacidades/Riesgos, Organizational no evalúa cumplimiento legal sino fortalecimiento
// organizativo (capacidad de la asociación de sostener ese cumplimiento en el tiempo: gobernanza,
// finanzas, personal, mercado) — por eso los documentos son administrativos/organizativos (actas,
// contratos, roles de pago, balances, manuales), no permisos ambientales. No usa sintaxis
// markdown (el texto se renderiza en un <p> plano con whitespace-pre-line).
// scoringRubric: rúbrica de 5 bandas ESPECÍFICA de cada KPI (no genérica) con umbrales/criterios
// concretos derivados del propio cálculo del indicador en el Excel original.

interface IndicatorSeed {
  name: string;
  description: string;
  helpText?: string;
  scoringRubric?: string;
  weight: number;
}

interface DimensionSeed {
  number: number;
  name: string;
  indicators: IndicatorSeed[];
}

const DIMENSIONS: DimensionSeed[] = [
  {
    number: 1,
    name: 'Capacidades y Estrategias de Personal',
    indicators: [
      {
        name: 'Cuentan con un nivel de especialización y competencias en puestos clave.',
        description:
          'Certificaciones de personal clave y/o títulos académicos.',
        helpText:
          'Verifica, por cada cargo clave (gerencia, contabilidad, técnico agrícola, y otros que la organización considere estratégicos):\n\n1. HOJA DE VIDA (CV) actualizada del colaborador, con experiencia relevante al cargo.\n2. TÍTULO ACADÉMICO (bachillerato, tecnología, universitario) o CERTIFICADO DE CAPACITACIÓN específico del área (ej. contabilidad, agronomía, gestión asociativa).\n3. Fecha del título/certificado — verifica que no sea de hace muchos años sin actualización (idealmente con alguna capacitación de refresco en los últimos 2-3 años).\n\nDónde verificar: pide a Recursos Humanos o gerencia la carpeta de cada colaborador en cargo clave; debe contener CV + copia del título/certificado.',
        scoringRubric:
          '{"criteria":["Para cada cargo clave (gerencia, contabilidad, técnico agrícola y otros que la organización considere estratégicos) existe una hoja de vida (CV) actualizada del colaborador, con experiencia relevante al cargo.","Cada cargo clave cuenta con un título académico (bachillerato, tecnología o universitario) o un certificado de capacitación específico del área, archivado en su carpeta.","El título o certificado tiene una fecha reciente, o el colaborador cuenta con alguna capacitación de refresco en los últimos 2-3 años, no solo una certificación antigua sin actualización."]}',
        weight: 7,
      },
      {
        name: 'Nivel de motivación del equipo de trabajo.',
        description: 'Cumplimiento de resultados con base en planificaciones.',
        helpText:
          'Verifica:\n\n1. PLAN OPERATIVO ANUAL (POA): documento con las metas del año, por área o proceso.\n2. INFORME DE CUMPLIMIENTO DE METAS: reporte (tabla dentro del POA o documento aparte) que compare metas planificadas contra resultados alcanzados, con fecha de corte.\n3. ACTAS DE SEGUIMIENTO: reuniones periódicas donde se revisa el avance del POA, con fecha y asistentes.\n\nCalcula el % de cumplimiento: (metas alcanzadas / metas planificadas) x 100, usando el informe más reciente.',
        scoringRubric:
          '{"criteria":["Existe un Plan Operativo Anual (POA) escrito y vigente para el periodo evaluado, que incluye como mínimo: los objetivos o metas de cada área de la organización (personal, asociatividad, asistencia técnica, procesos, mercado, finanzas), el indicador con el que se mide cada meta, y quién es responsable de cumplirla.","Existe un informe de gestión o de cumplimiento de metas que, para cada meta del POA, muestra el valor planificado, el valor alcanzado y el porcentaje de cumplimiento — no basta un resumen narrativo sin cifras.","Existen actas de reuniones de seguimiento (mínimo trimestrales) donde se revisó el avance del POA, con fecha, lista de asistentes y los acuerdos o ajustes tomados.","Según el informe de cumplimiento más reciente, el promedio de cumplimiento de todas las metas del POA es del 90% o más."]}',
        weight: 9,
      },
      {
        name: 'Mujeres de la organización son parte de la Directiva.',
        description:
          '% de mujeres de la organización que son parte de la Directiva.',
        helpText:
          'Verifica el ACTA DE NOMBRAMIENTO DE LA DIRECTIVA vigente (o certificado de nombramiento inscrito ante el órgano de control). Cuenta cuántos de los cargos directivos (presidente/a, vicepresidente/a, tesorero/a, secretario/a, vocales) están ocupados por mujeres, y divide entre el total de cargos de la Directiva.',
        scoringRubric:
          '{"criteria":["Existe un acta de nombramiento de la Directiva vigente, o certificado de nombramiento inscrito ante el órgano de control, con el detalle de quién ocupa cada cargo (presidencia, vicepresidencia, tesorería, secretaría, vocalías).","Al contar los cargos directivos ocupados por mujeres sobre el total de cargos, el porcentaje es de al menos 30%.","El porcentaje de mujeres en la Directiva alcanza el 50% o más."]}',
        weight: 10,
      },
      {
        name: 'Sistema de comunicación interna.',
        description: 'Sistema de comunicación en funcionamiento.',
        helpText:
          "Verifica:\n\n1. CANAL FORMAL DE COMUNICACIÓN: identifica cuál usa la organización (grupo de WhatsApp/Telegram oficial, boletín impreso o digital, cartelera física en el centro de acopio, radio comunitaria, etc.).\n2. EVIDENCIA DE USO RECIENTE: capturas de mensajes de las últimas 2-4 semanas, copias de boletines recientes, o fotos de la cartelera actualizada.\n3. Confirma con 1-2 socios (si es posible) que efectivamente reciben y usan ese canal — algunos canales existen 'oficialmente' pero los socios no los usan en la práctica.",
        scoringRubric:
          '{"criteria":["Existe un canal formal identificado de comunicación interna (grupo de WhatsApp/Telegram oficial, boletín impreso o digital, cartelera física en el centro de acopio, radio comunitaria, u otro).","Hay evidencia de uso reciente del canal (capturas de mensajes, copias de boletines o fotos de la cartelera de las últimas 2-4 semanas, no de hace meses).","El canal llega a la totalidad de los socios, no solo a una parte de ellos.","Al consultar directamente a 1-2 socios, confirman que efectivamente reciben y usan ese canal en la práctica."]}',
        weight: 9,
      },
      {
        name: 'Se cuenta con un plan de capacitación y formación.',
        description: '# de eventos de capacitación.',
        helpText:
          'Verifica:\n\n1. PLAN DE CAPACITACIÓN ANUAL: documento con el listado de eventos/talleres planificados para el año, con tema, fecha tentativa y público objetivo.\n2. LISTAS DE ASISTENCIA de los eventos efectivamente realizados, con nombre, cédula y firma de cada participante.\n3. CERTIFICADOS entregados a los participantes, si aplica.\n\nCompara el número de eventos planificados en el plan contra el número de eventos con lista de asistencia: ese es el % de ejecución.',
        scoringRubric:
          '{"criteria":["Existe un plan de capacitación anual escrito, con el listado de eventos/talleres planificados para el año, tema, fecha tentativa y público objetivo.","Existen listas de asistencia de los eventos efectivamente realizados, con nombre, cédula y firma de cada participante.","Al comparar el número de eventos planificados en el plan contra los eventos con lista de asistencia, se ejecutó al menos el 75% de lo planificado."]}',
        weight: 10,
      },
      {
        name: 'Tasa de participación en formaciones (capacitados vs convocados).',
        description: '# de asistentes vs número de convocados.',
        helpText:
          'Para cada evento de capacitación revisado, verifica dos números:\n\n1. # DE CONVOCADOS: lista o registro de a quiénes se invitó (lista de difusión, invitación por WhatsApp, o convocatoria escrita).\n2. # DE ASISTENTES: lista de asistencia firmada del evento.\n\nCalcula el porcentaje (asistentes / convocados) x 100 para 2-3 eventos recientes y saca un promedio.',
        scoringRubric:
          '{"criteria":["Para cada evento de capacitación existe un registro o lista de convocados (lista de difusión, invitación por WhatsApp, o convocatoria escrita).","Existe una lista de asistencia firmada del evento con el número real de participantes.","Calculando el promedio de (asistentes / convocados) para 2-3 eventos recientes, la tasa de participación es del 70% o más."]}',
        weight: 10,
      },
      {
        name: 'Se cuenta con un seguro ocupacional para colaboradores.',
        description: 'Afiliación del personal al seguro social o particular.',
        helpText:
          "Verifica, por cada colaborador contratado:\n\n1. COMPROBANTE DE AFILIACIÓN AL IESS: se confirma en el portal del IESS (www.iess.gob.ec) con el número de cédula — debe mostrar estado 'Activo' y el empleador correcto.\n2. Si en vez de IESS usan un seguro privado, verifica la póliza vigente que cubra al colaborador.\n\nToma la nómina completa y verifica cuántos tienen afiliación activa.",
        scoringRubric:
          '{"criteria":["Al revisar la nómina completa contra el portal del IESS (o la póliza de seguro privado vigente si aplica), el 75% o más del personal contratado tiene afiliación activa con el empleador correcto.","El 100% del personal contratado tiene afiliación activa verificable, sin excepciones."]}',
        weight: 10,
      },
      {
        name: 'Sistema de evaluación de desempeño del personal.',
        description: 'Encuesta de evaluación del personal.',
        helpText:
          'Verifica:\n\n1. FORMATO DE EVALUACIÓN DE DESEMPEÑO: documento con los criterios evaluados (puntualidad, cumplimiento de tareas, trabajo en equipo, etc.) y una escala de calificación.\n2. EVALUACIONES APLICADAS: copias llenas y firmadas (por el evaluador y el evaluado) del periodo más reciente (anual o semestral).\n3. Evidencia de que los resultados se usaron para algo (plan de mejora, capacitación dirigida, reconocimiento) — pregunta directamente si esto ocurre.',
        scoringRubric:
          '{"criteria":["Existe un formato de evaluación de desempeño con los criterios evaluados (puntualidad, cumplimiento de tareas, trabajo en equipo, etc.) y una escala de calificación.","Existen evaluaciones aplicadas, llenas y firmadas por el evaluador y el evaluado, del periodo más reciente (anual o semestral).","El sistema se aplicó a la totalidad del personal en el último periodo, no solo a algunos cargos.","Los resultados de la evaluación se usaron para algo concreto (plan de mejora, capacitación dirigida, reconocimiento), verificable al preguntar directamente."]}',
        weight: 7,
      },
      {
        name: 'Nivel de satisfacción de colaboradores (ambiente laboral).',
        description:
          'Encuesta de evaluación de empleados hacia la organización.',
        helpText:
          'Verifica:\n\n1. FORMATO DE ENCUESTA DE CLIMA LABORAL: preguntas sobre percepción del ambiente de trabajo, relación con jefes, condiciones laborales, etc.\n2. RESULTADOS TABULADOS de la encuesta más reciente, con fecha de aplicación y número de colaboradores que respondieron.\n3. Si el resultado reveló problemas, verifica si existe un plan de acción documentado sobre esos hallazgos.',
        scoringRubric:
          '{"criteria":["Existe un formato de encuesta de clima laboral con preguntas sobre percepción del ambiente de trabajo, relación con jefes y condiciones laborales.","Existen resultados tabulados de la encuesta más reciente, con fecha de aplicación (dentro del último año) y número de colaboradores que respondieron.","El resultado promedio de satisfacción es del 60% o más.","Si el resultado reveló problemas, existe un plan de acción documentado sobre esos hallazgos."]}',
        weight: 7,
      },
      {
        name: 'Accidentalidad laboral (centro de acopio y área de trabajo de campo).',
        description: '# de siniestros (accidentes) registrados en el año.',
        helpText:
          'Verifica el REGISTRO DE ACCIDENTES/INCIDENTES LABORALES: libro o formato donde se anota cada accidente ocurrido (fecha, persona afectada, descripción, gravedad, si hubo incapacidad). Debe cubrir tanto el centro de acopio como el trabajo de campo (visitas técnicas, cosecha). Revisa el registro del último año completo.',
        scoringRubric:
          '{"criteria":["Existe un registro de accidentes/incidentes laborales (libro o formato) que cubre tanto el centro de acopio como el trabajo de campo, con fecha, persona afectada, descripción y gravedad de cada caso.","El registro del último año completo muestra 0 a 2 accidentes, y ninguno de gravedad alta o con incapacidad prolongada."]}',
        weight: 7,
      },
      {
        name: 'Empleados a tiempo completo.',
        description: '# de empleados contratados a tiempo completo.',
        helpText:
          'Verifica los CONTRATOS DE TRABAJO vigentes y clasifícalos por tipo de jornada: tiempo completo (8h/día, indefinido o de temporada larga) vs. medio tiempo, por horas, o estacional/eventual. Calcula qué porcentaje del total de personal contratado es a tiempo completo.',
        scoringRubric:
          '{"criteria":["Existen contratos de trabajo vigentes clasificables por tipo de jornada (tiempo completo, medio tiempo, por horas, estacional/eventual).","Al calcular qué porcentaje del total de personal contratado es a tiempo completo (8h/día, indefinido o de temporada larga), el resultado es del 50% o más."]}',
        weight: 7,
      },
      {
        name: 'Competitividad Salarial.',
        description:
          'Comparación de salarios vs el promedio del mercado local.',
        helpText:
          'Verifica:\n\n1. TABLA SALARIAL de la organización, por cargo.\n2. REFERENCIA DE MERCADO: compara contra el salario básico unificado vigente (publicado anualmente por el Ministerio de Trabajo) y, si es posible, contra salarios de cargos similares en otras asociaciones de la zona.',
        scoringRubric:
          '{"criteria":["Existe una tabla salarial de la organización, por cargo.","Todos los cargos pagan igual o por encima del salario básico unificado vigente publicado por el Ministerio de Trabajo.","Al comparar contra salarios de cargos similares en otras asociaciones de la zona, los salarios de la organización están al nivel o por encima del promedio del mercado local."]}',
        weight: 7,
      },
    ],
  },
  {
    number: 2,
    name: 'Asociatividad',
    indicators: [
      {
        name: 'Se cuenta con documentos jurídicos actualizados (estatutos y reglamentos).',
        description: 'Estatutos y reglamentos actualizados.',
        helpText:
          'Verifica:\n\n1. ESTATUTOS de la organización: documento constitutivo con razón social, objeto social, estructura de gobierno, derechos y obligaciones de socios.\n2. REGLAMENTOS INTERNOS complementarios (de elecciones, de sanciones, de comercialización, según tenga la organización).\n3. Ambos deben tener el sello de aprobación/registro del órgano de control correspondiente (ej. Superintendencia de Economía Popular y Solidaria - SEPS, si aplica).\n4. Revisa la fecha de la última reforma — si la estructura real de la organización cambió pero los estatutos no se actualizaron, hay una brecha.',
        scoringRubric:
          '{"criteria":["Existen estatutos de la organización: documento constitutivo con razón social, objeto social, estructura de gobierno, derechos y obligaciones de socios.","Existen reglamentos internos complementarios (de elecciones, sanciones, comercialización, según tenga la organización).","Ambos documentos tienen el sello de aprobación/registro del órgano de control correspondiente (ej. Superintendencia de Economía Popular y Solidaria - SEPS, si aplica).","La fecha de la última reforma es de los últimos 5 años y es consistente con la estructura/actividad real actual de la organización."]}',
        weight: 8,
      },
      {
        name: 'Nivel de conocimiento de la normativa interna de la organización.',
        description: 'Grado de conocimiento de la normativa interna.',
        helpText:
          "Aplica una breve consulta a una muestra de 5-8 socios con 2-3 preguntas simples sobre los estatutos (ej. '¿cuáles son los requisitos para ser socio?', '¿cada cuánto se renueva la Directiva?'). Alternativamente, revisa actas de asambleas o talleres donde se socializaron los estatutos/reglamentos, con lista de asistencia.",
        scoringRubric:
          '{"criteria":["Existen actas de asambleas o talleres donde se socializaron los estatutos/reglamentos a los socios, con lista de asistencia.","Al consultar a una muestra de 5-8 socios con 2-3 preguntas simples sobre los estatutos (ej. requisitos para ser socio, cada cuánto se renueva la Directiva), al menos el 60% responde correctamente."]}',
        weight: 8,
      },
      {
        name: 'Los socios pertenecen a dos o más grupos humanos distintos.',
        description: '# de grupos humanos que son parte de la organización.',
        helpText:
          'Verifica el REGISTRO DE SOCIOS y confirma si tiene un campo de autoidentificación étnica/cultural (mestizo, indígena, afroecuatoriano, montubio). Si el registro no tiene ese campo, pregunta directamente a la gerencia si conocen la composición étnica de sus socios de forma aproximada.',
        scoringRubric:
          '{"criteria":["El registro de socios tiene un campo de autoidentificación étnica/cultural (mestizo, indígena, afroecuatoriano, montubio) lleno para cada socio.","Con base en ese registro (o, si no existe, en el conocimiento aproximado de la gerencia), se identifican al menos 2 grupos humanos/étnicos distintos claramente representados entre los socios."]}',
        weight: 9,
      },
      {
        name: 'Se cuenta con un responsable para el funcionamiento y gestión asociativa.',
        description: 'Reportes de gestión asociativa.',
        helpText:
          'Verifica:\n\n1. NOMBRAMIENTO del responsable de gestión asociativa (puede ser un cargo del organigrama o un acta de designación).\n2. REPORTES DE GESTIÓN periódicos (mensuales o trimestrales) que esa persona presenta, con actividades relacionadas con la vida asociativa (atención a socios, organización de asambleas, resolución de conflictos).',
        scoringRubric:
          '{"criteria":["Existe un nombramiento formal del responsable de gestión asociativa (cargo en el organigrama o acta de designación).","Existen reportes de gestión periódicos (mensuales o trimestrales) que esa persona presenta, con actividades de vida asociativa (atención a socios, organización de asambleas, resolución de conflictos)."]}',
        weight: 8,
      },
      {
        name: 'Se cuenta con la directiva actualizada y registrada en el órgano de control oficial.',
        description: 'Nombramientos actualizados y registrados.',
        helpText:
          'Verifica el CERTIFICADO DE NOMBRAMIENTO de la Directiva actual, inscrito ante el órgano de control (SEPS u otro según el tipo de organización). Confirma la fecha de inscripción y compárala con el periodo de vigencia que establecen los estatutos (usualmente 2-4 años) para saber si sigue vigente.',
        scoringRubric:
          '{"criteria":["Existe un certificado de nombramiento de la Directiva actual, inscrito ante el órgano de control (SEPS u otro según el tipo de organización).","La fecha de inscripción está dentro del periodo de vigencia que establecen los estatutos (usualmente 2-4 años), es decir el registro no está vencido."]}',
        weight: 8,
      },
      {
        name: 'Nivel de participación en reuniones y asambleas.',
        description: '# de asambleas; % y registros de asistencia.',
        helpText:
          'Verifica las ACTAS DE ASAMBLEA del último año (deben incluir fecha, lugar, y adjunta la lista de asistencia firmada). Calcula el porcentaje de asistencia (asistentes / total de socios convocados) para cada asamblea y saca un promedio.',
        scoringRubric:
          '{"criteria":["Existen actas de asamblea del último año, cada una con fecha, lugar, y lista de asistencia firmada adjunta.","Calculando el promedio de asistencia (asistentes / total de socios convocados) entre esas asambleas, el resultado es del 60% o más."]}',
        weight: 8,
      },
      {
        name: 'Socios que están al día en el pago de contribuciones y aportes a la organización.',
        description: '% de socios que están al día en aportes.',
        helpText:
          'Verifica el REPORTE DE CONTABILIDAD DE APORTES/CONTRIBUCIONES: listado por socio con el estado de sus pagos (al día / con saldo pendiente). Calcula el porcentaje de socios sin pagos pendientes.',
        scoringRubric:
          '{"criteria":["Existe un reporte de contabilidad de aportes/contribuciones con el listado por socio y su estado de pago (al día / con saldo pendiente).","Al calcular el porcentaje de socios sin pagos pendientes, el resultado es del 70% o más."]}',
        weight: 8,
      },
      {
        name: 'Número de jóvenes que forman parte de la organización.',
        description: '% de jóvenes en el registro de socios.',
        helpText:
          "Verifica el REGISTRO DE SOCIOS y confirma si tiene el campo de fecha de nacimiento o edad. Define primero con la organización qué rango de edad consideran 'joven' (comúnmente 18-29 años) y calcula qué porcentaje del total de socios cae en ese rango.",
        scoringRubric:
          '{"criteria":["El registro de socios tiene el campo de fecha de nacimiento o edad lleno para cada socio.","Usando el rango de edad que la organización define como joven (comúnmente 18-29 años), el porcentaje de socios en ese rango es del 15% o más."]}',
        weight: 4,
      },
      {
        name: 'Implementación de mecanismos para resolución de conflictos.',
        description: '# de conflictos resueltos.',
        helpText:
          'Verifica:\n\n1. REGLAMENTO DE RESOLUCIÓN DE CONFLICTOS (puede ser parte del reglamento interno general o un documento aparte).\n2. REGISTRO DE CASOS: bitácora o expedientes de conflictos atendidos en el periodo, con el caso, las partes involucradas (sin necesidad de detalles sensibles), y cómo se resolvió.',
        scoringRubric:
          '{"criteria":["Existe un reglamento de resolución de conflictos, ya sea como parte del reglamento interno general o como documento aparte.","Existe un registro de casos (bitácora o expedientes) de conflictos atendidos en el periodo, con el caso, las partes involucradas y cómo se resolvió, sin necesidad de detalles sensibles.","Al menos un caso fue efectivamente registrado y resuelto en el último año, demostrando que el mecanismo se usa en la práctica."]}',
        weight: 4,
      },
      {
        name: 'Convenios y alianzas estratégicas con actores clave.',
        description: '# de convenios y acuerdos suscritos.',
        helpText:
          'Verifica los DOCUMENTOS DE CONVENIO O ACUERDO firmados con actores externos (ONG, gobierno local/GAD, compradores, cooperación internacional, universidades). Cada convenio debe tener fecha de firma, objeto del convenio, y estar vigente (revisa si tiene fecha de vencimiento).',
        scoringRubric:
          '{"criteria":["Existen documentos de convenio o acuerdo firmados con actores externos (ONG, gobierno local/GAD, compradores, cooperación internacional, universidades), cada uno con fecha de firma y objeto del convenio.","Al menos uno de esos convenios está vigente (no vencido) al momento de la evaluación.","Existen 2 o más convenios vigentes simultáneamente con distintos actores clave."]}',
        weight: 6,
      },
      {
        name: 'Nivel de fidelidad de socios a la organización.',
        description: '% de socios que entregan producto para comercialización.',
        helpText:
          'Compara el REGISTRO DE SOCIOS (total registrados) contra el REGISTRO DE ENTREGAS/VENTAS del último ciclo de cosecha (cuántos socios distintos efectivamente entregaron producto a la organización). Calcula el porcentaje de socios activos comercialmente.',
        scoringRubric:
          '{"criteria":["El registro de entregas/ventas del último ciclo de cosecha identifica, por socio, si efectivamente entregó producto a la organización.","Al comparar el número de socios registrados contra los que entregaron producto en el último ciclo, el porcentaje de socios activos comercialmente es del 70% o más."]}',
        weight: 5,
      },
      {
        name: 'Oferta de servicios y beneficios para socios de la organización.',
        description: '# de servicios o beneficios a socios de la organización.',
        helpText:
          "Verifica el LISTADO O CATÁLOGO DE SERVICIOS que la organización ofrece a sus socios: insumos agrícolas a crédito o precio preferencial, asistencia técnica, acceso a crédito/microcrédito, seguros, capacitación, atención de salud, etc. Cuenta cuántos servicios distintos están activos (con evidencia de que se usan, no solo que 'existen en el papel').",
        scoringRubric:
          '{"criteria":["Existe un listado o catálogo de servicios que la organización ofrece a sus socios (insumos a crédito o precio preferencial, asistencia técnica, acceso a crédito/microcrédito, seguros, capacitación, salud, etc.).","Al menos 2 de esos servicios tienen evidencia de uso real por parte de los socios, no solo de existir en el papel.","Existen 3 o más servicios distintos activos y en uso."]}',
        weight: 6,
      },
      {
        name: 'Incremento o decrecimiento de socios.',
        description: '# de socios (anual) en los últimos tres años.',
        helpText:
          'Verifica el REGISTRO HISTÓRICO DE SOCIOS de los últimos 3 años: número total de socios activos al cierre de cada año, y detalle de altas (nuevos socios) y bajas (socios que se retiraron) por año.',
        scoringRubric:
          '{"criteria":["Existe un registro histórico de socios de los últimos 3 años, con el número total de socios activos al cierre de cada año y el detalle de altas y bajas.","La tendencia de los 3 años muestra un número estable o creciente de socios, sin decrecimiento sostenido durante 2 años o más."]}',
        weight: 4,
      },
      {
        name: 'Rendición de cuentas para asociados.',
        description: '# de reuniones anuales para rendición de cuentas.',
        helpText:
          'Verifica el ACTA DE ASAMBLEA donde se presentaron los ESTADOS FINANCIEROS (balance general, estado de pérdidas y ganancias) y el INFORME DE GESTIÓN anual a los socios. Debe tener fecha, y constar en el acta que estos documentos fueron efectivamente presentados y discutidos (no solo mencionados).',
        scoringRubric:
          '{"criteria":["Existe un acta de asamblea del último año donde se presentaron los estados financieros (balance general, estado de pérdidas y ganancias) a los socios.","La misma acta (o una relacionada) registra la presentación del informe de gestión anual.","El acta indica explícitamente que estos documentos fueron presentados y discutidos, no solo mencionados de pasada."]}',
        weight: 8,
      },
      {
        name: 'Rotación de directiva de acuerdo con las normas jurídicas de la organización.',
        description:
          'Cumplimiento de periodos con base en estatutos y reglamentos.',
        helpText:
          'Compara la FECHA DEL ÚLTIMO CAMBIO DE DIRECTIVA (según el certificado de nombramiento) contra el PERIODO ESTABLECIDO EN LOS ESTATUTOS (busca el artículo que indica cada cuántos años se renueva la Directiva). Calcula si la renovación ocurrió dentro del plazo legal.',
        scoringRubric:
          '{"criteria":["Los estatutos indican explícitamente cada cuántos años debe renovarse la Directiva.","La fecha del último cambio de Directiva, según el certificado de nombramiento, ocurrió dentro del periodo establecido en los estatutos, con un retraso menor a 6 meses si lo hubo."]}',
        weight: 6,
      },
    ],
  },
  {
    number: 3,
    name: 'Servicios / Asistencia Técnica',
    indicators: [
      {
        name: 'Cobertura de Servicios y Asistencia Técnica Productiva para socios de la organización.',
        description:
          '% de socios que reciben servicios y asistencia técnica productiva.',
        helpText:
          'Verifica el REGISTRO DE VISITAS/SERVICIOS TÉCNICOS del último año: por cada visita debe constar fecha, técnico responsable, finca/socio visitado, y motivo/actividad realizada. Cuenta cuántos socios distintos recibieron al menos una visita/servicio en el año y calcula el porcentaje sobre el total de socios.',
        scoringRubric:
          '{"criteria":["Existe un registro de visitas/servicios técnicos del último año con fecha, técnico responsable, finca/socio visitado y motivo/actividad realizada.","Al contar cuántos socios distintos recibieron al menos una visita/servicio en el año, el porcentaje sobre el total de socios es del 70% o más."]}',
        weight: 11,
      },
      {
        name: 'Actividades de concienciación en aspectos de género, interculturalidad e inclusión.',
        description:
          '# de actividades de concienciación en aspectos de género, interculturalidad e inclusión / # socios participantes.',
        helpText:
          'Verifica el REGISTRO DE TALLERES/ACTIVIDADES DE SENSIBILIZACIÓN realizados en el último año sobre estos temas, con fecha, tema tratado, facilitador, y lista de asistencia firmada.',
        scoringRubric:
          '{"criteria":["Existe un registro de talleres/actividades de sensibilización en género, interculturalidad e inclusión realizados en el último año, con fecha, tema tratado, facilitador y lista de asistencia firmada.","Se realizaron al menos 2 actividades en el último año.","La participación promedio en esas actividades fue del 40% o más de los convocados."]}',
        weight: 11,
      },
      {
        name: 'Equipo de técnicos de la organización.',
        description: '# de técnicos / # socios.',
        helpText:
          'Verifica la NÓMINA DE TÉCNICOS DE CAMPO (personal contratado específicamente para asistencia técnica, no administrativo). Divide el número de técnicos entre el número total de socios activos para obtener el ratio de cobertura.',
        scoringRubric:
          '{"criteria":["Existe una nómina de técnicos de campo (personal contratado específicamente para asistencia técnica, no administrativo).","Al dividir el número de técnicos entre el número total de socios activos, el ratio de cobertura es de 1 técnico por cada 100 socios o menos."]}',
        weight: 11,
      },
      {
        name: 'Frecuencia de visitas a productores.',
        description: 'Optimo: mensual; Medio: trimestral; Bajo: anual.',
        helpText:
          'Verifica el CRONOGRAMA DE VISITAS TÉCNICAS planificado y el REGISTRO REAL de visitas realizadas por finca en el último periodo. Compara la frecuencia planificada (mensual/trimestral/anual) contra lo efectivamente cumplido.',
        scoringRubric:
          '{"criteria":["Existe un cronograma de visitas técnicas planificado, con la frecuencia esperada por finca (mensual, trimestral o anual).","Existe un registro real de visitas realizadas por finca en el último periodo.","Al comparar lo planificado contra lo cumplido, la frecuencia real es mensual o al menos trimestral, no solo anual."]}',
        weight: 5,
      },
      {
        name: 'Técnicos que cuentan con transporte propio.',
        description: '% de técnicos que cuentan con transporte propio.',
        helpText:
          'Consulta con el equipo técnico (o revisa si la organización lleva un registro) cuántos de los técnicos de campo cuentan con vehículo o motocicleta propios para realizar las visitas, versus los que dependen de transporte público o de la organización.',
        scoringRubric:
          '{"criteria":["Al consultar con el equipo técnico o revisar el registro de la organización, se identifica cuántos técnicos de campo cuentan con vehículo o motocicleta propios.","El 75% o más de los técnicos cuenta con transporte propio para realizar las visitas."]}',
        weight: 5,
      },
      {
        name: 'Información actualizada y registro de fincas.',
        description: 'Base de datos actualizada de fincas / procesos.',
        helpText:
          'Verifica la BASE DE DATOS DE FINCAS de la organización (Excel, sistema de trazabilidad, o base en KoboToolbox/ODK) y confirma la fecha de la última actualización de registros. Revisa si los campos principales (ubicación, área, productor) están completos para la mayoría de las fincas.',
        scoringRubric:
          '{"criteria":["Existe una base de datos de fincas centralizada (Excel, sistema de trazabilidad, o base en KoboToolbox/ODK).","Los campos principales (ubicación, área, productor) están completos para la mayoría de las fincas.","La fecha de la última actualización de registros es de menos de 1 año."]}',
        weight: 10,
      },
      {
        name: 'Se cuenta con un paquete tecnológico para el manejo del cultivo (manuales).',
        description: '% de adopción de tecnologías.',
        helpText:
          'Verifica el MANUAL TÉCNICO DE MANEJO DEL CULTIVO entregado a los socios (documento impreso, cartilla, o guía digital) con prácticas recomendadas de siembra, poda, fertilización, control de plagas y cosecha. Confirma en visitas de campo si los socios efectivamente aplican estas recomendaciones.',
        scoringRubric:
          '{"criteria":["Existe un manual técnico de manejo del cultivo entregado a los socios (documento impreso, cartilla o guía digital), con prácticas recomendadas de siembra, poda, fertilización, control de plagas y cosecha.","En visitas de campo, se confirma que los socios efectivamente aplican estas recomendaciones en al menos el 50% de las fincas visitadas."]}',
        weight: 8,
      },
      {
        name: 'Nivel de productividad en fincas asociadas.',
        description: 'Promedio de qq de cacao seco / hectárea / año.',
        helpText:
          'Verifica los REGISTROS DE COSECHA por finca (cantidad de quintales secos entregados) y las hectáreas sembradas de cada una. Calcula el rendimiento promedio (quintales secos / hectárea / año) y compáralo contra la referencia de productividad de fincas tecnificadas de cacao fino de aroma en la zona (consulta con el equipo técnico cuál es esa referencia local).',
        scoringRubric:
          '{"criteria":["Existen registros de cosecha por finca (cantidad de quintales secos entregados) y las hectáreas sembradas de cada una.","Al calcular el rendimiento promedio (quintales secos / hectárea / año) y compararlo contra la referencia local de productividad de fincas tecnificadas de cacao fino de aroma, el resultado alcanza al menos el 80% de ese promedio zonal."]}',
        weight: 11,
      },
      {
        name: 'Nivel de tecnificación en fincas.',
        description: '% de fincas que aplican paquetes tecnológicos.',
        helpText:
          'Basado en visitas de campo o inspecciones recientes, verifica qué porcentaje de las fincas aplica efectivamente las prácticas del paquete tecnológico del KPI anterior (no solo si lo conocen, sino si lo aplican: poda sanitaria realizada, fertilización según recomendación, manejo de sombra adecuado).',
        scoringRubric:
          '{"criteria":["A partir de visitas de campo o inspecciones recientes, se verifica qué porcentaje de fincas aplica efectivamente las prácticas del paquete tecnológico (poda sanitaria realizada, fertilización según recomendación, manejo de sombra adecuado), no solo si las conocen.","El porcentaje de fincas que aplica el paquete tecnológico recomendado es del 50% o más."]}',
        weight: 10,
      },
      {
        name: 'Socios que cuentan con dotación completa de equipos para manejo de fincas.',
        description: '% de socios que cuentan con equipos y herramientas.',
        helpText:
          'Verifica mediante inventario o encuesta a una muestra de socios si cuentan con las herramientas básicas: tijeras/serruchos de podar, bomba de fumigar, equipo de protección personal (guantes, botas, mascarilla). Calcula qué porcentaje de la muestra tiene la dotación completa.',
        scoringRubric:
          '{"criteria":["Mediante inventario o encuesta a una muestra de socios, se verifica si cuentan con las herramientas básicas: tijeras/serruchos de podar, bomba de fumigar, equipo de protección personal (guantes, botas, mascarilla).","El 50% o más de la muestra tiene la dotación completa de estas herramientas."]}',
        weight: 8,
      },
      {
        name: 'Aplicación de innovaciones para mejorar nivel de producción y calidad.',
        description:
          '% de fincas que aplican técnicas para mejorar producción y calidad.',
        helpText:
          'Verifica los REPORTES DE ASISTENCIA TÉCNICA sobre adopción de prácticas recientes (injertación de variedades mejoradas, manejo de sombra optimizado, fermentación mejorada en cajones). Cuenta qué porcentaje de fincas ha adoptado al menos una de estas innovaciones, según lo reportado por el equipo técnico.',
        scoringRubric:
          '{"criteria":["Existen reportes de asistencia técnica sobre adopción de prácticas recientes (injertación de variedades mejoradas, manejo de sombra optimizado, fermentación mejorada en cajones).","Según lo reportado por el equipo técnico y verificado en visitas, al menos el 50% de las fincas ha adoptado alguna de estas innovaciones."]}',
        weight: 10,
      },
    ],
  },
  {
    number: 4,
    name: 'Procesos de Trabajo',
    indicators: [
      {
        name: 'Se cuenta con infraestructura óptima para el proceso de postcosecha.',
        description: 'Capacidad de procesamiento en TM /año.',
        helpText:
          'Verifica la CAPACIDAD DE PROCESAMIENTO declarada de las instalaciones de postcosecha (fermentación, secado) en toneladas métricas por año, y compárala contra el VOLUMEN REAL que maneja la organización (según los registros de acopio del último ciclo). Pregunta si han tenido cuellos de botella o pérdidas por falta de capacidad.',
        scoringRubric:
          '{"criteria":["Existe una capacidad de procesamiento declarada de las instalaciones de postcosecha (fermentación, secado), expresada en toneladas métricas por año.","Al comparar esa capacidad contra el volumen real que maneja la organización (según los registros de acopio del último ciclo), la capacidad cubre el 75% o más del volumen manejado.","No se reportan cuellos de botella o pérdidas por falta de capacidad, salvo ocasionalmente en temporada alta."]}',
        weight: 11,
      },
      {
        name: 'Se cuenta con los equipos necesarios para el proceso de postcosecha.',
        description: 'Estado de los equipos empleados para postcosecha.',
        helpText:
          'Verifica en sitio el INVENTARIO DE EQUIPOS de postcosecha: cajones o tanques de fermentación, marquesinas o secadoras (solares o mecánicas), balanzas certificadas. Revisa su estado físico (funcionales, con mantenimiento reciente, o deteriorados).',
        scoringRubric:
          '{"criteria":["Verificado en sitio, existe el inventario completo de equipos de postcosecha: cajones o tanques de fermentación, marquesinas o secadoras (solares o mecánicas), balanzas certificadas.","Los equipos están en buen estado de mantenimiento, sin ítems que requieran mantenimiento urgente."]}',
        weight: 11,
      },
      {
        name: 'Capacidad óptima de almacenamiento de producto.',
        description: 'Capacidad de almacenamiento en TM.',
        helpText:
          'Verifica la CAPACIDAD DECLARADA DE LA BODEGA/CENTRO DE ACOPIO en toneladas métricas, y compárala contra el volumen promedio almacenado en temporada alta de cosecha (según registros de inventario).',
        scoringRubric:
          '{"criteria":["Existe una capacidad declarada de la bodega/centro de acopio en toneladas métricas.","Al compararla contra el volumen promedio almacenado en temporada alta de cosecha (según registros de inventario), la capacidad cubre el 75% o más de ese volumen, sin recurrir a almacenamiento improvisado."]}',
        weight: 11,
      },
      {
        name: 'Se cuenta con un sistema de transporte y logística para movilización del producto.',
        description: 'Protocolos para transporte y logística.',
        helpText:
          'Verifica si existe un PROTOCOLO ESCRITO de transporte: rutas definidas, responsables asignados, condiciones de manejo del producto (protección contra humedad, contaminación cruzada). Si no hay protocolo escrito, verifica si al menos hay prácticas consistentes y ordenadas.',
        scoringRubric:
          '{"criteria":["Existe un protocolo escrito de transporte con rutas definidas, responsables asignados y condiciones de manejo del producto (protección contra humedad, contaminación cruzada).","El protocolo se aplica consistentemente en la práctica, no solo existe en papel."]}',
        weight: 8,
      },
      {
        name: 'Se cuenta con un sistema interno de control.',
        description: 'Sistema interno de control en funcionamiento.',
        helpText:
          'Verifica el MANUAL DEL SISTEMA INTERNO DE CONTROL (SIC) de la organización y los REGISTROS DE INSPECCIÓN INTERNA (visitas de verificación a fincas o al proceso de acopio, con fecha y resultado). Confirma que las inspecciones sean recientes (último trimestre o semestre).',
        scoringRubric:
          '{"criteria":["Existe un manual del Sistema Interno de Control (SIC) de la organización, vigente.","Existen registros de inspección interna (visitas de verificación a fincas o al proceso de acopio, con fecha y resultado).","Las inspecciones registradas son del último semestre o más recientes, no de hace más de 6 meses."]}',
        weight: 11,
      },
      {
        name: 'Manejo de registros actualizado.',
        description: 'Base de datos actualizada.',
        helpText:
          'Verifica la BASE DE DATOS GENERAL de la organización (socios, producción, entregas) — puede ser un sistema digital o Excel maestro — y confirma la fecha de la última actualización registrada.',
        scoringRubric:
          '{"criteria":["Existe una base de datos general de la organización (socios, producción, entregas), ya sea un sistema digital o un Excel maestro.","La fecha de la última actualización registrada es de menos de 6 meses."]}',
        weight: 11,
      },
      {
        name: 'Sistema de seguridad en infraestructura (cámara, alarma, seguros).',
        description: '% Sistemas operativos y vigentes.',
        helpText:
          'Verifica en sitio: cámaras de seguridad instaladas y funcionando, sistema de alarma operativo, y PÓLIZA DE SEGURO de la infraestructura (edificio, equipos, inventario) vigente — revisa la fecha de vencimiento de la póliza.',
        scoringRubric:
          '{"criteria":["Verificado en sitio, las cámaras de seguridad están instaladas y funcionando.","El sistema de alarma está operativo.","Existe una póliza de seguro de la infraestructura (edificio, equipos, inventario) vigente, con fecha de vencimiento confirmada."]}',
        weight: 5,
      },
      {
        name: 'Seguridad en transporte del producto.',
        description: 'Seguro vigente para transportar el producto.',
        helpText:
          'Verifica la PÓLIZA DE SEGURO DE TRANSPORTE DE MERCADERÍA, que cubra el producto durante su traslado desde el centro de acopio hasta el cliente/puerto. Confirma que esté vigente y que el monto asegurado sea razonable frente al valor de los envíos.',
        scoringRubric:
          '{"criteria":["Existe una póliza de seguro de transporte de mercadería que cubre el producto durante su traslado desde el centro de acopio hasta el cliente/puerto.","La póliza está vigente y el monto asegurado es razonable frente al valor de los envíos.","La cobertura de la póliza incluye la totalidad de los envíos, no solo ciertos trayectos o montos."]}',
        weight: 5,
      },
      {
        name: 'Manejo de residuos y desechos en centro de acopio.',
        description: '% de funcionamiento.',
        helpText:
          'Verifica en sitio cómo se manejan los residuos del proceso de postcosecha: cáscaras de cacao (compostaje, venta, disposición), aguas mieles de fermentación (no deben verterse directamente a fuentes de agua), y empaques usados. Revisa si existe un protocolo escrito o solo prácticas informales.',
        scoringRubric:
          '{"criteria":["Existe un protocolo escrito para el manejo de residuos del proceso de postcosecha: cáscaras de cacao (compostaje, venta, disposición), aguas mieles de fermentación y empaques usados.","Verificado en sitio, las aguas mieles de fermentación no se vierten directamente a fuentes de agua.","El protocolo se aplica consistentemente en la práctica, sin evidencia de acumulación o vertido no controlado."]}',
        weight: 8,
      },
      {
        name: 'Permisos de operación y funcionamiento para el centro de acopio (Agrocalidad, patentes, bomberos).',
        description: 'Permisos de operación vigentes.',
        helpText:
          'Verifica estos 3 documentos, todos con fecha de vigencia:\n\n1. REGISTRO/PERMISO DE AGROCALIDAD para el centro de acopio.\n2. PATENTE MUNICIPAL, emitida por el GAD, que autoriza el funcionamiento del local.\n3. PERMISO DEL CUERPO DE BOMBEROS (certificado de cumplimiento de normas de seguridad contra incendios).\n\nConfirma que los 3 estén vigentes (no vencidos) al momento de la evaluación.',
        scoringRubric:
          '{"criteria":["Existe un registro/permiso de Agrocalidad para el centro de acopio, vigente.","Existe una patente municipal, emitida por el GAD, que autoriza el funcionamiento del local, vigente.","Existe un permiso del Cuerpo de Bomberos (certificado de cumplimiento de normas de seguridad contra incendios), vigente."]}',
        weight: 11,
      },
      {
        name: 'Servicios básicos en funcionamiento (agua, luz, teléfono, internet).',
        description: '# de servicios básicos en funcionamiento.',
        helpText:
          'Verifica en sitio que el centro de acopio cuente con: agua potable/entubada funcionando, electricidad conectada y operativa, línea telefónica o celular con cobertura, e internet (fijo o móvil) funcional. Confirma los 4 servicios con una prueba simple (abrir un grifo, encender una luz, hacer una llamada, verificar conexión).',
        scoringRubric:
          '{"criteria":["Verificado en sitio con una prueba simple (abrir un grifo), el centro de acopio cuenta con agua potable/entubada funcionando.","Verificado con una prueba simple (encender una luz), cuenta con electricidad conectada y operativa.","Cuenta con línea telefónica o celular con cobertura y con conexión a internet (fijo o móvil) funcional, verificable con una llamada o prueba de conexión."]}',
        weight: 8,
      },
    ],
  },
  {
    number: 5,
    name: 'Clientes / Mercados',
    indicators: [
      {
        name: 'Cuentan con información # de clientes.',
        description: '# de clientes que realizaron compras en el último año.',
        helpText:
          'Verifica el REGISTRO COMERCIAL/DE VENTAS del último año (facturas o reporte de ventas) y cuenta cuántos clientes distintos realizaron compras (no el número de transacciones, sino de compradores únicos).',
        scoringRubric:
          '{"criteria":["Existe un registro comercial/de ventas del último año (facturas o reporte de ventas) que identifica cada compra por cliente.","Contando los clientes distintos (compradores únicos, no transacciones) que realizaron compras en el año, hay 6 o más.","Existen 10 o más clientes distintos, mostrando buena diversificación comercial y bajo riesgo de concentración."]}',
        weight: 11,
      },
      {
        name: 'Cuentan con # de contratos con clientes.',
        description: '# de contratos anuales suscritos con clientes.',
        helpText:
          "Verifica los CONTRATOS COMERCIALES FIRMADOS vigentes en el año evaluado: documentos que especifiquen cantidad, precio, calidad y condiciones de entrega acordadas con cada cliente. Cuenta cuántos contratos hay y qué porcentaje de las ventas totales del año está respaldado por ellos (versus ventas sin contrato formal, 'spot').",
        scoringRubric:
          '{"criteria":["Existen contratos comerciales firmados vigentes en el año evaluado, que especifican cantidad, precio, calidad y condiciones de entrega acordadas con cada cliente.","Al comparar las ventas respaldadas por contrato formal contra el total de ventas del año (incluidas las ventas spot sin contrato), el porcentaje respaldado por contratos es del 50% o más."]}',
        weight: 11,
      },
      {
        name: 'Se cuenta con una base de datos de clientes (CRM).',
        description:
          'Base de datos actualizada para seguimiento de clientes (CRM).',
        helpText:
          'Verifica si existe un CRM (puede ser un sistema dedicado o simplemente un Excel bien estructurado) con: datos de contacto de cada cliente, historial de compras (fechas, cantidades, precios), y condiciones comerciales acordadas. Confirma la fecha de última actualización.',
        scoringRubric:
          '{"criteria":["Existe un CRM o base de datos de clientes (sistema dedicado o Excel estructurado) con datos de contacto de cada cliente.","La base de datos incluye historial de compras (fechas, cantidades, precios) y las condiciones comerciales acordadas por cliente, no solo el nombre en las facturas.","La fecha de última actualización es de menos de 6 meses."]}',
        weight: 11,
      },
      {
        name: 'Cuentan con # de reclamos por calidad.',
        description: '# de reclamos / # rechazos del producto.',
        helpText:
          'Verifica el REGISTRO DE RECLAMOS Y RECHAZOS de producto reportados por clientes en el último año: debe incluir fecha, cliente, motivo del reclamo/rechazo, y cómo se resolvió (reposición, descuento, etc.).',
        scoringRubric:
          '{"criteria":["Existe un registro de reclamos y rechazos de producto reportados por clientes en el último año, con fecha, cliente, motivo y cómo se resolvió (reposición, descuento, etc.).","El registro muestra 0 reclamos/rechazos, o solo casos aislados que fueron resueltos, sin rechazos significativos de lotes ni reclamos recurrentes."]}',
        weight: 11,
      },
      {
        name: 'Nivel de satisfacción de clientes.',
        description: 'Análisis de encuesta de satisfacción a clientes.',
        helpText:
          'Verifica los RESULTADOS DE LA ENCUESTA DE SATISFACCIÓN A CLIENTES más reciente (si existe), con fecha de aplicación, número de clientes que respondieron, y resultado promedio.',
        scoringRubric:
          '{"criteria":["Existen resultados de una encuesta de satisfacción a clientes, con fecha de aplicación en el último año y número de clientes que respondieron.","El resultado promedio de satisfacción es del 60% o más, sin quejas recurrentes reportadas."]}',
        weight: 10,
      },
      {
        name: 'Repetición de compra de clientes.',
        description: '# de clientes que realizan más de una compra al año.',
        helpText:
          'Verifica el HISTORIAL DE VENTAS del año y calcula qué porcentaje de los clientes distintos realizó más de una compra en el periodo (versus clientes de una sola compra).',
        scoringRubric:
          '{"criteria":["Existe un historial de ventas del año que permite identificar cuántas compras distintas hizo cada cliente.","Al calcular qué porcentaje de los clientes distintos realizó más de una compra en el periodo, el resultado es del 50% o más."]}',
        weight: 8,
      },
      {
        name: 'Tiempo de respuesta para clientes.',
        description: 'Óptimo 24H; medio 48H; bajo mayor a 36H.',
        helpText:
          'Verifica el REGISTRO DE SOLICITUDES/CONSULTAS DE CLIENTES (correo, WhatsApp, llamadas) y el tiempo real que tomó responder a cada una, comparado contra el estándar esperado del propio KPI.',
        scoringRubric:
          '{"criteria":["Existe un registro de solicitudes/consultas de clientes (correo, WhatsApp, llamadas) con la fecha de recepción de cada una.","El registro incluye la fecha en que se respondió cada solicitud, permitiendo calcular el tiempo real de respuesta.","El tiempo de respuesta real es de 48 horas o menos."]}',
        weight: 7,
      },
      {
        name: 'Tiempo de resolución de quejas.',
        description: 'Óptimo 48H; medio 36H; bajo mayor a 120H.',
        helpText:
          'Similar al KPI anterior pero para quejas/reclamos formales (no solo consultas): verifica el tiempo transcurrido entre que se recibió la queja y se dio una resolución final al cliente, según el REGISTRO DE RECLAMOS del KPI de reclamos por calidad.',
        scoringRubric:
          '{"criteria":["El registro de reclamos del KPI de reclamos por calidad incluye la fecha en que se recibió cada queja formal y la fecha en que se dio una resolución final al cliente.","El tiempo transcurrido entre recepción y resolución final es de 48 horas o menos en la mayoría de los casos."]}',
        weight: 4,
      },
      {
        name: 'Tasa de retención de clientes.',
        description: '% de clientes que compran de manera frecuente.',
        helpText:
          'Compara el LISTADO DE CLIENTES DEL AÑO ANTERIOR contra el listado de clientes del año actual, y calcula qué porcentaje de los clientes del año anterior siguió comprando de forma frecuente (más de una vez) en el año actual.',
        scoringRubric:
          '{"criteria":["Existe un listado de clientes del año anterior y del año actual que permite compararlos.","Al calcular qué porcentaje de los clientes del año anterior siguió comprando de forma frecuente (más de una vez) en el año actual, el resultado es del 50% o más."]}',
        weight: 4,
      },
      {
        name: 'Diferenciación de precio por calidad.',
        description: 'Políticas de diferenciación de precios por calidad.',
        helpText:
          'Verifica la TABLA DE PRECIOS o política comercial de la organización, que debe mostrar distintos precios según parámetros de calidad medibles (nivel de fermentación, porcentaje de humedad, uniformidad del grano). Revisa si esta tabla se aplica realmente en las liquidaciones a los socios (no solo que exista en un documento).',
        scoringRubric:
          '{"criteria":["Existe una tabla de precios o política comercial escrita que muestra distintos precios según parámetros de calidad medibles (nivel de fermentación, porcentaje de humedad, uniformidad del grano).","La tabla tiene 2 o más niveles de calidad diferenciados.","Al revisar liquidaciones reales a socios, la tabla se aplica consistentemente, no solo existe en un documento."]}',
        weight: 7,
      },
      {
        name: 'Acceso a mercados especiales.',
        description: '# de mercados especiales a los que se tiene acceso.',
        helpText:
          'Verifica los CONTRATOS O REGISTROS DE VENTA a mercados diferenciados: orgánico, comercio justo, cacao de especialidad/fino de aroma, exportación directa (sin intermediarios). Cuenta a cuántos de estos mercados tiene acceso actualmente la organización.',
        scoringRubric:
          '{"criteria":["Existen contratos o registros de venta a al menos un mercado diferenciado: orgánico, comercio justo, cacao de especialidad/fino de aroma, o exportación directa (sin intermediarios).","La organización tiene acceso actual (no solo en trámite) a 2 o más de estos mercados especiales."]}',
        weight: 8,
      },
      {
        name: 'Se cuenta con certificaciones para mercados especiales.',
        description: '# de certificaciones vigentes obtenidas.',
        helpText:
          'Verifica los CERTIFICADOS VIGENTES: orgánico (ej. BCS Öko-Garantie, Ecocert), Comercio Justo/Fairtrade, Rainforest Alliance, u otras relevantes. Cada certificado debe tener número, alcance, y fecha de vencimiento — confirma que no estén vencidos.',
        scoringRubric:
          '{"criteria":["Existe al menos un certificado vigente (orgánico, ej. BCS Öko-Garantie o Ecocert; Comercio Justo/Fairtrade; Rainforest Alliance u otro relevante), con número, alcance y fecha de vencimiento confirmada como no vencida.","Existen 2 o más certificaciones vigentes simultáneamente."]}',
        weight: 8,
      },
    ],
  },
  {
    number: 6,
    name: 'Finanzas, Administración y Contabilidad',
    indicators: [
      {
        name: 'Se cuenta con un Plan de Negocios actualizado.',
        description: 'Plan de Negocios con indicadores y metas actualizados.',
        helpText:
          'Verifica el documento del PLAN DE NEGOCIOS vigente: debe incluir objetivos, estrategias, proyecciones financieras e indicadores/metas medibles. Confirma la fecha de su última actualización (idealmente del último año).',
        scoringRubric:
          '{"criteria":["Existe un documento de Plan de Negocios que incluye objetivos, estrategias, proyecciones financieras e indicadores/metas medibles.","La fecha de su última actualización es de menos de 2 años."]}',
        weight: 11,
      },
      {
        name: 'Se realizan auditorías financieras  (anuales).',
        description: 'Informe de auditoría anual aprobado.',
        helpText:
          'Verifica el INFORME DE AUDITORÍA EXTERNA más reciente: debe estar firmado por un auditor/firma auditora externa (no personal interno de la organización), con fecha, alcance de la auditoría, y las conclusiones/observaciones. Confirma que haya sido aprobado por la Asamblea o Directiva (revisa el acta correspondiente).',
        scoringRubric:
          '{"criteria":["Existe un informe de auditoría externa firmado por un auditor/firma auditora externa (no personal interno), con fecha, alcance y conclusiones/observaciones.","El informe fue aprobado por la Asamblea o Directiva, verificable en el acta correspondiente.","La auditoría más reciente corresponde al último año, no a más de 2 años atrás."]}',
        weight: 10,
      },
      {
        name: 'Se manejan un control de presupuesto mensual.',
        description: 'Reglamento aprobado para control de presupuesto.',
        helpText:
          'Verifica:\n\n1. REGLAMENTO DE CONTROL PRESUPUESTARIO aprobado por la Directiva.\n2. REPORTES MENSUALES DE EJECUCIÓN PRESUPUESTARIA: comparación de lo presupuestado contra lo realmente ejecutado, mes a mes.',
        scoringRubric:
          '{"criteria":["Existe un reglamento de control presupuestario aprobado por la Directiva.","Existen reportes periódicos de ejecución presupuestaria (comparación de lo presupuestado contra lo realmente ejecutado), con periodicidad al menos trimestral.","Los reportes se presentan de forma mensual y consistente."]}',
        weight: 10,
      },
      {
        name: 'Se cuenta con líneas de crédito activas.',
        description: '# de líneas de crédito y monto aprobado.',
        helpText:
          'Verifica los ESTADOS DE CUENTA O CONTRATOS DE CRÉDITO vigentes con entidades financieras (bancos, cooperativas de ahorro y crédito, fondos de financiamiento agrícola). Confirma el monto aprobado y si es suficiente para cubrir las necesidades del ciclo de acopio (compra de producto a productores antes de recibir el pago de clientes).',
        scoringRubric:
          '{"criteria":["Existen estados de cuenta o contratos de crédito vigentes con entidades financieras (bancos, cooperativas de ahorro y crédito, fondos de financiamiento agrícola).","El monto aprobado es suficiente para cubrir las necesidades del ciclo de acopio (compra de producto a productores antes de recibir el pago de clientes).","Existen 2 o más líneas de crédito activas simultáneamente."]}',
        weight: 10,
      },
      {
        name: 'Generación de reportes financieros (mensuales).',
        description: 'Balances de estado y situación (PYG).',
        helpText:
          'Verifica los BALANCES DE PÉRDIDAS Y GANANCIAS (PYG) y BALANCE GENERAL de los últimos meses, con fecha de generación. Confirma la periodicidad real (mensual, trimestral, semestral o solo anual).',
        scoringRubric:
          '{"criteria":["Existen balances de pérdidas y ganancias (PYG) y balance general de los últimos meses, con fecha de generación.","La periodicidad real de generación es al menos trimestral.","Los reportes se generan cada mes, sin atrasos."]}',
        weight: 8,
      },
      {
        name: 'Se conoce el Punto de Equilibrio (ventas).',
        description: 'PE = CF / (PU - CV).',
        helpText:
          'Verifica el CÁLCULO DEL PUNTO DE EQUILIBRIO documentado por el área contable: costos fijos divididos entre el margen de contribución (precio unitario menos costo variable unitario). Confirma la fecha del cálculo y si se usa para decisiones (ej. definir metas mínimas de venta).',
        scoringRubric:
          '{"criteria":["Existe el cálculo del Punto de Equilibrio documentado por el área contable (costos fijos divididos entre el margen de contribución: precio unitario menos costo variable unitario).","El cálculo está actualizado dentro del último año.","El resultado se usa en la toma de decisiones (ej. definir metas mínimas de venta), verificable al preguntar directamente."]}',
        weight: 10,
      },
      {
        name: 'Se cuenta con suficiente capital de operación.',
        description: 'Monto propio para capital de operación.',
        helpText:
          'Verifica los ESTADOS FINANCIEROS para determinar el capital propio disponible (efectivo, cuentas por cobrar de corto plazo) frente a las necesidades operativas del ciclo de acopio (cuánto dinero se necesita para pagar a productores antes de cobrar a clientes). Pregunta si han tenido periodos de iliquidez en el último año.',
        scoringRubric:
          '{"criteria":["Los estados financieros permiten determinar el capital propio disponible (efectivo, cuentas por cobrar de corto plazo) frente a las necesidades operativas del ciclo de acopio.","El capital propio cubre el 75% o más de las necesidades operativas.","No se reportan periodos de iliquidez en el último año, o son excepcionales y manejados con crédito complementario."]}',
        weight: 10,
      },
      {
        name: 'Se cuenta con un análisis de la estructura de costos.',
        description: 'Informe de estructura de costos actualizado.',
        helpText:
          'Verifica el INFORME DE ESTRUCTURA DE COSTOS más reciente: desglose de costos de producción/operación (mano de obra, insumos, transporte, procesamiento, administración). Confirma la fecha y si se usa para fijar precios o tomar decisiones.',
        scoringRubric:
          '{"criteria":["Existe un informe de estructura de costos con el desglose de costos de producción/operación (mano de obra, insumos, transporte, procesamiento, administración).","La fecha del informe es de menos de 2 años, y se usa para fijar precios o tomar decisiones."]}',
        weight: 4,
      },
      {
        name: 'Se realiza un control de inventarios frecuente.',
        description: 'Sistema de manejo de inventarios operativo.',
        helpText:
          'Verifica el SISTEMA DE CONTROL DE INVENTARIO (kardex digital o físico) del producto en bodega, con entradas y salidas registradas. Confirma la frecuencia de actualización y si se hacen conteos físicos periódicos para verificar que el inventario registrado coincida con el real.',
        scoringRubric:
          '{"criteria":["Existe un sistema de control de inventario (kardex digital o físico) del producto en bodega, con entradas y salidas registradas.","El sistema se actualiza al menos mensualmente.","Se realizan conteos físicos periódicos para verificar que el inventario registrado coincida con el real."]}',
        weight: 4,
      },
      {
        name: 'Se cuenta con un manual de procesos administrativos y contables actualizado.',
        description: 'Manual actualizado y aprobado por la Directiva.',
        helpText:
          'Verifica el MANUAL DE PROCESOS ADMINISTRATIVOS Y CONTABLES: documento que describa los procedimientos internos (compras, pagos, registro contable, manejo de caja). Debe tener un acta de aprobación por la Directiva y fecha de la última actualización.',
        scoringRubric:
          '{"criteria":["Existe un manual de procesos administrativos y contables que describe los procedimientos internos (compras, pagos, registro contable, manejo de caja).","El manual tiene acta de aprobación por la Directiva.","La fecha de la última actualización es de menos de 4 años."]}',
        weight: 9,
      },
      {
        name: 'Se cuenta con un sistema contable.',
        description: 'Sistema contable operativo y en uso.',
        helpText:
          'Verifica el SOFTWARE O SISTEMA CONTABLE en uso (puede ser un programa especializado o una hoja de cálculo estructurada) y la fecha del último registro/asiento ingresado, para confirmar que esté al día.',
        scoringRubric:
          '{"criteria":["Existe un software o sistema contable en uso (programa especializado o hoja de cálculo estructurada).","La fecha del último registro/asiento ingresado es de menos de 1 mes, mostrando que el sistema está al día."]}',
        weight: 10,
      },
      {
        name: 'Control cuentas por cobrar / pagar.',
        description: 'Reporte de cuentas por cobrar y pagar (mensual).',
        helpText:
          'Verifica el REPORTE MENSUAL DE CUENTAS POR COBRAR (dinero que clientes deben a la organización) y CUENTAS POR PAGAR (dinero que la organización debe a proveedores/productores), generado por contabilidad. Revisa si hay cuentas vencidas sin gestión de cobro/pago.',
        scoringRubric:
          '{"criteria":["Existe un reporte de cuentas por cobrar (dinero que clientes deben a la organización) y cuentas por pagar (dinero que la organización debe a proveedores/productores), generado por contabilidad.","El reporte se genera con periodicidad al menos mensual.","No hay cuentas vencidas sin gestión de cobro/pago, o las que existen están en proceso de gestión activa."]}',
        weight: 4,
      },
    ],
  },
];

function buildDimensionIndicators(
  sectionNumber: number,
  items: IndicatorSeed[],
): AssessmentSeedIndicator[] {
  return items.map((item, i) => ({
    code: `${CODE_PREFIX}-${sectionNumber}.${i + 1}`,
    name: item.name,
    description: item.description,
    helpText: item.helpText,
    scoringRubric: item.scoringRubric,
    weight: item.weight,
  }));
}

export const ORGANIZATIONAL_TOOL_TEMPLATE: AssessmentSeedTemplate = {
  tool: 'ORGANIZATIONAL',
  name: 'Diagnóstico de Fortalecimiento Organizativo',
  description:
    'Herramienta Organizativa: diagnóstico de fortalecimiento organizativo de asociaciones de productores (73 KPI reales, 6 dimensiones).',
  sections: DIMENSIONS.map((d) => ({
    number: d.number,
    name: d.name,
    weight: 1,
    indicators: buildDimensionIndicators(d.number, d.indicators),
  })),
};

export const ORGANIZATIONAL_TOOL_KPI_COUNT = DIMENSIONS.reduce(
  (sum, d) => sum + d.indicators.length,
  0,
);
