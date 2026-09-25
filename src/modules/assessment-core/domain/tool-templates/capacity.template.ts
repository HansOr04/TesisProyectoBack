import { AssessmentSeedTemplate } from './types';

const CODE_PREFIX = 'NA';

// KPI reales de la Herramienta de Capacidades (Análisis de Capacidades), transcritos del Excel
// original de la herramienta (nombre, cálculo del indicador y peso exactos, tal como los pasó el
// usuario desde su hoja de cálculo fuente). Al igual que Organizational (73 KPI) y Risk (46 KPI), este
// contenido es real, no genérico: 30 KPI reales (11+6+9+4) con su peso real de ponderación dentro
// de cada sección (no 65 como estimaba la documentación de arquitectura antes de validar contra
// el Excel).
//
// helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) requerido(s), qué
// campos debe tener cada uno, quién lo firma/llena, formato esperado, y dónde verificarlo. No usa
// sintaxis markdown (el texto se renderiza en un <p> plano con whitespace-pre-line, así que el
// formato es solo saltos de línea + numeración/guiones).
// scoringRubric: rúbrica de 5 bandas ESPECÍFICA de ese KPI (no genérica), con criterios concretos
// por puntaje. Ambos grounded en el marco normativo de debida diligencia aplicable — DDS vía TRACES, corte de no
// deforestación 31/12/2020, geolocalización obligatoria por parcela (Art. 9) — y el marco legal
// ecuatoriano aplicable: Certificado de No Afectación (MAATE, Sistema SAF), licencias de
// aprovechamiento forestal (MAATE/MAG), Código Orgánico del Ambiente (COA), Código de Trabajo,
// IESS, SRI y registro de trazabilidad de productores (Agrocalidad/MAG, Sistema SAC).

interface IndicatorSeed {
  name: string;
  description: string;
  helpText?: string;
  scoringRubric?: string;
  weight: number;
}

interface AreaSeed {
  number: number;
  name: string;
  indicators: IndicatorSeed[];
}

const AREAS: AreaSeed[] = [
  {
    number: 1,
    name: 'Gestión de la Organización',
    indicators: [
      {
        name: 'Cuenta la organización con información verificable de que los productos pertinentes son libres de deforestación',
        description:
          'Porcentaje de fincas con información verificable de no deforestación, respecto al total de fincas registradas en la base de datos. Una finca será considerada con información completa y verificable si cuenta con: 1. Registro de no deforestación posterior al 31 de diciembre de 2020. 2. Georreferenciación disponible (punto o polígono según tamaño de parcela). 3. Registros del área de plantación correctamente documentados. 4. Registros del área de bosque nativo correctamente documentados (si aplica).',
        helpText:
          'Verifica un expediente con estos documentos, finca por finca:\n\n1. DECLARACIÓN DE NO DEFORESTACIÓN (formato propio de la organización o plantilla la plataforma)\n- Debe incluir: nombre y cédula del productor, código de la finca, fecha, y afirmación explícita de que la finca no ha sido deforestada desde el 31/12/2020.\n- Firmada por el productor; idealmente respaldada con una captura de análisis satelital (Whisp o Global Forest Watch) con fecha visible.\n- Se renueva mínimo 1 vez al año.\n\n2. ARCHIVO DE GEOLOCALIZACIÓN\n- Finca menor a 4 ha: punto GPS en formato decimal (ej. -0.123456, -79.123456).\n- Finca de 4 ha o más: polígono en formato GeoJSON o KML, con al menos 4 vértices.\n- Debe llevar el código de finca para cruzarlo con el registro de productores.\n\n3. FICHA DE ÁREA DE PLANTACIÓN\n- Código de finca, hectáreas sembradas de cacao, año de siembra o edad de la plantación.\n\n4. FICHA DE ÁREA DE BOSQUE NATIVO (solo si la finca tiene bosque)\n- Hectáreas de bosque dentro de la finca; polígono diferenciado si es posible.\n\nDónde verificar: sistema de gestión de fincas (Excel maestro, KoboToolbox/ODK). Pide al responsable de trazabilidad el expediente completo de 3-5 fincas al azar como muestra.',
        scoringRubric:
          '{"criteria":["Existe, por finca, un registro o declaración de no deforestación con fecha posterior al 31/12/2020, que incluye nombre y cédula del productor, código de la finca, y una afirmación explícita de no deforestación — firmada por el productor o respaldada con un reporte satelital (ej. Whisp o Global Forest Watch).","Cada finca tiene geolocalización en formato de coordenadas o polígono: un punto GPS en formato decimal si la parcela es menor a 4 ha, o un polígono en GeoJSON/KML con al menos 4 vértices si es de 4 ha o más — no basta un dibujo o descripción del lugar.","El área de plantación de cada finca está documentada en hectáreas, junto con el año de siembra o la edad aproximada de la plantación.","Si la finca tiene bosque nativo, el área de ese bosque está documentada por separado (en hectáreas), diferenciada del área productiva."]}',
        weight: 20,
      },
      {
        name: 'Cuenta la organización con registros y permisos para aprovechamiento y manejo forestal',
        description:
          'Aplica si la organización realiza aprovechamiento forestal. Porcentaje de cumplimiento en registros y permisos forestales. La organización será considerada en cumplimiento si cuenta con: 1. Registro y permisos de aprovechamiento y manejo forestal vigentes y aprobados por la autoridad competente. 2. Planes de manejo forestal documentados, actualizados y aprobados.',
        helpText:
          'Aplica solo si la organización o sus socios realizan aprovechamiento forestal (corta de madera, leña, postes). Si aplica, verifica estos 3 documentos por predio forestal:\n\n1. REGISTRO FORESTAL (Sistema de Administración Forestal - SAF del MAATE)\n- Se tramita en línea en saf.ambiente.gob.ec. Debe incluir: nombre del titular, ubicación/coordenadas del predio, y número de registro asignado.\n- Verifica que el número de registro esté activo, no cancelado.\n\n2. LICENCIA DE APROVECHAMIENTO FORESTAL\n- Documento emitido por el MAATE que autoriza específicamente la corta de árboles: especifica volumen autorizado, especies y fecha de vigencia (usualmente 1 año).\n- Debe estar vigente al momento de la evaluación.\n\n3. PLAN DE MANEJO FORESTAL\n- Documento técnico elaborado por un profesional forestal acreditado: inventario forestal, especies a aprovechar, volumen, cronograma de corta y medidas de reforestación/regeneración.\n- Debe estar aprobado por el MAATE (sello/firma de aprobación), no solo elaborado.\n\nDónde verificar: pide al responsable ambiental o al gerente el expediente forestal completo de cada predio con aprovechamiento. Si no hay aprovechamiento forestal, marca este KPI como no aplicable.',
        scoringRubric:
          '{"criteria":["Existe un Registro Forestal activo en el Sistema de Administración Forestal (SAF) del MAATE (saf.ambiente.gob.ec) para cada predio con aprovechamiento forestal, con el nombre del titular, la ubicación del predio y el número de registro vigente (no cancelado).","Existe una Licencia de Aprovechamiento Forestal emitida por el MAATE, vigente al momento de la evaluación, que especifica el volumen autorizado, las especies a aprovechar y la fecha de vencimiento.","Existe un Plan de Manejo Forestal elaborado por un profesional forestal acreditado, que incluye inventario forestal, especies y volumen a aprovechar, cronograma de corta y medidas de reforestación/regeneración, con el sello o firma de aprobación del MAATE (no solo elaborado, sino aprobado)."]}',
        weight: 10,
      },
      {
        name: 'Cuenta con una política interna que garantice la legalidad de la operación a nivel derechos de uso del suelo',
        description:
          'La organización cuenta con una política interna formalizada que establece como requisito el cumplimiento de los siguientes criterios por parte de los productores: 1. Escrituras de propiedad legalmente registradas. 2. Contratos de uso del suelo formalizados y vigentes. 3. Permisos de uso del suelo otorgados por la autoridad competente.',
        helpText:
          'Verifica dos cosas por separado:\n\n1. EL DOCUMENTO DE POLÍTICA (a nivel organización)\n- Escrito, con título, fecha de aprobación y firma del representante legal o acta de aprobación de la Directiva.\n- Debe indicar explícitamente que exige a los productores escritura registrada, o contrato de uso de suelo vigente, o permiso de uso de suelo, según corresponda.\n\n2. EL EXPEDIENTE POR PRODUCTOR (evidencia de aplicación)\n- Por cada socio, uno de estos documentos:\n  a) Escritura de propiedad con sello de inscripción del Registro de la Propiedad del cantón correspondiente.\n  b) Certificado de posesión emitido por la autoridad competente (si no hay escritura).\n  c) Contrato de arrendamiento/comodato de uso de suelo, firmado y con fecha de vigencia, si la finca no es propia.\n- El documento debe tener el nombre del productor y la ubicación de la finca.\n\nDónde verificar: pide el documento de política a gerencia/Directiva, y una muestra de 5 expedientes de productores al área de asociatividad o trazabilidad.',
        scoringRubric:
          '{"criteria":["Existe un documento de política interna escrito, con título, fecha de aprobación y firma del representante legal (o acta de aprobación de la Directiva), que exige a los productores contar con escritura registrada, contrato de uso de suelo vigente o permiso de uso de suelo, según corresponda.","Por cada socio evaluado existe, según su situación: escritura de propiedad con sello de inscripción del Registro de la Propiedad del cantón correspondiente, certificado de posesión emitido por la autoridad competente, o contrato de arrendamiento/comodato de uso de suelo firmado y con fecha de vigencia — con el nombre del productor y la ubicación de la finca.","La política ha sido socializada con los socios y se verifica su cumplimiento en la práctica, no solo declarada en papel."]}',
        weight: 5,
      },
      {
        name: 'Cuenta con una política interna que garantice la protección del medio ambiente y su biodiversidad',
        description:
          'La organización cuenta con una política interna formalizada enfocada en la protección del medio ambiente y su biodiversidad: 1. Conservación de la biodiversidad en áreas protegidas. 2. Protección de agua, suelo y remanentes de vegetación.',
        helpText:
          'Verifica:\n\n1. EL DOCUMENTO DE POLÍTICA AMBIENTAL\n- Escrito, fechado, aprobado por la Directiva (acta o firma del representante legal).\n- Debe mencionar explícitamente: conservación de biodiversidad en áreas protegidas, y protección de agua/suelo/vegetación remanente.\n\n2. CERTIFICADO DE NO AFECTACIÓN (MAATE, Sistema SAF) — solo para fincas cercanas a Áreas Naturales Protegidas o Patrimonio Forestal\n- Se tramita en saf.ambiente.gob.ec con las coordenadas de la finca.\n- El certificado indica si la finca se sobrepone o no con un área protegida; debe decir "No afectación" para estar en cumplimiento.\n- Revisa la fecha de emisión (idealmente menos de 2 años).\n\nDónde verificar: primero identifica con el equipo técnico qué fincas están cerca de áreas protegidas (mapa de la organización o consulta al Sistema SAF), y luego pide el certificado de esas fincas específicas.',
        scoringRubric:
          '{"criteria":["Existe un documento de política ambiental escrito, fechado y aprobado por la Directiva (acta o firma del representante legal), que menciona explícitamente la conservación de biodiversidad en áreas protegidas y la protección de agua, suelo y vegetación remanente.","Para toda finca ubicada cerca de un Área Natural Protegida o Patrimonio Forestal, existe un Certificado de No Afectación emitido por el MAATE (Sistema SAF) con resultado \\"No afectación\\" y fecha de emisión de menos de 2 años.","La organización ha identificado, mediante un mapa o consulta al Sistema SAF, qué fincas están cerca de áreas protegidas, para poder aplicar el certificado donde corresponde."]}',
        weight: 5,
      },
      {
        name: 'Cuenta con una política interna que garantice el cumplimiento de la normativa ambiental local',
        description:
          'La organización cuenta con una política interna formalizada que establece el cumplimiento de la normativa ambiental local, incluyendo: 1. Gestión forestal sostenible y permisos de aprovechamiento maderero (si aplica). 2. Conservación de la biodiversidad en áreas protegidas. 3. Cumplimiento de regulaciones ambientales locales.',
        helpText:
          'Este KPI es distinto al anterior: aquí se evalúa que la política CITE la normativa legal aplicable, no solo que existan buenas prácticas. Verifica que el documento de política:\n\n1. Mencione explícitamente el Código Orgánico del Ambiente (COA) y su reglamento de aplicación.\n2. Incluya, si aplica, el compromiso de tramitar permisos de aprovechamiento maderero.\n3. Referencie el cumplimiento de ordenanzas ambientales del GAD municipal/provincial correspondiente.\n\nFormato esperado: documento de 1-3 páginas, con encabezado de la organización, fecha, y firma del representante legal o aprobación en acta de Directiva. Si la política ambiental del KPI anterior ya cita estas leyes por nombre, puede ser el mismo documento — confírmalo revisando si nombra la normativa explícitamente.',
        scoringRubric:
          '{"criteria":["El documento de política ambiental cita explícitamente el Código Orgánico del Ambiente (COA, la ley ecuatoriana que regula la gestión ambiental) y su reglamento de aplicación.","Si la organización realiza aprovechamiento maderero, la política incluye el compromiso explícito de tramitar los permisos correspondientes.","La política referencia el cumplimiento de las ordenanzas ambientales del GAD municipal o provincial correspondiente a la zona de operación.","El documento tiene encabezado de la organización, fecha, y firma del representante legal o aprobación en acta de Directiva."]}',
        weight: 5,
      },
      {
        name: 'Cuenta con una política interna que garantice derechos de terceros',
        description:
          'La organización cuenta con una política interna formalizada que garantiza el respeto y cumplimiento de los derechos de terceros en el desarrollo de la actividad agrícola, incluyendo: 1. Respeto a la propiedad y uso de tierras ajenas. 2. Cumplimiento de acuerdos y contratos con terceros.',
        helpText:
          'Verifica:\n\n1. EL DOCUMENTO DE POLÍTICA\n- Debe indicar que la organización y sus socios respetarán la propiedad y uso de tierras que no les pertenecen.\n\n2. ACUERDOS CON TERCEROS (si aplica)\n- Si alguna finca requiere pasar por terreno ajeno (servidumbre de paso), compartir una fuente de agua, o similar, debe existir un acuerdo o contrato firmado por ambas partes, con fecha y descripción de lo acordado.\n- No necesita ser notariado, pero sí debe estar firmado y fechado.\n\nDónde verificar: pregunta a la gerencia si existen casos conocidos de servidumbres, límites compartidos o uso de recursos comunes, y pide ver el acuerdo correspondiente.',
        scoringRubric:
          '{"criteria":["Existe un documento de política que indica explícitamente que la organización y sus socios respetarán la propiedad y el uso de tierras que no les pertenecen.","En los casos donde una finca requiere servidumbre de paso, comparte una fuente de agua u otro recurso con terceros, existe un acuerdo o contrato firmado por ambas partes, con fecha y descripción de lo acordado (no necesita ser notariado, pero sí firmado y fechado).","La gerencia ha identificado los casos conocidos de interacción con terceros (servidumbres, límites compartidos, recursos comunes) y puede mostrar el acuerdo correspondiente a cada uno."]}',
        weight: 5,
      },
      {
        name: 'Cuenta con una política interna que garantice los derechos laborales',
        description:
          'La organización cuenta con una política interna formalizada que garantiza el respeto y cumplimiento de los derechos laborales, en conformidad con: 1. Normas de la Organización Internacional del Trabajo (OIT). 2. Código de Trabajo del Ecuador. 3. Condiciones laborales justas, incluyendo contratación formal, seguridad social y pago de salarios acorde a la normativa vigente. 4. Garantía de un ambiente laboral seguro y saludable.',
        helpText:
          'Verifica dos niveles:\n\n1. EL DOCUMENTO DE POLÍTICA LABORAL\n- Debe referenciar el Código de Trabajo del Ecuador y los convenios de la OIT aplicables.\n- Debe cubrir: contratación formal, afiliación a seguridad social, salarios conforme a ley, condiciones seguras de trabajo.\n\n2. EVIDENCIA DE APLICACIÓN (muestra de 3-5 trabajadores)\n- CONTRATO DE TRABAJO: legalizado, con firma del trabajador y del representante legal, registrado en el Sistema Único de Trabajo (SUT) del Ministerio del Trabajo.\n- COMPROBANTE DE AFILIACIÓN AL IESS: se verifica en el portal del IESS con la cédula del trabajador (estado "activo").\n- ROL DE PAGOS: salario igual o mayor al básico unificado vigente, con descuentos de ley correctamente aplicados.\n\nDónde verificar: pide a la administración una muestra aleatoria de 3-5 trabajadores y solicita su carpeta completa (contrato + comprobante IESS + últimos 2 roles de pago).',
        scoringRubric:
          '{"criteria":["Existe un documento de política laboral que referencia el Código de Trabajo del Ecuador y los convenios de la OIT aplicables, cubriendo contratación formal, afiliación a seguridad social, salarios conforme a ley y condiciones seguras de trabajo.","En una muestra de trabajadores, cada uno tiene un contrato de trabajo legalizado, firmado por ambas partes y registrado en el Sistema Único de Trabajo (SUT) del Ministerio del Trabajo.","Cada trabajador de la muestra tiene afiliación activa al IESS, verificable en el portal del IESS con su número de cédula.","El rol de pagos de cada trabajador de la muestra muestra un salario igual o mayor al básico unificado vigente, con los descuentos de ley correctamente aplicados."]}',
        weight: 5,
      },
      {
        name: 'Cuenta con una política interna que garantice el cumplimiento de derechos humanos',
        description:
          'La organización cuenta con una política interna formalizada que garantiza el respeto y cumplimiento de los derechos humanos, conforme a los principios y normas del Derecho Internacional, incluyendo: 1. Respeto a la dignidad, igualdad y no discriminación en todas las actividades y relaciones laborales. 2. Prohibición del trabajo infantil, forzoso o en condiciones de explotación. 3. Cumplimiento de tratados y convenios internacionales sobre derechos humanos aplicables al sector.',
        helpText:
          'Verifica:\n\n1. EL DOCUMENTO DE POLÍTICA DE DERECHOS HUMANOS\n- Debe prohibir explícitamente (con esas palabras o equivalentes): trabajo infantil, trabajo forzoso, discriminación por género/etnia/edad/discapacidad.\n- Debe mencionar el marco de derechos humanos aplicable (Constitución del Ecuador, Código de la Niñez y Adolescencia, tratados internacionales).\n\n2. EVIDENCIA DE SOCIALIZACIÓN\n- Acta o lista de asistencia de un taller/reunión donde se presentó la política a socios y/o trabajadores, con fecha.\n- Sin esto, la política existe "en papel" pero no se puede confirmar que se conoce.\n\nDónde verificar: pide el documento de política y, por separado, pregunta explícitamente por evidencia de socialización — muchas organizaciones tienen la política pero nunca la difunden.',
        scoringRubric:
          '{"criteria":["Existe un documento de política de derechos humanos que prohíbe explícitamente el trabajo infantil, el trabajo forzoso y la discriminación por género, etnia, edad o discapacidad.","El documento menciona el marco de derechos humanos aplicable (Constitución del Ecuador, Código de la Niñez y Adolescencia, tratados internacionales relevantes).","Existe evidencia de socialización de la política: un acta o lista de asistencia, con fecha, de un taller o reunión donde se presentó la política a socios y/o trabajadores."]}',
        weight: 5,
      },
      {
        name: 'Cuenta con una política interna que garantice el principio de consentimiento libre, previo e informado de Pueblos Indígenas',
        description:
          'Este indicador aplica si la organización se encuentra en áreas con la presencia de Pueblos y Nacionalidades (Indígenas, Afro, Montubios), con claras expresiones culturales en el territorio. La organización cuenta con una política interna formalizada que garantiza el cumplimiento del principio de consentimiento libre, previo e informado (CLPI), conforme a la Declaración de la ONU sobre los Derechos de los Pueblos Indígenas, asegurando que: 1. Los pueblos indígenas sean consultados antes de cualquier actividad que afecte sus territorios o recursos. 2. Las consultas sean transparentes, accesibles y culturalmente adecuadas. 3. Se respete su autodeterminación y gestión territorial sin presiones externas. 4. Los acuerdos sean documentados y vinculantes para garantizar su cumplimiento.',
        helpText:
          'Primero determina si aplica: ¿la organización tiene socios o fincas en territorios de Pueblos y Nacionalidades (Indígenas, Afro, Montubios) con expresiones culturales identificables? Si no aplica, márcalo como no aplicable y no sigas.\n\nSi aplica, verifica:\n\n1. POLÍTICA DE CLPI (Consentimiento Libre, Previo e Informado)\n- Documento que cite la Declaración de la ONU sobre los Derechos de los Pueblos Indígenas.\n\n2. ACTA(S) DE CONSULTA\n- Debe registrar: fecha, lugar, lista de participantes con firmas, temas tratados, y resultado/acuerdo de la consulta.\n- La consulta debe haberse hecho antes de iniciar la actividad que afecta el territorio, no después.\n\n3. ACUERDO(S) DOCUMENTADOS\n- Documento firmado por ambas partes (organización y representantes de la comunidad) con los compromisos acordados.\n\nDónde verificar: pregunta directamente a la gerencia y, si es posible, confirma con algún líder comunitario si la consulta efectivamente ocurrió.',
        scoringRubric:
          '{"criteria":["Existe una política de Consentimiento Libre, Previo e Informado (CLPI) que cita la Declaración de la ONU sobre los Derechos de los Pueblos Indígenas.","Existen actas de consulta con fecha, lugar, lista de participantes firmada, temas tratados y resultado, realizadas antes de iniciar la actividad que afecta el territorio o los recursos de la comunidad.","Existen acuerdos derivados de la consulta, documentados y firmados por ambas partes (organización y representantes de la comunidad), con los compromisos acordados."]}',
        weight: 5,
      },
      {
        name: 'Cuenta con una política interna que garantice la legalidad de la operación a nivel fiscal y de buenas prácticas comerciales',
        description:
          'La organización cuenta con una política interna formalizada que garantiza el cumplimiento de la normativa vigente en: 1. Obligaciones fiscales y tributarias. 2. Lucha contra la corrupción y el soborno. 3. Normativas comerciales y aduaneras.',
        helpText:
          'Verifica:\n\n1. RUC DE LA ORGANIZACIÓN (activo)\n- Se verifica en el portal del SRI (Consulta de RUC) con el número de RUC — debe aparecer como "Activo", no "Suspendido".\n\n2. CERTIFICADO DE CUMPLIMIENTO TRIBUTARIO (SRI)\n- Documento descargable del portal del SRI que certifica que la organización está al día en declaraciones y pagos. Tiene fecha de emisión y de vigencia.\n\n3. CÓDIGO DE ÉTICA O POLÍTICA ANTICORRUPCIÓN\n- Documento breve que mencione explícitamente la prohibición de sobornos y prácticas de corrupción en las relaciones comerciales.\n\n4. SI EXPORTA: registro de cumplimiento aduanero (Agrocalidad, certificado de origen).\n\nDónde verificar: pide al área contable el certificado de cumplimiento tributario más reciente (no debe tener más de unos meses de emitido) y el documento de código de ética a la gerencia.',
        scoringRubric:
          '{"criteria":["El RUC de la organización aparece como Activo (no Suspendido) en la Consulta de RUC del portal del SRI.","Existe un Certificado de Cumplimiento Tributario descargado del portal del SRI, con fecha de emisión reciente (últimos meses), que certifica que la organización está al día en declaraciones y pagos.","Existe un documento de código de ética o política anticorrupción que menciona explícitamente la prohibición de sobornos y prácticas de corrupción en las relaciones comerciales.","Si la organización exporta, cuenta con el registro de cumplimiento aduanero correspondiente (Agrocalidad, certificado de origen)."]}',
        weight: 5,
      },
      {
        name: 'Cuenta con un responsable del cumplimiento de la normativa aplicable, a nivel de la directiva de la organización',
        description:
          'La asociación cuenta con el nombramiento de un responsable encargado del cumplimiento de la normativa aplicable y documento con la descripción de funciones.',
        helpText:
          'Verifica dos documentos:\n\n1. ACTA DE NOMBRAMIENTO\n- Acta de la Directiva o Asamblea donde se nombra explícitamente a una persona como "Responsable de Cumplimiento Assessment" (o cargo equivalente). Debe tener fecha, firma de quien preside, y el nombre completo de la persona nombrada.\n\n2. DOCUMENTO DE DESCRIPCIÓN DE FUNCIONES\n- Debe detallar tareas concretas, como mínimo: elaborar/gestionar la Declaración de Diligencia Debida (DDS) en el sistema oficial de registro, coordinar la recopilación de geolocalización, y dar seguimiento al cumplimiento de los demás KPI de esta herramienta.\n\nVerifica también, en una breve conversación con esa persona, que conozca conceptos básicos del Assessment (fecha de corte 31/12/2020, qué es la DDS, qué es TRACES) — si nunca ha oído estos términos, el nombramiento es solo formal y no funcional.\n\nEste es el KPI de mayor peso del área (30 puntos): sin un responsable real, ningún otro proceso de cumplimiento normativo se sostiene en el tiempo.',
        scoringRubric:
          '{"criteria":["Existe un acta de la Directiva o Asamblea, con fecha y firma de quien preside, que nombra explícitamente a una persona como Responsable de Cumplimiento Assessment (o cargo equivalente), con su nombre completo.","Existe un documento de descripción de funciones que detalla tareas concretas: elaborar/gestionar la Declaración de Diligencia Debida (DDS) en el sistema oficial de registro, coordinar la recopilación de geolocalización, y dar seguimiento al cumplimiento de los demás KPI de esta herramienta.","La persona nombrada conoce conceptos básicos del Assessment (fecha de corte 31/12/2020, qué es la DDS, qué es TRACES) al ser consultada directamente — no es solo un nombramiento formal en papel."]}',
        weight: 30,
      },
    ],
  },
  {
    number: 2,
    name: 'Disponibilidad de Información',
    indicators: [
      {
        name: 'La organización recopila, organiza y conserva (durante cinco años) desde la fecha de comercialización del producto una base de datos completa de sus miembros',
        description:
          'La organización recopila, organiza y conserva la siguiente información sobre los productos pertinentes: 1. Nombre comercial y el tipo del producto pertinente. 2. Nombre común de la especie y su nombre científico completo. 3. Descripción del producto, incluida la lista de las materias primas o productos que contenga o que se hayan utilizado para elaborarlo.',
        helpText:
          'Verifica la BASE DE DATOS DE PRODUCTOS de la organización (Excel, KoboToolbox o software de trazabilidad). Por cada producto/lote debe tener estos 3 campos como mínimo:\n\n1. Nombre comercial y tipo del producto (ej. "Cacao en grano seco, fermentado").\n2. Nombre común y nombre científico completo de la especie: "Cacao, Theobroma cacao L." (el nombre científico completo suele faltar — revísalo con atención).\n3. Descripción del producto y materias primas usadas (ej. "Grano de cacao seco fermentado, sin mezcla con otros productos").\n\nAdemás, confirma que exista una POLÍTICA DE RETENCIÓN DE REGISTROS por escrito que indique que estos datos se conservan mínimo 5 años desde que el producto se comercializó — pregunta directamente si existe este compromiso documentado, ya que muchas organizaciones cumplen el registro pero no tienen política de retención.',
        scoringRubric:
          '{"criteria":["Cada producto o lote en la base de datos tiene registrado el nombre comercial y el tipo de producto (ej. Cacao en grano seco, fermentado).","Cada producto tiene registrado el nombre común y el nombre científico completo de la especie (ej. Cacao, Theobroma cacao L.) — no solo el nombre común.","Cada producto tiene una descripción que incluye las materias primas que contiene o se usaron para elaborarlo.","Existe una política de retención de registros por escrito que compromete a conservar estos datos un mínimo de 5 años desde que el producto se comercializó."]}',
        weight: 16,
      },
      {
        name: 'Cuenta con un registro de cantidad para los productos pertinentes',
        description:
          'La organización cuenta con un registro formalizado que documenta la cantidad de los productos pertinentes, incluyendo: 1. Cantidad neta en kilogramos. 2. Volumen neto o número de unidades, según corresponda.',
        helpText:
          'Verifica el REGISTRO DE CANTIDAD por lote de entrega/venta. Debe incluir, por lote:\n\n1. Cantidad neta en kilogramos (peso exacto, no estimado).\n2. Volumen neto o número de unidades, si aplica al tipo de empaque (sacos, quintales).\n\nFormato esperado: libro de entradas/salidas, sistema digital, o el respaldo de guías de remisión y facturas. Toma 3-5 lotes al azar y compara: el peso registrado en el sistema interno debe coincidir con el peso de la guía de remisión y, si existe, con la Declaración de Diligencia Debida (DDS) presentada en TRACES para ese envío.',
        scoringRubric:
          '{"criteria":["Cada lote de entrega o venta tiene registrada su cantidad neta exacta en kilogramos (no estimada).","Cada lote tiene registrado el volumen neto o número de unidades, según el tipo de empaque (sacos, quintales).","El peso registrado en el sistema interno coincide con el peso de la guía de remisión y, si existe, con la Declaración de Diligencia Debida (DDS) presentada en TRACES para ese envío, verificado en una muestra de lotes."]}',
        weight: 16,
      },
      {
        name: 'Ha incluido la información del país de producción, incorporando datos de la localidad en la cual se produce la materia prima',
        description:
          'La organización ha recopilado y documentado la información de producción de la materia prima, incluyendo: 1. País. 2. Provincia. 3. Cantón. 4. Parroquia. 5. Recinto o localidad.',
        helpText:
          'Verifica que la ficha de cada parcela/productor tenga estos 5 datos, en este orden de detalle:\n\n1. País: Ecuador.\n2. Provincia (ej. Manabí, Los Ríos, Esmeraldas).\n3. Cantón.\n4. Parroquia.\n5. Recinto o localidad específica (el nivel más detallado — es el que más frecuentemente falta).\n\nEste dato es independiente de la geolocalización GPS del KPI siguiente: aquí se evalúa la dirección administrativa completa, no las coordenadas. Revisa el registro de productores y confirma que el campo "recinto/localidad" esté lleno para cada uno, no solo provincia y cantón.',
        scoringRubric:
          '{"criteria":["La ficha de cada parcela o productor registra los 5 niveles de ubicación administrativa: país, provincia, cantón, parroquia y recinto o localidad específica.","El campo de recinto o localidad específica está completo (no solo provincia y cantón), que es el nivel de detalle que más frecuentemente falta en los registros.","Este dato de ubicación administrativa está documentado de forma independiente a las coordenadas GPS del KPI de geolocalización."]}',
        weight: 16,
      },
      {
        name: 'Cuenta con geolocalización de cada una de las parcelas',
        description:
          'La organización cuenta con la geolocalización de cada parcela donde se produjeron las materias primas, cumpliendo con los siguientes criterios: 1. Parcelas menores a 4 ha: un punto GPS registrado. 2. Parcelas mayores a 4 ha: un polígono georreferenciado. 3. Registro de la fecha o intervalo temporal de producción. 4. Si el producto contiene materias primas de distintas parcelas, se debe registrar la geolocalización de todas ellas.',
        helpText:
          'Este es el KPI más crítico del Assessment (Art. 9 del Reglamento exige geolocalización obligatoria por parcela). Verifica, por cada parcela:\n\n1. SI ES MENOR A 4 HECTÁREAS: un punto GPS en formato de coordenadas decimales (ej. latitud -0.123456, longitud -79.123456). Se toma con GPS portátil o una app móvil (ODK Collect, KoboCollect).\n\n2. SI ES DE 4 HECTÁREAS O MÁS: un polígono que delimite el perímetro, en formato GeoJSON, KML o Shapefile — no basta con un dibujo o descripción, debe ser un archivo geoespacial real cargable en QGIS o en el propio TRACES.\n\n3. FECHA DE PRODUCCIÓN o intervalo temporal de la cosecha asociada a esa geolocalización.\n\n4. Si un lote de venta mezcla materia prima de varias parcelas, TODAS deben estar georreferenciadas — pide ver el detalle de un lote mezclado como prueba.\n\nDónde verificar: pide al responsable de trazabilidad que exporte o muestre el archivo de geolocalización (no una captura de pantalla de un mapa, sino el archivo de coordenadas/polígonos en sí) y compáralo contra el registro de productores para confirmar que cubre a todos.',
        scoringRubric:
          '{"criteria":["Cada parcela menor a 4 hectáreas tiene un punto GPS registrado en formato de coordenadas decimales (ej. -0.123456, -79.123456), tomado con GPS portátil o app móvil.","Cada parcela de 4 hectáreas o más tiene un polígono georreferenciado en formato GeoJSON, KML o Shapefile (archivo geoespacial real, no un dibujo o descripción) que delimita su perímetro.","Cada geolocalización tiene registrada la fecha o el intervalo temporal de producción asociado.","Si un lote de venta mezcla materia prima de varias parcelas, todas las parcelas de origen están georreferenciadas — verificable en el detalle de un lote mezclado real."]}',
        weight: 20,
      },
      {
        name: 'Tiene información de contacto de los socios legales y socios comerciales de la organización',
        description:
          'La organización cuenta con un registro formalizado y actualizado de la información de contacto de sus socios legales y comerciales, incluyendo: 1. Nombre y número de cédula de ciudadanía y/o RUC. 2. Número telefónico y/o celular. 3. Dirección postal y/o ubicación. 4. Correo electrónico.',
        helpText:
          'Verifica el registro de socios, con estos 4 campos por persona:\n\n1. Nombre completo y número de cédula y/o RUC.\n2. Número telefónico/celular (verifica que sea un número válido, no un campo vacío o "0000000000").\n3. Dirección postal o ubicación (puede ser la misma dirección de la finca).\n4. Correo electrónico (si el socio no tiene, puede usarse el de un familiar o representante, pero debe quedar anotado).\n\nToma una muestra de 3-5 socios y, si es posible, verifica que el número de teléfono realmente corresponda a esa persona — es común que las bases de datos tengan números desactualizados.',
        scoringRubric:
          '{"criteria":["Cada socio tiene registrado su nombre completo y número de cédula y/o RUC.","Cada socio tiene registrado un número telefónico/celular válido (no un campo vacío o un número genérico como 0000000000).","Cada socio tiene registrada una dirección postal o ubicación, y un correo electrónico (propio o de un familiar/representante, anotado explícitamente)."]}',
        weight: 16,
      },
      {
        name: 'Tiene información de contacto de los clientes (organización, empresa, operador o comerciante a quienes se haya entregado el producto)',
        description:
          'La organización cuenta con un registro formalizado y actualizado de la información de contacto de sus clientes (organización, empresa, operador o comerciante a quienes se haya entregado el producto), incluyendo: 1. Nombre y número de cédula de ciudadanía y/o RUC. 2. Número telefónico y/o celular. 3. Dirección postal y/o ubicación. 4. Correo electrónico.',
        helpText:
          'Verifica el registro de clientes (compradores del producto), con los mismos 4 campos que los socios:\n\n1. Nombre y cédula/RUC del cliente (organización, empresa o comerciante).\n2. Teléfono/celular.\n3. Dirección o ubicación.\n4. Correo electrónico.\n\nEste registro suele estar en el sistema de ventas/facturación. Verifica que no dependa solo de las facturas (que a veces solo tienen RUC y razón social) sino que exista una ficha de cliente más completa con datos de contacto directo — necesarios para que la organización pueda demostrar a quién vendió cada lote si la UE lo solicita.',
        scoringRubric:
          '{"criteria":["Cada cliente (organización, empresa o comerciante comprador) tiene registrado su nombre y número de cédula/RUC.","Cada cliente tiene registrado teléfono/celular y dirección o ubicación.","Cada cliente tiene registrado un correo electrónico, en una ficha de cliente independiente de las facturas de venta (que a veces solo tienen RUC y razón social)."]}',
        weight: 16,
      },
    ],
  },
  {
    number: 3,
    name: 'Evaluación de Riesgos',
    indicators: [
      {
        name: 'Cuenta con un análisis de riesgo de su cadena de suministro',
        description:
          'La organización cuenta con análisis para la identificación y evaluación de riesgos en su cadena de suministro.',
        helpText:
          'Verifica el documento de ANÁLISIS DE RIESGO (también llamado Sistema de Diligencia Debida). Debe tener:\n\n1. Fecha de elaboración y nombre del responsable que lo elaboró.\n2. Identificación de riesgo de DEFORESTACIÓN por finca/proveedor (alto/medio/bajo, con criterio explicado).\n3. Identificación de riesgo de ILEGALIDAD (tenencia de tierra, permisos, tributación).\n4. Identificación de riesgo de TRAZABILIDAD (posibilidad de mezcla con producto no verificado).\n5. Debe cubrir a TODOS los proveedores/socios, no solo una muestra — revisa que el número de fincas analizadas coincida con el total registrado.\n\nFormato esperado: documento de varias páginas (no una sola hoja), típicamente con una tabla o matriz de riesgo por finca/proveedor. Pide la versión más reciente y confirma la fecha (no debe tener más de 1 año).',
        scoringRubric:
          '{"criteria":["Existe un documento de análisis de riesgo (Sistema de Diligencia Debida) con fecha de elaboración, nombre del responsable, y antigüedad menor a 1 año.","El análisis identifica el riesgo de deforestación por finca/proveedor (clasificado como alto/medio/bajo, con el criterio usado explicado), y cubre el 100% de los proveedores/socios registrados, no solo una muestra.","El análisis identifica por separado el riesgo de ilegalidad (tenencia de tierra, permisos, tributación) y el riesgo de trazabilidad (posibilidad de mezcla con producto no verificado).","El documento tiene formato de matriz o tabla de riesgo por finca/proveedor, no una sola hoja genérica."]}',
        weight: 25,
      },
      {
        name: 'Hay presencia de bosques en las fincas de la organización',
        description:
          'La organización cuenta con un registro documentado sobre la presencia de bosques en las fincas de sus socios legales y comerciales.',
        helpText:
          'Verifica el REGISTRO DE VERIFICACIÓN DE BOSQUE, por finca. Puede ser:\n\n1. Una ficha de visita de campo con un check "Sí/No" de presencia de bosque nativo, firmada por el técnico que hizo la visita, con fecha.\n2. Un reporte de cruce satelital (ej. capturas de Whisp o Global Forest Watch) que muestre cobertura de bosque en las coordenadas de cada finca.\n\nIdealmente ambos. Confirma que el registro cubra a todas las fincas, no solo a las que "se sabe" que tienen bosque — el objetivo es tener un dato verificado para cada una, incluidas las que no tienen bosque (con evidencia de esa ausencia también).',
        scoringRubric:
          '{"criteria":["Existe, por finca, una ficha de verificación de presencia o ausencia de bosque nativo: una ficha de visita de campo firmada por el técnico con fecha, o un reporte de cruce satelital (ej. Whisp o Global Forest Watch) que muestre la cobertura en las coordenadas de la finca.","El registro cubre el 100% de las fincas, incluidas las que no tienen bosque, con evidencia documentada de esa ausencia y no solo de las que sí lo tienen."]}',
        weight: 7,
      },
      {
        name: 'Hay presencia de pueblos indígenas en las áreas de producción',
        description:
          'La organización cuenta con un registro documentado de la presencia de pueblos y nacionalidades indígenas en las áreas de producción, asegurando que se identifiquen y registren los socios pertenecientes a pueblos y nacionalidades indígenas.',
        helpText:
          'Verifica el REGISTRO DE AUTOIDENTIFICACIÓN ÉTNICA en la ficha de cada socio (campo que indique si el productor se autoidentifica como indígena, afroecuatoriano, montubio, mestizo, etc. — dato que normalmente se recoge en el registro de socios). Complementa, si es posible, con un cruce contra mapas oficiales de territorios ancestrales/comunales (disponibles en el Ministerio de Agricultura o el GAD de la zona).\n\nDónde verificar: revisa si el formulario de registro de socios tiene un campo de autoidentificación étnica lleno, o si la organización tiene algún mapeo cualitativo hecho con el equipo técnico.',
        scoringRubric:
          '{"criteria":["La ficha de registro de cada socio tiene un campo de autoidentificación étnica lleno (indígena, afroecuatoriano, montubio, mestizo u otro).","La organización ha cruzado, o intentado cruzar, esta información con mapas oficiales de territorios ancestrales/comunales disponibles en el Ministerio de Agricultura o el GAD de la zona."]}',
        weight: 7,
      },
      {
        name: 'Se ha realizado un proceso de consulta previa, libre e informada con pueblos indígenas',
        description:
          'La organización ha llevado a cabo un proceso documentado de consulta previa, libre e informada (CLPI) con pueblos indígenas, asegurando que existan actas formales que evidencien la realización de la consulta.',
        helpText:
          'Aplica solo si el KPI anterior confirmó presencia de pueblos y nacionalidades. Si aplica, verifica:\n\n1. ACTA(S) DE CONSULTA CLPI: con fecha, lugar, lista de asistentes firmada, y resumen de lo discutido.\n2. ACUERDOS derivados de la consulta, documentados y firmados.\n\nSi el KPI anterior determinó que no aplica (no hay presencia de pueblos indígenas), marca este KPI como no aplicable también.',
        scoringRubric:
          '{"criteria":["Si el KPI de presencia de pueblos indígenas confirmó su existencia en las áreas de producción, existen actas de consulta previa, libre e informada, con fecha, lugar, lista de asistentes firmada y resumen de lo discutido.","Existen acuerdos derivados de la consulta, documentados y firmados por ambas partes.","Si no hay presencia de pueblos indígenas confirmada, el KPI está marcado explícitamente como no aplicable, en lugar de quedar sin evidencia."]}',
        weight: 7,
      },
      {
        name: 'Existe prevalencia de la deforestación o degradación forestal en las fincas de los socios',
        description:
          'La organización cuenta con registros de verificación para determinar la existencia de deforestación o degradación forestal en las fincas de sus socios, asegurando que: 1. Se disponga de registros de verificación de no deforestación a partir del 31 de diciembre de 2020. 2. Las fincas estén georreferenciadas con datos actualizados que permitan monitorear cambios en la cobertura forestal.',
        helpText:
          'Verifica, por finca, un REPORTE DE VERIFICACIÓN SATELITAL que compare la cobertura de bosque antes y después del 31/12/2020. Debe incluir:\n\n1. Nombre/código de la finca y sus coordenadas.\n2. Fuente de la imagen satelital usada (ej. Whisp, Global Forest Watch, Sentinel) y fecha de la consulta.\n3. Resultado: "sin cambios" o "cambio detectado", con la fecha aproximada del cambio si lo hay.\n\nHerramientas recomendadas: Whisp (Forest Data Partnership, gratuito y diseñado específicamente para Assessment), o Global Forest Watch. Pide que te muestren cómo generan este reporte y con qué frecuencia lo actualizan.',
        scoringRubric:
          '{"criteria":["Existe, por finca, un reporte de verificación satelital que compara la cobertura de bosque antes y después del 31 de diciembre de 2020, con el nombre/código de la finca y sus coordenadas.","El reporte indica la fuente de la imagen satelital usada (ej. Whisp, Global Forest Watch, Sentinel) y la fecha de la consulta.","El reporte concluye explícitamente sin cambios o cambio detectado (con fecha aproximada del cambio si lo hay), y esta verificación está actualizada dentro del último año."]}',
        weight: 7,
      },
      {
        name: 'Se toman medidas internas para prevenir actos de corrupción o violación de derechos humanos',
        description:
          'La organización cuenta con medidas internas formalizadas para prevenir la corrupción, asegurando que: 1. Se implementen controles para evitar la falsificación de documentos y datos. 2. Se garantice el cumplimiento de la legislación ecuatoriana en todas las operaciones. 3. Se prevengan violaciones al derecho internacional en materia de derechos humanos.',
        helpText:
          'Verifica:\n\n1. DOCUMENTO DE CONTROLES INTERNOS: debe describir mecanismos concretos, como firmas autorizadas para documentos clave, respaldo digital de información sensible, y doble verificación en transacciones importantes.\n2. REFERENCIA EXPLÍCITA a la legislación ecuatoriana y al derecho internacional de derechos humanos.\n3. Si existe, un REGISTRO DE CASOS gestionados (aunque sea "ninguno reportado en el periodo"), lo cual demuestra que el mecanismo se usa activamente, no solo que existe en papel.',
        scoringRubric:
          '{"criteria":["Existe un documento de controles internos que describe mecanismos concretos: firmas autorizadas para documentos clave, respaldo digital de información sensible, doble verificación en transacciones importantes.","El documento hace referencia explícita a la legislación ecuatoriana aplicable y al marco de derecho internacional de derechos humanos.","Existe un registro de casos gestionados en el periodo (aunque el registro diga ninguno reportado), que demuestra que el mecanismo se usa activamente y no solo existe en papel."]}',
        weight: 8,
      },
      {
        name: 'Existe riesgo de mezcla con productos de origen desconocido o producidos en zonas en las que se haya causado o se esté causando deforestación o degradación forestal',
        description:
          'La organización cuenta con mecanismos de trazabilidad documentados para prevenir la mezcla de productos con origen desconocido o provenientes de áreas con deforestación, asegurando que: 1. Se verifique el origen de todos los productos antes de su integración en la cadena de suministro. 2. No haya riesgo de endoso o comercialización de productos ajenos a las fincas de los socios legales y comerciales. 3. Existan sistemas de trazabilidad efectivos, como registros digitales, etiquetado y auditorías internas, para garantizar la procedencia certificada.',
        helpText:
          'Verifica el SISTEMA DE TRAZABILIDAD POR LOTE. Debe permitir responder, para cualquier lote de venta: "¿de qué fincas/socios viene este cacao?". Revisa:\n\n1. Registro de recepción: cada entrega de un socio queda identificada con su código antes de mezclarse en el acopio.\n2. Registro de fermentación/secado: si se mezclan entregas de varios socios en un mismo lote de proceso, debe quedar registrado cuáles.\n3. Registro de despacho: el lote final vendido debe poder rastrearse hacia las entregas/fincas de origen.\n4. Confirma que NO se compre producto a personas que no son socios registrados — esa sería la principal fuente de riesgo de mezcla con origen desconocido.\n\nPide que te muestren, con un lote real vendido recientemente, cómo rastrean hacia atrás el origen: esa prueba práctica es la mejor evidencia.',
        scoringRubric:
          '{"criteria":["Cada entrega de un socio queda identificada con su código en el registro de recepción antes de mezclarse en el acopio.","Cuando se mezclan entregas de varios socios en un mismo lote de proceso (fermentación/secado), queda registrado cuáles socios aportaron a ese lote.","El lote final vendido puede rastrearse, mediante el registro de despacho, hacia las entregas y fincas de origen — verificable con un lote real vendido recientemente.","La organización no compra producto a personas que no son socios registrados."]}',
        weight: 7,
      },
      {
        name: 'Cuenta con información complementaria sobre el cumplimiento del Assessment, que puede incluir información proporcionada por sistemas de certificación u otros sistemas de verificación por terceros',
        description:
          'La organización cuenta con información complementaria documentada que respalda el cumplimiento del Assessment, a través de: 1. Sistemas de certificación reconocidos (ej. Certificación Orgánica, Comercio Justo u otras certificaciones relevantes). 2. Sistemas propios de trazabilidad, que permitan verificar el origen y cumplimiento de la normativa en toda la cadena de suministro. 3. Verificación por terceros, mediante auditorías externas o participación en esquemas de certificación.',
        helpText:
          'Verifica si existe alguno de estos 3 respaldos adicionales:\n\n1. CERTIFICADO DE CERTIFICACIÓN VIGENTE (orgánica, Comercio Justo/Fairtrade, Rainforest Alliance, u otra): documento con número de certificado, alcance, y fecha de vigencia — verifica que no esté vencido.\n2. SISTEMA PROPIO DE TRAZABILIDAD documentado (manual de procedimientos de trazabilidad, no solo su existencia práctica).\n3. INFORME DE AUDITORÍA EXTERNA reciente (de un certificador o de un comprador que audita a sus proveedores).\n\nCualquiera de los 3 cuenta como evidencia; entre más de uno exista, mejor calificación.',
        scoringRubric:
          '{"criteria":["Existe al menos una certificación reconocida vigente (orgánica, Comercio Justo/Fairtrade, Rainforest Alliance u otra), con número de certificado, alcance y fecha de vigencia no vencida.","Existe un manual o documento de procedimientos de trazabilidad propio de la organización, no solo la práctica informal.","Existe un informe de auditoría externa reciente, ya sea de un certificador o de un comprador que audita a sus proveedores."]}',
        weight: 20,
      },
      {
        name: 'Se documentan y revisan las evaluaciones de riesgo al menos una vez al año',
        description:
          'La organización cuenta con un Sistema de Diligencia Debida que documenta y revisa las evaluaciones de riesgo al menos una vez al año, asegurando que: 1. Exista un registro formal de las evaluaciones de riesgo. 2. Se realicen verificaciones periódicas. 3. Se implementen medidas correctivas y de mitigación.',
        helpText:
          'Verifica un ACTA O INFORME DE REVISIÓN ANUAL del análisis de riesgo (del KPI "Cuenta con un análisis de riesgo..."), con:\n\n1. Fecha de la revisión (debe ser del último año).\n2. Quién participó en la revisión (Directiva, responsable Assessment, técnicos).\n3. Cambios o actualizaciones identificadas respecto a la versión anterior.\n4. Medidas correctivas acordadas y, si es posible, evidencia de que se implementaron (ej. seguimiento en la siguiente revisión).',
        scoringRubric:
          '{"criteria":["Existe un acta o informe de revisión anual del análisis de riesgo, con fecha del último año.","El documento indica quién participó en la revisión (Directiva, responsable Assessment, técnicos).","El documento describe los cambios o actualizaciones identificadas respecto a la versión anterior del análisis, y las medidas correctivas acordadas.","Existe evidencia de que las medidas correctivas acordadas se implementaron, verificable en el seguimiento de la siguiente revisión."]}',
        weight: 12,
      },
    ],
  },
  {
    number: 4,
    name: 'Medidas de Reducción',
    indicators: [
      {
        name: 'Cuenta con procedimientos y medidas adecuadas de reducción del riesgo para conseguir que el mismo sea nulo o despreciable',
        description:
          'La organización cuenta con procedimientos documentados para reducir el riesgo a un nivel nulo o despreciable, mediante: 1. Recopilación de información, datos o documentos adicionales. 2. Estudios o auditorías independientes. 3. Otras medidas complementarias para verificación y control.',
        helpText:
          'Verifica el documento de PROCEDIMIENTOS DE MITIGACIÓN, y sobre todo evidencia de que se aplicaron a casos reales:\n\n1. Documento que describa qué hacer cuando se identifica un riesgo (ej. "si falta la escritura, se solicita al productor en un plazo de 30 días").\n2. Al menos un caso real donde se identificó un riesgo (del análisis de riesgo del Área 3) y se aplicó una medida concreta — pide ver un ejemplo específico, con fecha de identificación del riesgo y fecha de resolución.',
        scoringRubric:
          '{"criteria":["Existe un documento que describe qué hacer cuando se identifica un riesgo (ej. si falta la escritura, se solicita al productor en un plazo de 30 días).","Existe al menos un caso real, tomado del análisis de riesgo del Área 3, donde se identificó un riesgo y se aplicó una medida concreta de mitigación, con fecha de identificación del riesgo y fecha de resolución."]}',
        weight: 25,
      },
      {
        name: 'Cuenta con políticas, controles y procedimientos adecuados y proporcionados, para reducir y gestionar eficazmente los riesgos de incumplimiento identificados relativos a los productos',
        description:
          'La organización cuenta con políticas y procedimientos documentados para reducir y gestionar los riesgos de incumplimiento del Assessment, incluyendo: 1. Procedimientos de gestión del riesgo. 2. Presentación y conservación de registros. 3. Controles internos y gestión del cumplimiento. 4. Responsable del cumplimiento a nivel directivo. 5. Auditoría independiente para verificación.',
        helpText:
          'Verifica que exista UN DOCUMENTO INTEGRAL (o un conjunto claramente vinculado de documentos) que cubra estos 5 elementos — haz una lista de verificación:\n\n1. Procedimientos de gestión del riesgo (cómo se identifica, evalúa, prioriza).\n2. Reglas de conservación de registros (por cuánto tiempo, quién los custodia).\n3. Controles internos (revisiones periódicas, responsables).\n4. El responsable de cumplimiento a nivel directivo (ver Área 1).\n5. Previsión de auditoría independiente (interna o externa).\n\nMarca cuáles de los 5 están presentes y documentados.',
        scoringRubric:
          '{"criteria":["Existe un documento (o conjunto de documentos claramente vinculados) que describe los procedimientos de gestión del riesgo: cómo se identifica, evalúa y prioriza.","El documento establece reglas de conservación de registros: por cuánto tiempo se guardan y quién los custodia.","El documento describe los controles internos aplicados (revisiones periódicas, responsables) y confirma el nombramiento del responsable de cumplimiento a nivel directivo.","El documento prevé una auditoría independiente (interna o externa) del sistema de diligencia debida."]}',
        weight: 25,
      },
      {
        name: 'Se documenta y revisa al menos una vez al año las decisiones sobre los procedimientos y medidas de reducción del riesgo',
        description:
          'La organización documenta y revisa al menos una vez al año las decisiones sobre la reducción del riesgo.',
        helpText:
          'Verifica un ACTA O INFORME con fecha del último año donde la Directiva revisó específicamente las medidas de reducción de riesgo (no el análisis de riesgo en sí, sino las medidas de mitigación de los dos KPI anteriores). Debe distinguirse de actas generales de Directiva: busca que el tema aparezca como punto específico de la agenda, no una mención de pasada.',
        scoringRubric:
          '{"criteria":["Existe un acta o informe con fecha del último año donde la Directiva revisó específicamente las medidas de reducción de riesgo, no el análisis de riesgo en sí.","El tema aparece como punto específico de la agenda de la reunión, no como una mención de pasada dentro de un acta general de Directiva."]}',
        weight: 25,
      },
      {
        name: 'Se puede demostrar cómo se tomaron las decisiones acerca de los procedimientos y medidas de reducción del riesgo',
        description:
          'La organización puede demostrar cómo se tomaron las decisiones sobre procedimientos y medidas de reducción del riesgo, mediante actas de reuniones de la directiva y de asambleas generales y extraordinarias de la organización, relacionadas con la reducción del riesgo.',
        helpText:
          'Verifica las ACTAS DE DIRECTIVA Y/O ASAMBLEA que muestren el proceso deliberativo, no solo el resultado final. Un acta completa debe incluir:\n\n1. Quién propuso la medida.\n2. Qué opciones se discutieron.\n3. Cómo se llegó a la decisión final (consenso, votación).\n4. Quién aprobó y con qué fecha.\n\nSi las actas solo dicen "se aprobó la medida X" sin mostrar el proceso previo, la calificación debe ser más baja aunque la decisión en sí exista.',
        scoringRubric:
          '{"criteria":["Las actas de Directiva o Asamblea disponibles registran quién propuso la medida de reducción de riesgo y qué opciones se discutieron.","Las actas muestran cómo se llegó a la decisión final (consenso o votación), y quién la aprobó, con fecha.","Las actas no se limitan a declarar que se aprobó la medida, sino que documentan el proceso deliberativo previo."]}',
        weight: 25,
      },
    ],
  },
];

export const CAPACITY_TOOL_TEMPLATE: AssessmentSeedTemplate = {
  tool: 'CAPACITY',
  name: 'Análisis de Capacidades',
  description:
    'Herramienta de Capacidades: análisis de capacidades de la organización frente al marco normativo aplicable (30 KPI reales, 4 áreas estratégicas).',
  sections: AREAS.map((a) => ({
    number: a.number,
    name: a.name,
    weight: 1,
    indicators: a.indicators.map((ind, idx) => ({
      code: `${CODE_PREFIX}-${a.number}.${idx + 1}`,
      name: ind.name,
      description: ind.description,
      helpText: ind.helpText,
      scoringRubric: ind.scoringRubric,
      weight: ind.weight,
    })),
  })),
};

export const CAPACITY_TOOL_KPI_COUNT = AREAS.reduce(
  (sum, a) => sum + a.indicators.length,
  0,
);
