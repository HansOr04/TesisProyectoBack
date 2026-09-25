import {
  AssessmentSeedTemplate,
  AssessmentCountryRiskParams,
  AssessmentSeedIndicator,
} from './types';

const CODE_PREFIX = 'VE';

// KPI reales de la Herramienta de Riesgos (Gestión de Riesgos), transcritos del Excel original
// de la herramienta (HERRAMIENTA GESTION DE RIESGOS_V3_2025.xlsm, hoja "DATA UE LDD (2)"):
// nombre, cálculo del indicador y peso exactos por KPI dentro de cada principio (los 4 totales
// de peso ya suman 100 en el archivo fuente). 46 KPI en 4 principios.
//
// helpText: instructivo detallado por KPI — nombre exacto del/los documento(s) requerido(s), qué
// campos debe tener cada uno, quién lo firma/llena, formato esperado, y dónde verificarlo. No usa
// sintaxis markdown (el texto se renderiza en un <p> plano con whitespace-pre-line: el formato es
// solo saltos de línea + numeración/guiones).
// scoringRubric: rúbrica de 5 bandas ESPECÍFICA de cada KPI (no genérica), grounded en el
// marco normativo de debida diligencia aplicable y el marco legal ecuatoriano aplicable (RUC/SRI, Código del
// Trabajo, IESS, MAATE, ECUAPASS, Registro de la Propiedad, SENAGUA).

interface IndicatorSeed {
  name: string;
  description: string;
  helpText?: string;
  scoringRubric?: string;
  weight: number;
}

interface PrincipleSeed {
  number: number;
  name: string;
  indicators: IndicatorSeed[];
}

const PRINCIPLES_SEED: PrincipleSeed[] = [
  {
    number: 1,
    name: 'Gestión y Prácticas Empresariales Responsables',
    indicators: [
      {
        name: '1.1.1. Los derechos de tenencia de la tierra están asegurados y registrados de acuerdo con los requisitos legales, o deben ser reconocidos por las autoridades, como lo suficientemente y claros para permitir prácticas de manejo y uso de la tierra que cumplan con la ley y la venta de productos producidos allí.',
        description:
          'Porcentaje de propiedades con títulos de propiedad debidamente inscritos, respecto al total de propiedades evaluadas, para evaluar la seguridad y registro de los derechos de tenencia de la tierra.',
        helpText:
          'Verifica, por cada propiedad evaluada, uno de estos documentos:\n\n1. ESCRITURA DE PROPIEDAD\n- Debe tener el sello de inscripción del Registro de la Propiedad del cantón donde está la finca (no basta la escritura firmada ante notario sin inscribir).\n- Verifica que el nombre del propietario coincida con el socio registrado, y que el área en la escritura sea consistente con el área declarada de la finca.\n\n2. CERTIFICADO DE POSESIÓN (si no hay escritura)\n- Documento emitido por la autoridad competente (GAD, o en zonas rurales el MAG) que reconoce la posesión de facto cuando no existe título formal.\n\nSi la propiedad es comunal o ancestral, verifica el documento de reconocimiento oficial de esa tenencia colectiva.\n\nDónde verificar: pide al área de asociatividad o trazabilidad la carpeta de documentos de tenencia por productor; toma una muestra de 5-8 fincas.',
        scoringRubric:
          '{"criteria":["Cada propiedad tiene una escritura de propiedad con el sello de inscripción del Registro de la Propiedad del cantón correspondiente, o -si no hay escritura- un certificado de posesión emitido por la autoridad competente (GAD o MAG).","El nombre del propietario que figura en la escritura o certificado coincide exactamente con el nombre del socio registrado en la organización.","Si la propiedad es de tenencia comunal o ancestral, existe el documento oficial que reconoce esa forma de tenencia colectiva (ej. título comunitario del MAG/SENAGUA)."]}',
        weight: 6,
      },
      {
        name: '1.1.2 Los derechos de gestión de la tierra están vigentes y registrados de acuerdo con los requisitos legales.',
        description:
          'Porcentaje de propiedades con permisos de uso del suelo otorgados por la autoridad competente, respecto al total de propiedades evaluadas.',
        helpText:
          'Verifica el PERMISO DE USO DE SUELO por propiedad:\n\n1. Documento emitido por el GAD municipal (o la autoridad de planificación territorial correspondiente) que autoriza el uso agrícola de la parcela.\n2. Debe indicar el uso autorizado (agrícola/agroforestal) y coincidir con el uso real que se le da a la finca.\n3. Revisa la fecha de emisión: algunos GAD emiten permisos con vigencia indefinida, otros requieren renovación periódica; confirma cuál aplica en la zona.\n\nEste permiso es distinto a la escritura del KPI anterior: aquí se autoriza el uso específico del suelo, no la propiedad.',
        scoringRubric:
          '{"criteria":["Cada propiedad tiene un permiso de uso de suelo emitido por el GAD municipal (o autoridad de planificación territorial correspondiente) que autoriza el uso agrícola de la parcela.","El uso autorizado en el permiso (agrícola/agroforestal) coincide con el uso real que se le da a la finca.","El permiso está vigente según la modalidad de la zona (indefinida o con renovación periódica confirmada)."]}',
        weight: 6,
      },
      {
        name: '1.1.3 Las tierras donde se maneja y produce están protegidas de la invasión ilegal por parte de terceros.',
        description:
          'Porcentaje de tierras debidamente delimitadas y sin problemas de invasión, respecto al total de propiedades evaluadas.',
        helpText:
          'Verifica, por finca:\n\n1. DELIMITACIÓN FÍSICA/LEGAL: linderos claros (cercas vivas, mojones, cerramiento) que coincidan con los límites de la escritura o certificado de posesión.\n2. Confirma con el productor y, si es posible, con un vecino colindante, que no exista ningún conflicto activo de invasión o disputa de límites.\n3. Si hubo un conflicto en el pasado, verifica si existe un documento de resolución (acta de mediación, sentencia, acuerdo entre las partes).\n\nNo requiere un documento único: es una verificación combinada de campo (visita) más revisión de la escritura/certificado.',
        scoringRubric:
          '{"criteria":["Cada finca tiene linderos claros (cercas vivas, mojones, cerramiento) que coinciden con los límites de la escritura o certificado de posesión.","Al confirmar con el productor y, si es posible, con un vecino colindante, no existe ningún conflicto activo de invasión o disputa de límites.","Si hubo un conflicto en el pasado, existe un documento de resolución (acta de mediación, sentencia o acuerdo entre las partes)."]}',
        weight: 6,
      },
      {
        name: '1.2.1 Se cumplen los requisitos legales para la planificación del uso y gestión de la tierra.',
        description:
          'Porcentaje de propiedas que cumplen con las normas de planificación de uso y gestión de la tierra, respecto al total de propiedades evaluadas.',
        helpText:
          'Verifica que el uso actual del suelo (cultivo de cacao) sea consistente con el Plan de Desarrollo y Ordenamiento Territorial (PDOT) del GAD cantonal/provincial correspondiente:\n\n1. Consulta el PDOT vigente (disponible en la web del GAD o solicitándolo directamente) para la zonificación de uso de suelo donde está ubicada la finca.\n2. Confirma que la zonificación permita actividad agrícola/agroforestal (no debe estar en zona de protección estricta, expansión urbana u otro uso incompatible).\n\nDónde verificar: si la organización no tiene esta verificación hecha, puedes hacerla consultando el PDOT del cantón con las coordenadas de una muestra de fincas.',
        scoringRubric:
          '{"criteria":["Se ha consultado el Plan de Desarrollo y Ordenamiento Territorial (PDOT) vigente del GAD cantonal/provincial para la zonificación de uso de suelo de cada finca.","La zonificación del PDOT permite actividad agrícola/agroforestal en la ubicación de la finca (no está en zona de protección estricta, expansión urbana u otro uso incompatible)."]}',
        weight: 7,
      },
      {
        name: '1.2.2 Se cumplen los requisitos legales de cosecha o producción.',
        description:
          'Porcentaje de productores que cuentan con certificado cumplimiento de Buenas Prácticas Agrícolas (BPA) o una equivalencia de certificación orgánica, respecto al total de propiedades evaluadas.',
        helpText:
          'Verifica, por productor:\n\n1. CERTIFICADO DE BUENAS PRÁCTICAS AGRÍCOLAS (BPA) DE AGROCALIDAD\n- Se tramita ante Agrocalidad. El certificado tiene número, fecha de emisión y de vencimiento (usualmente 1-2 años de vigencia).\n- Verifica que no esté vencido.\n\n2. CERTIFICACIÓN ORGÁNICA EQUIVALENTE (alternativa a BPA)\n- Documento de un certificador acreditado (ej. BCS Öko-Garantie, Ecocert) con alcance y vigencia.\n\n3. Si ninguna certificación individual existe, verifica si hay una CERTIFICACIÓN GRUPAL a nombre de la organización que cubra a los socios como parte de un Sistema Interno de Control (SIC).',
        scoringRubric:
          '{"criteria":["Cada productor cuenta con un certificado de Buenas Prácticas Agrícolas (BPA) vigente emitido por Agrocalidad, con número, fecha de emisión y de vencimiento no vencido, o una certificación orgánica equivalente (ej. BCS Öko-Garantie, Ecocert) con alcance y vigencia.","Si no hay certificación individual, existe una certificación grupal a nombre de la organización que cubre a los socios como parte de un Sistema Interno de Control (SIC)."]}',
        weight: 7,
      },
      {
        name: '1.3.1 Se cumplen los requisitos legales para el pago de regalías, impuestos sobre la tierra y la superficie y tasas.',
        description:
          'Porcentaje de productores que cumplen con el pago de impuestos y tasas sobre la tierra, respecto al total de propiedades evaluadas.',
        helpText:
          'Verifica, por productor, el COMPROBANTE DE PAGO DEL IMPUESTO PREDIAL:\n\n1. Emitido por el GAD municipal; indica el año fiscal, el valor pagado, y el catastro/clave predial de la propiedad.\n2. Debe corresponder al año fiscal vigente o al más reciente exigible (el impuesto predial en Ecuador se paga anualmente).\n\nPuede solicitarse también una certificación de no adeudar al GAD, que confirma que no hay pagos pendientes.',
        scoringRubric:
          '{"criteria":["Cada productor tiene un comprobante de pago del impuesto predial emitido por el GAD municipal, con el año fiscal, valor pagado y catastro/clave predial de la propiedad.","El comprobante corresponde al año fiscal vigente o al más reciente exigible."]}',
        weight: 6,
      },
      {
        name: '1.3.2 Se cumplen los requisitos legales para el pago de impuestos sobre el valor añadido y/u otros impuestos sobre las ventas.',
        description:
          'Porcentaje de productores que cumplen con sus obligaciones tributarias (obtención del RUC, presentación de declaraciones de impuestos, certificado de cumplimiento tributario, liquidaciones de compra, etc.), respecto al total de productores evaluados.',
        helpText:
          "Verifica, por productor:\n\n1. RUC ACTIVO: se confirma en el portal del SRI (Consulta de RUC) ingresando la cédula — debe mostrar estado 'Activo'.\n2. DECLARACIONES DE IVA/RENTA: comprobante de declaraciones presentadas, según el régimen del productor (RIMPE, régimen general, etc.).\n3. CERTIFICADO DE CUMPLIMIENTO TRIBUTARIO: documento del SRI que confirma que no hay obligaciones pendientes.\n\nPara productores que venden de manera informal a la organización (sin RUC propio), verifica que la organización emita una LIQUIDACIÓN DE COMPRA DE BIENES Y PRESTACIÓN DE SERVICIOS (comprobante autorizado por el SRI que la organización emite a nombre del productor).",
        scoringRubric:
          '{"criteria":["Cada productor tiene su RUC activo verificable en el portal del SRI (Consulta de RUC), o -si no tiene RUC propio- la organización le emite una Liquidación de Compra de Bienes y Prestación de Servicios autorizada por el SRI.","Existe comprobante de declaraciones de IVA/Renta presentadas según el régimen del productor (RIMPE, régimen general, etc.).","Existe un Certificado de Cumplimiento Tributario del SRI que confirma que no hay obligaciones pendientes."]}',
        weight: 6,
      },
      {
        name: '1.3.3 Se cumplen los requisitos legales para el pago de los impuestos de sociedades, incluidos los impuestos sobre los beneficios.',
        description:
          'La asociación cuenta con certificado de cumplimiento de obligaciones tributarias, al momento de la evaluación (Cumple = 10; No Cumple = 1).',
        helpText:
          'Verifica el CERTIFICADO DE CUMPLIMIENTO DE OBLIGACIONES TRIBUTARIAS de la organización (no de productores individuales), descargable del portal del SRI con el RUC de la organización:\n\n1. Debe indicar que la organización está al día en Impuesto a la Renta, retenciones y demás obligaciones societarias.\n2. Verifica la fecha de emisión (debe ser reciente, idealmente del último trimestre).',
        scoringRubric:
          '{"criteria":["Existe el Certificado de Cumplimiento de Obligaciones Tributarias de la organización, descargado del portal del SRI con el RUC de la organización.","El certificado indica que la organización está al día en Impuesto a la Renta, retenciones y demás obligaciones societarias, y tiene fecha de emisión reciente (idealmente del último trimestre)."]}',
        weight: 6,
      },
      {
        name: '1.3.4 Se cumplen los requisitos legales para el pago de impuestos y tasas comerciales y/o de exportación.',
        description:
          'Este indicador aplica unicamente si la organización realiza actividades de exportación.\n\nLa asociación esta al día en pago de impuestos, tasas comerciales y/o de exportación exigidos por las autoridades competentes. Agrocalidad, Certificado de origen, Declaración Aduanera de Exportación - DAE.',
        helpText:
          'Aplica solo si la organización exporta directamente. Si aplica, verifica:\n\n1. REGISTRO EN AGROCALIDAD: registro del exportador/producto ante Agrocalidad para exportación de cacao.\n2. CERTIFICADO DE ORIGEN: documento emitido para cada embarque que certifica el origen ecuatoriano del producto (tramitado ante la Cámara de Comercio o entidad habilitada).\n3. DECLARACIÓN ADUANERA DE EXPORTACIÓN (DAE): documento del Servicio Nacional de Aduana del Ecuador (SENAE) generado en el sistema ECUAPASS para cada exportación.\n\nRevisa los últimos 2-3 embarques y confirma que los 3 documentos existan y estén completos para cada uno.',
        scoringRubric:
          '{"criteria":["Si la organización exporta, existe el registro del exportador/producto ante Agrocalidad para exportación de cacao.","Existe el Certificado de Origen para cada embarque, tramitado ante la Cámara de Comercio o entidad habilitada.","Existe la Declaración Aduanera de Exportación (DAE) generada en el sistema ECUAPASS para cada exportación, verificada en los últimos 2-3 embarques."]}',
        weight: 6,
      },
      {
        name: '1.4.1 Se cumplen los requisitos legales relacionados con la corrupción, incluido el soborno, el fraude y los conflictos de intereses.',
        description:
          'La organización ha implementado medidas concretas para evitar la corrupción, el fraude y los conflictos de interés.',
        helpText:
          'Verifica:\n\n1. CÓDIGO DE ÉTICA O POLÍTICA ANTICORRUPCIÓN: documento escrito, con fecha y aprobación de la Directiva, que prohíba explícitamente soborno, fraude y conflicto de interés.\n2. EVIDENCIA DE SOCIALIZACIÓN: acta o lista de firmas de socios/directiva/personal que confirme conocimiento de esta política.\n3. Si existe, un canal de denuncias (buzón, correo, contacto directo) para reportar posibles casos.',
        scoringRubric:
          '{"criteria":["Existe un código de ética o política anticorrupción escrito, con fecha y aprobación de la Directiva, que prohíbe explícitamente soborno, fraude y conflicto de interés.","Existe evidencia de socialización (acta o lista de firmas de socios, directiva y personal) que confirme conocimiento de esta política.","Existe un canal de denuncias (buzón, correo, contacto directo) para reportar posibles casos."]}',
        weight: 6,
      },
      {
        name: '1.4.2 No se produce falsificación de datos y documentos.',
        description:
          'Cuenta con sistema de control actualizado para identificar alteración o falsificación de documentos internos (Incluye reglamento de sanciones).\n\nCuenta = 10; En proceso o actualización = 5; No cuenta = 1',
        helpText:
          'Verifica:\n\n1. SISTEMA DE CONTROL DOCUMENTAL: describe cómo se protegen los documentos clave — ejemplo: firmas autorizadas únicamente de gerencia/presidencia, numeración consecutiva de documentos, respaldo digital con control de acceso.\n2. REGLAMENTO DE SANCIONES: documento que especifique las consecuencias (desde llamado de atención hasta expulsión) ante un caso comprobado de falsificación.\n\nPide ver el reglamento y pregunta si alguna vez se ha aplicado — no es negativo si dicen que no ha habido casos; lo importante es que el mecanismo exista y sea conocido.',
        scoringRubric:
          '{"criteria":["Existe un sistema de control documental que describe cómo se protegen los documentos clave (firmas autorizadas únicamente de gerencia/presidencia, numeración consecutiva, respaldo digital con control de acceso).","Existe un reglamento de sanciones que especifica las consecuencias ante un caso comprobado de falsificación, y es conocido por el personal al preguntar directamente."]}',
        weight: 6,
      },
      {
        name: '1.5.1 Se cumplen los requisitos legales relacionados con el comercio y el transporte de productos.',
        description:
          'La asociación cuenta con guias de remisión autorizadas para el envió de lotes de cacao a sus clientes.',
        helpText:
          'Verifica, por envío de producto:\n\n1. GUÍA DE REMISIÓN autorizada por el SRI: debe incluir datos del emisor (organización), del transportista, del destinatario, la descripción y cantidad del producto, y el motivo del traslado.\n2. La guía debe estar dentro del rango de numeración autorizado por el SRI.\n\nToma 3-5 envíos recientes al azar y confirma que cada uno tenga su guía correspondiente, correctamente llenada (no solo el número, sino todos los campos).',
        scoringRubric:
          '{"criteria":["Cada envío de producto tiene una guía de remisión autorizada por el SRI, con datos del emisor, transportista, destinatario, descripción y cantidad del producto, y motivo del traslado.","La guía está dentro del rango de numeración autorizado por el SRI y todos sus campos están correctamente llenados, verificado en una muestra de 3-5 envíos recientes."]}',
        weight: 6,
      },
      {
        name: '1.5.2 Se cumplen los requisitos legales relativos a la clasificación de los productos.',
        description:
          'La asociación clasifica los lotes de cacao según los estándares de buenas prácticas como: separación de otros productos, clasificación por calidad, almacenamiento y transporte.',
        helpText:
          'Verifica el PROTOCOLO DE CLASIFICACIÓN DE LOTES, que debe describir:\n\n1. Separación física de cacao respecto a otros productos (si la organización maneja más de un cultivo).\n2. Criterios de clasificación por calidad: nivel de fermentación, porcentaje de humedad, tamaño/uniformidad del grano — usualmente con parámetros numéricos (ej. humedad máxima 7-8%).\n3. Condiciones diferenciadas de almacenamiento y transporte según la clasificación.\n\nPide ver el registro de clasificación de 2-3 lotes recientes con los resultados de humedad/calidad medidos.',
        scoringRubric:
          '{"criteria":["Existe un protocolo de clasificación de lotes que describe la separación física de cacao respecto a otros productos, si la organización maneja más de un cultivo.","El protocolo define criterios de clasificación por calidad con parámetros numéricos (nivel de fermentación, porcentaje de humedad máxima, tamaño/uniformidad del grano).","Existen registros de clasificación de lotes recientes con los resultados de humedad/calidad medidos, y condiciones diferenciadas de almacenamiento y transporte según la clasificación."]}',
        weight: 7,
      },
      {
        name: '1.5.3 Se cumplen los requisitos legales relativos a la exportación y/o importación.',
        description:
          'Este indicador aplica unicamente si la organización realiza actividades de exportación. \n\nVerificar si cuenta con el registro en el Sistema ECUAPASS y cumple con las regulaciones para las exportaciones de cacao.',
        helpText:
          'Aplica solo si la organización exporta directamente. Si aplica, verifica:\n\n1. REGISTRO EN EL SISTEMA ECUAPASS: cuenta activa de la organización como exportador en el sistema del SENAE (ecuapass.aduana.gob.ec).\n2. Cumplimiento de los requisitos fitosanitarios de Agrocalidad para exportación de cacao (certificado fitosanitario de exportación por embarque).\n3. Partida arancelaria correcta declarada para el producto exportado.',
        scoringRubric:
          '{"criteria":["Si la organización exporta, tiene una cuenta activa como exportador en el sistema ECUAPASS del SENAE.","Cuenta con el certificado fitosanitario de exportación de Agrocalidad por cada embarque.","La partida arancelaria declarada para el producto exportado es correcta."]}',
        weight: 6,
      },
      {
        name: '1.5.4 Se cumplen los requisitos legales relacionados con el comercio offshore (extraterritorial) y los precios de transferencia.',
        description:
          'Aplica unicamente para asociaciones que realizan actividades comerciales o financieras fuera del país de origen.\n\nLa asociación cuenta con un registro de las transacciones internacionales con documentación adecuada y declarada correctamente.\n​',
        helpText:
          'Aplica solo si la organización realiza operaciones comerciales o financieras fuera del país de origen (ventas directas al exterior sin intermediario local, cuentas bancarias en el extranjero). Si aplica, verifica:\n\n1. REGISTRO DE TRANSACCIONES INTERNACIONALES: libro o sistema contable que documente cada transacción con contraparte extranjera.\n2. Declaración correspondiente ante el SRI de estas transacciones (retenciones en la fuente por pagos al exterior, si aplica).',
        scoringRubric:
          '{"criteria":["Si la organización realiza operaciones comerciales o financieras fuera del país (ventas directas al exterior sin intermediario local, cuentas bancarias en el extranjero), existe un registro de transacciones internacionales en el sistema contable.","Cada transacción con contraparte extranjera está declarada correctamente ante el SRI (incluidas retenciones en la fuente por pagos al exterior, si aplica)."]}',
        weight: 6,
      },
      {
        name: '1.5.5 Se cumplen los requisitos legales relacionados con la diligencia debida o el cuidado debido.',
        description:
          'La asociación cuenta con Geolocalización y Trazabilidad; Verificación de No Deforestación; Cumplimiento de Legislación Nacional; Evaluación y Mitigación de Riesgos.\n\nCuenta = 10; En proceso o actualización = 5; No cuenta = 1',
        helpText:
          'Verifica que la organización cuente con los 4 componentes de diligencia debida, cada uno con su propia evidencia documental:\n\n1. GEOLOCALIZACIÓN Y TRAZABILIDAD: archivo de coordenadas/polígonos por parcela (ver Principio 4).\n2. VERIFICACIÓN DE NO DEFORESTACIÓN: reportes satelitales posteriores al 31/12/2020 (ver Principio 3).\n3. CUMPLIMIENTO DE LEGISLACIÓN NACIONAL: los documentos legales de tenencia, tributación y laborales de este mismo principio.\n4. EVALUACIÓN Y MITIGACIÓN DE RIESGOS: documento de análisis de riesgo con plan de mitigación.\n\nEste KPI es la base de toda la Herramienta de Riesgos: los demás 45 KPI son, en conjunto, la evidencia detallada de estos 4 componentes.',
        scoringRubric:
          '{"criteria":["Existe el componente de geolocalización y trazabilidad: archivo de coordenadas/polígonos por parcela.","Existe el componente de verificación de no deforestación: reportes satelitales posteriores al 31/12/2020.","Existe el componente de cumplimiento de legislación nacional: los documentos legales de tenencia, tributación y laborales de este mismo principio.","Existe el componente de evaluación y mitigación de riesgos: documento de análisis de riesgo con plan de mitigación."]}',
        weight: 7,
      },
    ],
  },
  {
    number: 2,
    name: 'Respetar el Bienestar de las Personas y los Derechos Humanos',
    indicators: [
      {
        name: '2.1.1 Los derechos humanos se respetan de acuerdo con el derecho nacional e internacional.',
        description:
          'La asociación y sus miembros cuentan con una política sobre el cumplimiento de derechos humanos según acuerdos nacionales e internacionales.',
        helpText:
          'Verifica el DOCUMENTO DE POLÍTICA DE DERECHOS HUMANOS:\n\n1. Debe citar explícitamente el marco constitucional (Constitución del Ecuador, Título II - Derechos) y al menos un instrumento internacional (Declaración Universal de DDHH, Pactos de la ONU).\n2. Debe estar aprobado (firma del representante legal o acta de Directiva) y fechado.\n3. Verifica evidencia de socialización (taller, reunión, entrega de copia a socios/trabajadores con firma de recibido).',
        scoringRubric:
          '{"criteria":["Existe un documento de política de derechos humanos que cita explícitamente el marco constitucional (Constitución del Ecuador, Título II - Derechos) y al menos un instrumento internacional (Declaración Universal de DDHH, Pactos de la ONU).","El documento está aprobado (firma del representante legal o acta de Directiva) y fechado.","Existe evidencia de socialización (taller, reunión, entrega de copia a socios/trabajadores con firma de recibido)."]}',
        weight: 7,
      },
      {
        name: '2.1.2 La recolección o el comercio de productos no contribuyen a la violación de los derechos humanos internacionales ni a los conflictos armados.',
        description:
          'La asociación cuenta con políticas claras y protocolos para evitar violación de derechos humanos internacionales.',
        helpText:
          'Verifica:\n\n1. POLÍTICA/PROTOCOLO que declare que la organización no comprará ni comercializará producto de fuentes vinculadas a violaciones de derechos humanos o conflictos armados.\n2. PROCESO DE VERIFICACIÓN DE ORIGEN de proveedores: cómo confirma la organización que cada finca proveedora es legítima antes de aceptar su producto (revisa el registro de socios y el proceso de admisión de nuevos socios).',
        scoringRubric:
          '{"criteria":["Existe una política/protocolo que declara que la organización no comprará ni comercializará producto de fuentes vinculadas a violaciones de derechos humanos o conflictos armados.","Existe un proceso de verificación de origen de proveedores documentado (cómo se confirma que cada finca proveedora es legítima antes de aceptar su producto), aplicado a la mayoría de los proveedores."]}',
        weight: 7,
      },
      {
        name: '2.2.1 Se cumplen los requisitos legales relacionados con el trabajo infantil y el empleo de trabajadores jóvenes.',
        description:
          'La asociación cuenta con politicas claras para prevenir el trabajo infantil y cumplir con las regulaciones locales sobre el trabajo de jovenes deacuerdo al código del trabajo y al código de la niñez y adolecencia.',
        helpText:
          'Verifica:\n\n1. POLÍTICA DE PREVENCIÓN DE TRABAJO INFANTIL, que cite el Código del Trabajo (prohibición de trabajo a menores de 15 años) y el Código de la Niñez y Adolescencia (condiciones especiales para adolescentes de 15-17 años: máximo de horas, tipo de trabajo permitido).\n2. VERIFICACIÓN EN CAMPO: en las visitas a fincas, confirma que no se observen menores de edad realizando labores de cosecha/poscosecha durante horario escolar. Si hay trabajadores jóvenes de 15-17 años, verifica que su contrato indique las condiciones especiales de ley (jornada reducida, prohibición de trabajo nocturno o peligroso).',
        scoringRubric:
          '{"criteria":["Existe una política de prevención de trabajo infantil que cita el Código del Trabajo (prohibición de trabajo a menores de 15 años) y el Código de la Niñez y Adolescencia (condiciones especiales para adolescentes de 15-17 años).","En las visitas a fincas, no se observan menores de edad realizando labores de cosecha/poscosecha durante horario escolar.","Si hay trabajadores jóvenes de 15-17 años, su contrato indica las condiciones especiales de ley (jornada reducida, prohibición de trabajo nocturno o peligroso)."]}',
        weight: 8,
      },
      {
        name: '2.3.1 Se cumplen los requisitos legales relacionados con la esclavitud moderna, incluidos el trabajo forzoso y el trabajo penitenciario.',
        description:
          'La asociación cuenta con una política para garantizar el cumplimiento del Código del Trabajo, ique incluya contratos legales, salarios justos y condiciones dignas, para evitar cualquier forma de trabajo forzoso o explotación laboral.',
        helpText:
          'Verifica, en una muestra de trabajadores:\n\n1. CONTRATO DE TRABAJO LEGALIZADO: registrado en el SUT (Sistema Único de Trabajo) del Ministerio del Trabajo.\n2. ROL DE PAGOS: salario igual o mayor al básico unificado, sin descuentos indebidos ni retención de sueldos como forma de control.\n3. Confirma, en conversación directa y confidencial con 1-2 trabajadores si es posible, que no exista retención de documentos de identidad, deudas impuestas por el empleador, o restricciones a la libre movilidad.',
        scoringRubric:
          '{"criteria":["En una muestra de trabajadores, cada uno tiene un contrato de trabajo legalizado y registrado en el SUT (Sistema Único de Trabajo) del Ministerio del Trabajo.","El rol de pagos muestra salario igual o mayor al básico unificado, sin descuentos indebidos ni retención de sueldos como forma de control.","Al conversar directa y confidencialmente con 1-2 trabajadores (si es posible), no hay indicios de retención de documentos de identidad, deudas impuestas por el empleador, o restricciones a la libre movilidad."]}',
        weight: 7,
      },
      {
        name: '2.4.1 Se respetan los requisitos legales relacionados con la libertad sindical, el derecho de sindicación y el derecho a la negociación colectiva.',
        description:
          'Este indicador aplica según el Código de Trabajo para organizaciones con un  mínimo de 30 trabajadores. \n\nLa organización no prohibe la formación de sindicatos.',
        helpText:
          'Aplica según el Código de Trabajo para organizaciones con 30 o más trabajadores contratados. Si aplica, verifica:\n\n1. Que el REGLAMENTO INTERNO DE TRABAJO no contenga ninguna cláusula que prohíba o desaliente la afiliación sindical.\n2. Pregunta directamente a trabajadores (si es posible) si conocen su derecho a sindicalizarse y si alguna vez se les ha disuadido de hacerlo.',
        scoringRubric:
          '{"criteria":["Si la organización tiene 30 o más trabajadores contratados, el reglamento interno de trabajo no contiene ninguna cláusula que prohíba o desaliente la afiliación sindical.","La organización reconoce explícitamente el derecho a la sindicalización y negociación colectiva en su reglamento interno.","Al consultar directamente a trabajadores (si es posible), confirman conocer su derecho a sindicalizarse y no haber sido disuadidos de hacerlo."]}',
        weight: 7,
      },
      {
        name: '2.4.2 Se cumplen los requisitos legales relacionados con las horas de trabajo, las horas extraordinarias, el tiempo de descanso y el tiempo libre.',
        description:
          'La asociación cuenta con política interna de trabajo, en el cual se detallan; requisitos legales relacionados con las horas de trabajo, las horas extraordinarias, el tiempo de descanso y el tiempo libre.',
        helpText:
          'Verifica la POLÍTICA INTERNA DE HORARIOS DE TRABAJO, que debe detallar:\n\n1. Jornada ordinaria (máximo 8 horas diarias / 40 semanales según Código del Trabajo).\n2. Horas extraordinarias: máximo legal permitido y su pago con recargo (25% diurno, 50% nocturno/feriados según corresponda).\n3. Descansos obligatorios (mínimo 1 día a la semana) y vacaciones anuales (mínimo 15 días).\n\nContrasta esta política contra 2-3 roles de pago reales para confirmar que las horas extra se pagan con el recargo correcto.',
        scoringRubric:
          '{"criteria":["Existe una política interna de horarios de trabajo que detalla la jornada ordinaria (máximo 8 horas diarias / 40 semanales según Código del Trabajo).","La política detalla el máximo legal de horas extraordinarias y su pago con recargo (25% diurno, 50% nocturno/feriados según corresponda).","La política detalla los descansos obligatorios (mínimo 1 día a la semana) y vacaciones anuales (mínimo 15 días).","Al contrastar la política contra 2-3 roles de pago reales, las horas extra se pagan con el recargo correcto."]}',
        weight: 8,
      },
      {
        name: '2.4.3 Se cumplen los requisitos legales relacionados con la contratación y el empleo de trabajadores.',
        description:
          'Porcentaje de trabajadores que cuentan con un contrato legal que cumple con la ley laboral.',
        helpText:
          'Verifica que cada trabajador tenga un CONTRATO DE TRABAJO registrado en el SUT (Sistema Único de Trabajo, sut.trabajo.gob.ec). El contrato debe incluir: datos del empleador y trabajador, tipo de contrato (indefinido, temporada, ocasional), remuneración, y firma de ambas partes. Pide al área administrativa el listado de contratos registrados en el SUT y compáralo contra la nómina real de trabajadores.',
        scoringRubric:
          '{"criteria":["Cada trabajador tiene un contrato de trabajo registrado en el SUT (Sistema Único de Trabajo, sut.trabajo.gob.ec), con datos del empleador y trabajador, tipo de contrato, remuneración y firma de ambas partes.","Al comparar el listado de contratos registrados en el SUT contra la nómina real de trabajadores, el 75% o más de los trabajadores tiene contrato registrado."]}',
        weight: 7,
      },
      {
        name: '2.5.1 Se cumplen los requisitos legales relacionados con la no discriminación.',
        description:
          'La asociación cuenta con una política clara para evitar todo tipo de discriminación.',
        helpText:
          'Verifica:\n\n1. POLÍTICA DE NO DISCRIMINACIÓN, que cubra género, etnia, edad, discapacidad y orientación sexual, en contratación, salarios y ascensos.\n2. Compara salarios de trabajadores en cargos equivalentes (ej. dos cosechadores) para confirmar que no haya diferencias injustificadas por perfil del trabajador.',
        scoringRubric:
          '{"criteria":["Existe una política de no discriminación que cubre género, etnia, edad, discapacidad y orientación sexual, en contratación, salarios y ascensos.","Al comparar salarios de trabajadores en cargos equivalentes (ej. dos cosechadores), no hay diferencias injustificadas por perfil del trabajador."]}',
        weight: 7,
      },
      {
        name: '2.6.1 Se cumplen los requisitos legales relacionados con los salarios de los trabajadores y otros pagos, como el seguro social.',
        description:
          'Porcentaje de trabajadores que cumplen con los requisitos legales relacionados con salarios y beneficios de ley, asegurando que se cumplan todas las disposiciones establecidas en el Código del Trabajo y la Ley de Seguridad Social.',
        helpText:
          'Verifica, en una muestra de trabajadores:\n\n1. ROL DE PAGOS: salario igual o mayor al salario básico unificado (o el sectorial correspondiente si aplica una tabla sectorial), con todos los descuentos de ley correctamente aplicados.\n2. COMPROBANTE DE AFILIACIÓN AL IESS: verificable en el portal del IESS con el número de cédula — debe mostrar aportes al día.',
        scoringRubric:
          '{"criteria":["En una muestra de trabajadores, el rol de pagos muestra salario igual o mayor al salario básico unificado (o el sectorial correspondiente), con todos los descuentos de ley correctamente aplicados.","Cada trabajador de la muestra tiene comprobante de afiliación al IESS verificable en el portal del IESS con su número de cédula, con aportes al día."]}',
        weight: 7,
      },
      {
        name: '2.7.1 Se cumplen los requisitos legales relacionados con la salud y la seguridad en el lugar de trabajo.',
        description:
          'La asociación cuenta con un Reglamento Interno de Higiene y Seguridad.\n\nSi la asociación cuenta con mas de 10 trabajadores este reglamento debe ser legalizado en el Ministerio de Relaciones Laborales.',
        helpText:
          'Verifica:\n\n1. REGLAMENTO INTERNO DE HIGIENE Y SEGURIDAD: documento que describa los riesgos del trabajo (agrícola/postcosecha) y las medidas de prevención.\n2. Si la organización tiene más de 10 trabajadores, este reglamento debe estar legalizado ante el Ministerio de Relaciones Laborales (sello/número de aprobación).\n3. Verificación en campo: uso real de equipo de protección personal (guantes, botas, mascarillas si se usan químicos) durante las visitas.',
        scoringRubric:
          '{"criteria":["Existe un Reglamento Interno de Higiene y Seguridad que describe los riesgos del trabajo agrícola/postcosecha y las medidas de prevención.","Si la organización tiene más de 10 trabajadores, el reglamento está legalizado ante el Ministerio de Relaciones Laborales (sello/número de aprobación).","En verificación de campo, se observa uso real de equipo de protección personal (guantes, botas, mascarillas si se usan químicos)."]}',
        weight: 7,
      },
      {
        name: '2.8.1 Se cumplen los requisitos legales en relación con el alojamiento proporcionado por el empleador para los trabajadores.',
        description:
          'Este indicador aplica en organizaciones que proporcionan alojamiento en sus instalaciones.\n\nLas instalaciones de vivienda debe contar con las normas de seguridad, higiene y habilitabilidad, establecidad en la legislación laboral y sanitaria.',
        helpText:
          'Aplica solo si la organización proporciona vivienda a trabajadores (frecuente con jornaleros temporales en época de cosecha). Si aplica, verifica en sitio:\n\n1. Condiciones de seguridad e higiene (ventilación, servicios sanitarios, agua potable).\n2. Espacio mínimo por persona conforme a normativa sanitaria.\n3. Ausencia de riesgos evidentes (instalaciones eléctricas expuestas, hacinamiento).',
        scoringRubric:
          '{"criteria":["Si la organización proporciona vivienda a trabajadores, las instalaciones verificadas en sitio cuentan con condiciones de seguridad e higiene (ventilación, servicios sanitarios, agua potable).","El espacio por persona es conforme a la normativa sanitaria, sin hacinamiento ni riesgos evidentes (instalaciones eléctricas expuestas, etc.)."]}',
        weight: 7,
      },
      {
        name: '2.9.1 Se cumplen los requisitos legales relacionados con la igualdad de género en el lugar de trabajo.',
        description:
          'La asociación cuenta con una pólitica sobre igualdad de género en el lugar de trabajo.',
        helpText:
          'Verifica:\n\n1. POLÍTICA DE IGUALDAD DE GÉNERO en contratación, salarios y ascensos.\n2. Compara salarios de hombres y mujeres en cargos equivalentes usando los roles de pago, para confirmar que no existan brechas injustificadas.',
        scoringRubric:
          '{"criteria":["Existe una política de igualdad de género en contratación, salarios y ascensos.","Al comparar salarios de hombres y mujeres en cargos equivalentes usando los roles de pago, no existen brechas injustificadas."]}',
        weight: 7,
      },
      {
        name: '2.10.1 Se identifican los Pueblos Indígenas potencialmente afectados por las actividades de la organización.',
        description:
          'Este indicador aplica únicamente en organizaciones que se encuentran en áreas con la presencia de Pueblos Indígenas.  \n\nSi la organización tiene actividades productivas en territorios o comunidades  indigenas cuenta con un análisis de afectación o ha realizado una consulta previa, libre e informada de las operaciones productivas.',
        helpText:
          'Aplica únicamente si hay actividad productiva en territorios o comunidades indígenas. Si aplica, verifica:\n\n1. ANÁLISIS DE AFECTACIÓN: documento que identifique qué comunidades/territorios podrían verse afectados por las actividades de la organización.\n2. O, alternativamente, el PROCESO DE CONSULTA PREVIA, LIBRE E INFORMADA (CLPI) ya documentado (ver Principio 1).',
        scoringRubric:
          '{"criteria":["Si hay actividad productiva en territorios o comunidades indígenas, existe un documento de análisis de afectación que identifica qué comunidades/territorios podrían verse afectados por las actividades de la organización.","Alternativamente, existe un proceso de Consulta Previa, Libre e Informada (CLPI) documentado y completo (ver Principio 1)."]}',
        weight: 7,
      },
      {
        name: '2.11.1 Se identifican y respetan los derechos consuetudinarios y comunitarios legalmente reconocidos.\n\nNota: Derechos Consuetudinarios son las costumbres, hábitos y tradiciones repetidos a lo largo del tiempo.',
        description:
          'Este indicador aplica si la organización se encuentra en áreas con la presencia de Pueblos y Nacionalidades (Indigenas, Afro, Montubios), con claras expresiones culturales en el territorio. \nLa organización cuenta con una política sobre el respeto a los derechos consuetudinarios y comunitarios en el territorio.',
        helpText:
          'Aplica si hay presencia de Pueblos y Nacionalidades (Indígenas, Afro, Montubios) con expresiones culturales claras en el territorio. Si aplica, verifica la POLÍTICA DE RESPETO A DERECHOS CONSUETUDINARIOS, que reconozca formas propias de organización, uso tradicional de tierras y prácticas culturales de esas comunidades.',
        scoringRubric:
          '{"criteria":["Si hay presencia de Pueblos y Nacionalidades (Indígenas, Afro, Montubios) con expresiones culturales claras en el territorio, existe una política de respeto a derechos consuetudinarios que reconoce formas propias de organización, uso tradicional de tierras y prácticas culturales de esas comunidades.","La política ha sido socializada con las comunidades correspondientes."]}',
        weight: 7,
      },
    ],
  },
  {
    number: 3,
    name: 'Protección de la Naturaleza y el Medio Ambiente',
    indicators: [
      {
        name: '3.1.1 Los bosques no se convierten en agricultura después del 31 de diciembre de 2020.',
        description:
          'Porcentaje de parcelas con geolocalización verificada que no muestran conversión de bosques a cultivos después del 31 de diciembre de 2020, usando imágenes satelitales y registros históricos de uso del suelo.',
        helpText:
          "Verifica, por parcela, un REPORTE DE ANÁLISIS SATELITAL DE DEFORESTACIÓN:\n\n1. Fuente: Whisp (Forest Data Partnership — herramienta gratuita diseñada específicamente para Assessment, whisp.openforis.org) o Global Forest Watch.\n2. El reporte debe comparar la cobertura de la parcela antes del 31/12/2020 contra el estado actual.\n3. Resultado esperado: 'sin conversión de bosque a cultivo' — si el reporte muestra pérdida de cobertura boscosa después de esa fecha, la parcela está en riesgo alto y no debería estar en la cadena de suministro.\n\nPide que te muestren cómo generan estos reportes (usualmente cargando las coordenadas/polígono de la parcela en la herramienta) y con qué frecuencia los actualizan.",
        scoringRubric:
          '{"criteria":["Existe, por parcela, un reporte de análisis satelital de deforestación (fuente Whisp o Global Forest Watch) que compara la cobertura antes del 31/12/2020 contra el estado actual.","El reporte cubre la mayoría o la totalidad de las parcelas, no solo una muestra pequeña.","El resultado en todas las parcelas verificadas es sin conversión de bosque a cultivo; ninguna muestra pérdida de cobertura boscosa después del 31/12/2020."]}',
        weight: 10,
      },
      {
        name: '3.1.2 Después del 31 de diciembre de 2020, el bosque primario no se degrada ni se convierte en plantaciones, otros tipos de bosque plantados u otras tierras boscosas.',
        description:
          'Porcentaje de áreas de bosque primario con geolocalización verificada que no presentan deforestación después del 31 de diciembre de 2020, utilizando imágenes satelitales y comparaciones de cobertura forestal.',
        helpText:
          'Similar al KPI anterior pero enfocado específicamente en ÁREAS DE BOSQUE PRIMARIO (no en la parcela productiva completa). Verifica el mismo tipo de reporte satelital (Whisp/Global Forest Watch) pero centrado en las áreas de bosque primario identificadas dentro o colindantes a las fincas — confirma que no muestren degradación (pérdida parcial de cobertura) ni conversión a plantación después del 31/12/2020.',
        scoringRubric:
          '{"criteria":["Existe un reporte satelital (Whisp/Global Forest Watch) centrado específicamente en las áreas de bosque primario identificadas dentro o colindantes a las fincas, no solo en la parcela productiva completa.","El reporte cubre la mayoría o la totalidad de las áreas de bosque primario identificadas.","El resultado no muestra degradación (pérdida parcial de cobertura) ni conversión a plantación después del 31/12/2020 en ninguna de esas áreas."]}',
        weight: 10,
      },
      {
        name: '3.1.3 Los bosques que se regeneran naturalmente no se degradan ni se convierten en plantaciones forestales u otras tierras boscosas después del 31 de diciembre de 2020.',
        description:
          'Verificar la ausencia de conversión de bosques regenerados después del 31 de diciembre de 2020 mediante la recopilación de información técnica válida y suficiente sobre el estado de las fincas de los productores asociados.',
        helpText:
          'Verifica INFORMACIÓN TÉCNICA (no necesariamente satelital, puede ser de campo) sobre áreas de regeneración natural de bosque dentro de las fincas:\n\n1. Ficha de visita técnica que identifique estas áreas y su estado.\n2. Si es posible, comparación de imágenes satelitales de dos fechas para confirmar que el área en regeneración no fue convertida o degradada después del 31/12/2020.',
        scoringRubric:
          '{"criteria":["Existe una ficha de visita técnica que identifica las áreas de regeneración natural de bosque dentro de las fincas y su estado.","Existe, cuando es posible, una comparación de imágenes satelitales de dos fechas que confirma que el área en regeneración no fue convertida ni degradada después del 31/12/2020.","La información cubre la mayoría de las áreas de regeneración identificadas, no solo una declaración del productor sin verificación."]}',
        weight: 9,
      },
      {
        name: '3.2.1 Se cumplen los requisitos legales relativos a las actividades de manejo y aprovechamiento en los bosques.',
        description:
          'Aplica si los miembros de la organización realizan aprovechamiento forestal.\n\nPorcentaje de actividades forestales con permisos y registros legales vigentes, verificando planes de manejo aprobados, cumplimiento ambiental y autorizaciones de aprovechamiento según la normativa ecuatoriana.',
        helpText:
          'Aplica si hay aprovechamiento forestal. Si aplica, verifica los mismos 3 documentos que en la Herramienta de Capacidades:\n\n1. REGISTRO FORESTAL (Sistema de Administración Forestal - SAF del MAATE).\n2. LICENCIA DE APROVECHAMIENTO FORESTAL vigente.\n3. PLAN DE MANEJO FORESTAL aprobado por el MAATE.\n\nRevisa también evidencia de cumplimiento ambiental asociado (ej. no tala fuera del área/volumen autorizado).',
        scoringRubric:
          '{"criteria":["Si hay aprovechamiento forestal, existe un Registro Forestal activo en el Sistema de Administración Forestal (SAF) del MAATE.","Existe una Licencia de Aprovechamiento Forestal vigente.","Existe un Plan de Manejo Forestal aprobado por el MAATE.","Existe evidencia de cumplimiento ambiental asociado (ej. no tala fuera del área/volumen autorizado)."]}',
        weight: 9,
      },
      {
        name: '3.3.1 Se cumplen los requisitos legales relativos a la cosecha, recolección, captura y comercio de especies CITES.',
        description:
          'La organización cuenta con una política que prohibe la tenencia de especies de vida silvestre dentro de las unidades productivas.',
        helpText:
          'Verifica el DOCUMENTO DE POLÍTICA que prohíba explícitamente la tenencia, caza o comercio de especies de vida silvestre protegidas (CITES) dentro de las fincas de los socios. En visitas de campo, confirma que no haya evidencia de tenencia de fauna silvestre (jaulas, trofeos, mascotas silvestres) en las fincas visitadas.',
        scoringRubric:
          '{"criteria":["Existe un documento de política que prohíbe explícitamente la tenencia, caza o comercio de especies de vida silvestre protegidas (CITES) dentro de las fincas de los socios.","En visitas de campo, no se encuentra evidencia de tenencia de fauna silvestre (jaulas, trofeos, mascotas silvestres) en las fincas visitadas."]}',
        weight: 9,
      },
      {
        name: '3.4.1 Se cumplen los requisitos legales para el uso y almacenamiento de productos químicos.',
        description:
          'Este indicador aplica unicamente en organizaciones que almacenen productos químicos (fertilizantes, fungicidas, herbicidas, y otros).\n\nLa organización cuenta con un manual de uso y almacenamiento de productos químicos y una infraestructura destinada unicamente para este propósito.',
        helpText:
          'Aplica solo si se almacenan agroquímicos (fertilizantes, fungicidas, herbicidas). Si aplica, verifica en sitio:\n\n1. MANUAL DE USO Y ALMACENAMIENTO: documento con instrucciones de manejo seguro.\n2. BODEGA DEDICADA: espacio exclusivo para químicos, separado de alimentos/producto, con ventilación, señalización de seguridad (símbolos de peligro) y acceso restringido (candado o similar).',
        scoringRubric:
          '{"criteria":["Si se almacenan agroquímicos, existe un manual de uso y almacenamiento con instrucciones de manejo seguro.","Existe una bodega dedicada, exclusiva para químicos, separada de alimentos/producto, verificada en sitio.","La bodega tiene ventilación, señalización de seguridad (símbolos de peligro) y acceso restringido (candado o similar)."]}',
        weight: 8,
      },
      {
        name: '3.5.1 Se cumplen los requisitos legales relacionados con la gestión de residuos.',
        description:
          'La asociación cuenta con un manual de manejo de gestión de residuos en sus instalaciones, y una política de gestión adecuada de residuos en las fincas de los socios.',
        helpText:
          'Verifica:\n\n1. MANUAL DE GESTIÓN DE RESIDUOS DEL CENTRO DE ACOPIO: cómo se manejan cáscaras de cacao, aguas mieles de fermentación (que no deben verterse directamente a fuentes de agua) y empaques.\n2. POLÍTICA DE MANEJO DE RESIDUOS EN FINCA: para envases de agroquímicos (triple lavado, entrega a gestores autorizados) y residuos orgánicos.',
        scoringRubric:
          '{"criteria":["Existe un manual de gestión de residuos del centro de acopio que describe cómo se manejan cáscaras de cacao, aguas mieles de fermentación (que no deben verterse directamente a fuentes de agua) y empaques.","Existe una política de manejo de residuos en finca para envases de agroquímicos (triple lavado, entrega a gestores autorizados) y residuos orgánicos, socializada con los socios."]}',
        weight: 9,
      },
      {
        name: '3.6.1 Se cumplen los requisitos legales para el uso y la protección de las aguas superficiales y subterráneas.',
        description:
          'Este indicador aplica unicamente en organizaciones que se abastecen de aguas superficiales o subterraneas para sus operaciones. \n\nLa asociación cuenta con una política que detalle los requisitos legales para el uso y la protección de las aguas superficiales y subterráneas.',
        helpText:
          'Aplica solo si la organización se abastece de agua superficial (río, quebrada) o subterránea (pozo) para sus operaciones. Si aplica, verifica:\n\n1. POLÍTICA DE USO Y PROTECCIÓN DE AGUA.\n2. Si el volumen usado lo requiere, el PERMISO DE APROVECHAMIENTO DE AGUA de la Secretaría del Agua (SENAGUA) — trámite que autoriza formalmente la captación de agua para uso agroindustrial.',
        scoringRubric:
          '{"criteria":["Si la organización se abastece de agua superficial o subterránea, existe una política de uso y protección de agua.","Si el volumen usado lo requiere, existe el Permiso de Aprovechamiento de Agua de la Secretaría del Agua (SENAGUA), vigente."]}',
        weight: 9,
      },
      {
        name: '3.7.1 Se cumplen los requisitos legales relacionados con la gestión del suelo.',
        description:
          'La asociación cuenta con una política que cumpla con los requisitos legales relacionados con la gestión del suelo.',
        helpText:
          'Verifica la POLÍTICA DE GESTIÓN DEL SUELO aplicada en las fincas: rotación de cultivos donde aplique, mantenimiento de cobertura vegetal, uso racional de agroquímicos, prácticas de prevención de erosión (curvas de nivel, barreras vivas en pendientes). Confírmalo con visitas de campo, no solo con el documento.',
        scoringRubric:
          '{"criteria":["Existe una política de gestión del suelo que cubre rotación de cultivos donde aplique, mantenimiento de cobertura vegetal, uso racional de agroquímicos y prácticas de prevención de erosión (curvas de nivel, barreras vivas en pendientes).","La política es verificable en la práctica en visitas de campo a la mayoría de fincas, no solo existe en el documento."]}',
        weight: 9,
      },
      {
        name: '3.8.1 Se cuenta con una política interna para combatir la deforestación, degradación forestal e ilegalidad en su cadena de suministro.',
        description:
          'Este indicador aplica unicamente si los miembros de la organización se encuentran en áreas con recursos forestales cercanos.\n\nLa asociación cuenta con una política para combatir la deforestación, degradación forestal e ilegalidad en su cadena de suministro.',
        helpText:
          'Aplica si hay socios cerca de recursos forestales. Si aplica, verifica que exista una POLÍTICA ESPECÍFICA (distinta de la política ambiental general) que combata explícitamente deforestación, degradación forestal e ilegalidad en la cadena de suministro, con medidas concretas (ej. exclusión de proveedores con deforestación confirmada).',
        scoringRubric:
          '{"criteria":["Si hay socios cerca de recursos forestales, existe una política específica (distinta de la política ambiental general) que combate explícitamente deforestación, degradación forestal e ilegalidad en la cadena de suministro.","La política incluye medidas concretas (ej. exclusión de proveedores con deforestación confirmada) y está aprobada y socializada."]}',
        weight: 9,
      },
      {
        name: '3.8.2 Se cuenta con un responsable del cumplimiento de la normativa aplicable, a nivel de la dirección de la organización.',
        description:
          'La asociación cuenta con el nombramiento de un responsable encargado del cumplimiento de la normativa aplicable y documento con la descripción de funciones.',
        helpText:
          'Verifica el ACTA DE NOMBRAMIENTO y el DOCUMENTO DE DESCRIPCIÓN DE FUNCIONES del responsable de cumplimiento normativo — mismo estándar que el KPI equivalente de la Herramienta de Capacidades (Área 1). Si la organización ya fue evaluada con Capacity, puede ser la misma persona/documento; confírmalo.',
        scoringRubric:
          '{"criteria":["Existe un acta de nombramiento del responsable de cumplimiento normativo, con fecha y firma de quien preside.","Existe un documento de descripción de funciones específico para Assessment (gestión de la DDS en TRACES, coordinación de geolocalización, seguimiento de KPI), no genérico.","Si la organización ya fue evaluada con la Herramienta de Capacidades, se confirma si es la misma persona/documento."]}',
        weight: 9,
      },
    ],
  },
  {
    number: 4,
    name: 'Mitigación de Impactos Climáticos y Trazabilidad',
    indicators: [
      {
        name: '4.1.1 Se cumple el marco legal respecto a la implementación de las mejores prácticas para minimizar las principales emisiones de gases de efecto invernadero se implementan de acuerdo con los riesgos y de manera proporcional a la escala  y naturaleza de la operación (No aplica para cadenas de cacao evaluadas).',
        description:
          'No existe un reglamento específico en Ecuador que exija la implementación de mejores prácticas para minimizar emisiones de GEI en la cadena de cacao, por lo que este indicador no es aplicable.',
        helpText:
          'Este indicador no aplica actualmente en Ecuador para la cadena de cacao (no existe reglamento específico que lo exija) — se mantiene como referencia informativa. Márcalo como no aplicable en el perfil de la organización en vez de asignarle un puntaje.',
        scoringRubric:
          'No aplica actualmente en Ecuador para la cadena de cacao — no existe reglamento específico que lo exija. Se recomienda marcar este KPI como no aplicable en el perfil de la organización en vez de asignarle un puntaje bajo.',
        weight: 20,
      },
      {
        name: '4.2.1 Se implementa un sistema de trazabilidad que garantiza la custodia y no mezcla o contaminación de los productos conformes en origen, desde la cosecha hasta el punto de exportación.',
        description:
          'La organización cuenta con un sistema de trazabilidad garantiza la custodia y no mezcla o contaminación de los productos conformes en origen, desde la cosecha hasta su comercialización.',
        helpText:
          'Verifica el SISTEMA DE TRAZABILIDAD (manual o digital) que registre el recorrido del producto en cada etapa:\n\n1. RECEPCIÓN: cada entrega de un socio se identifica con su código antes de mezclarse.\n2. FERMENTACIÓN/SECADO: si se combinan entregas en un mismo lote de proceso, debe quedar registrado cuáles entregas lo componen.\n3. ALMACENAMIENTO: identificación del lote en bodega.\n4. DESPACHO: el lote final vendido debe poder rastrearse hacia las entregas/fincas de origen.\n\nPide una demostración práctica: elige un lote vendido recientemente y pide que muestren el rastreo completo hacia atrás hasta las fincas de origen.',
        scoringRubric:
          '{"criteria":["Cada entrega de un socio se identifica con su código en el registro de recepción antes de mezclarse.","Si se combinan entregas en un mismo lote de proceso de fermentación/secado, queda registrado cuáles entregas lo componen.","El lote tiene identificación en almacenamiento (bodega) y el lote final vendido puede rastrearse, en el registro de despacho, hacia las entregas/fincas de origen.","Al elegir un lote vendido recientemente, la organización puede demostrar el rastreo completo hacia atrás hasta las fincas de origen."]}',
        weight: 20,
      },
      {
        name: '4.2.2 Base de datos con la identificación del Ecuador; registros de información geográfica detallada y actualizada de todas las parcelas de terreno de los productores, en las que se produjeron las materias primas y productos derivados relevantes, así como fecha o intervalo temporal de producción.',
        description:
          'Porcentaje de parcelas con geolocalización y registros actualizados en una base de datos, verificando la precisión de coordenadas, fecha de producción y trazabilidad de materias primas en la asociación.',
        helpText:
          'Verifica la BASE DE DATOS CENTRAL DE PARCELAS, que debe tener por cada una: coordenadas GPS o polígono, fecha de producción, y código/nombre de identificación del productor. Esta es la misma base de datos que alimenta la Declaración de Diligencia Debida (DDS) en TRACES. Confirma que esté centralizada (no dispersa en archivos sueltos) y actualizada.',
        scoringRubric:
          '{"criteria":["Existe una base de datos central de parcelas que incluye, por cada una, coordenadas GPS o polígono, fecha de producción, y código/nombre de identificación del productor.","La base de datos está centralizada (no dispersa en archivos sueltos) y es la misma que alimenta la Declaración de Diligencia Debida (DDS) en TRACES.","Los registros están actualizados y cubren la mayoría o la totalidad de las parcelas, no solo una muestra."]}',
        weight: 20,
      },
      {
        name: '4.2.3 Se cuenta con la ubicación geográfica de todas las parcelas en las que se produjeron las materias primas y productos derivados relevantes, en formatos transferibles, y con porcentaje de cobertura vegetal de las fincas que mantienen áreas con bosque natural.',
        description:
          'Porcentaje de parcelas con ubicación geográfica registrada en formatos transferibles, verificando la cobertura vegetal y áreas de bosque natural conservadas a través de imágenes satelitales y sistemas de información geográfica (SIG).',
        helpText:
          'Verifica que la geolocalización esté en FORMATO EXPORTABLE (GeoJSON, KML o Shapefile) — no en una imagen o mapa impreso. Pide que te muestren el archivo real (no una captura de pantalla). Además, verifica el % de cobertura de bosque natural documentado por finca, obtenido mediante imágenes satelitales o un sistema de información geográfica (SIG) como QGIS.',
        scoringRubric:
          '{"criteria":["La geolocalización de cada parcela está en formato exportable (GeoJSON, KML o Shapefile) — un archivo real, no una imagen o mapa impreso.","El porcentaje de cobertura de bosque natural está documentado por finca, obtenido mediante imágenes satelitales o un sistema de información geográfica (SIG) como QGIS.","Ambos requisitos se cumplen para la mayoría o la totalidad de las parcelas."]}',
        weight: 20,
      },
      {
        name: '4.2.4 Se cuenta con un sistema interno de control operativo, articulado a una certificación o verificación por terceros.',
        description:
          'La asociación cuenta con un Sistema interno de control operativo implementado, articulado a una certificación o verificación por terceros.',
        helpText:
          'Verifica el MANUAL DEL SISTEMA INTERNO DE CONTROL (SIC):\n\n1. Estructura de inspectores internos (quiénes son, cuántas fincas cubre cada uno).\n2. Formularios de inspección por finca, con registros de visitas recientes.\n3. Mecanismo de sanción/exclusión ante incumplimientos graves.\n4. Articulación con una certificación externa (orgánica, comercio justo) o auditoría por terceros — pide ver el certificado o informe de auditoría vinculado al SIC.',
        scoringRubric:
          '{"criteria":["Existe un manual del Sistema Interno de Control (SIC) que describe la estructura de inspectores internos (quiénes son, cuántas fincas cubre cada uno).","Existen formularios de inspección por finca, con registros de visitas recientes.","Existe un mecanismo de sanción/exclusión ante incumplimientos graves.","El SIC está articulado a una certificación externa (orgánica, comercio justo) o auditoría por terceros, verificable con el certificado o informe de auditoría vinculado."]}',
        weight: 20,
      },
    ],
  },
];

// RF-02: el país de la organización evaluada determina los parámetros de riesgo.
// EC como entrada inicial (única jurisdicción del piloto de la tesis).
const COUNTRY_RISK_PARAMS: Record<string, AssessmentCountryRiskParams> = {
  EC: { riskThreshold: 5 },
};

function buildPrincipleIndicators(
  principleNumber: number,
  items: IndicatorSeed[],
): AssessmentSeedIndicator[] {
  return items.map((item, i) => ({
    code: `${CODE_PREFIX}-${principleNumber}.${i + 1}`,
    name: item.name,
    description: item.description,
    helpText: item.helpText,
    scoringRubric: item.scoringRubric,
    weight: item.weight,
  }));
}

export const RISK_TOOL_TEMPLATE: AssessmentSeedTemplate = {
  tool: 'RISK',
  name: 'Identificación y Gestión de Riesgos',
  description:
    'Herramienta de Riesgos: identificación y gestión de riesgos con clasificación de riesgo y plan de mitigación (46 KPI reales, 4 principios).',
  riskThreshold: 5,
  countryRiskParams: COUNTRY_RISK_PARAMS,
  sections: PRINCIPLES_SEED.map((p) => ({
    number: p.number,
    name: p.name,
    weight: 1,
    indicators: buildPrincipleIndicators(p.number, p.indicators),
  })),
};

export const RISK_TOOL_KPI_COUNT = PRINCIPLES_SEED.reduce(
  (sum, p) => sum + p.indicators.length,
  0,
);
