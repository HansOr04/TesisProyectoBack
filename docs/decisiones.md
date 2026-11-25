# Decisiones

Por qué está así. El detalle de cada archivo está en
[referencia](referencia/index.md).

| Decisión | Por qué |
|---|---|
| Un motor común para las tres herramientas | El flujo es el mismo; triplicarlo multiplicaba los errores |
| Plantillas con versiones | Cambiar una dimensión alteraba evaluaciones en curso |
| Aplicabilidad por código y no por id | Cada versión crea ids nuevos: en producción se editaba la v2 y la evaluación usaba la v1 |
| Los KPI se desactivan, no se borran | Borrados, desaparecían y no había cómo recuperarlos |
| Puntajes guardados al completar | Un resultado entregado no puede cambiar después |
| Dos tablas de medidas | En Riesgos la medida cuelga del riesgo; en las otras, del KPI |
| Roles en las tablas de autorización | Una tabla propia duplicaba la existente |
| Alcance aparte del permiso | El permiso dice qué; el alcance, sobre qué datos. Responde 404 para no revelar que existe |
| Permisos leídos de la base | El token dura horas: quitar un acceso tardaba hasta 24 h |
| Superadministrador solo en sus proyectos | Los proyectos son de clientes distintos |
| La cuenta es de la persona | Un administrador podía tomar la cuenta de alguien de otro proyecto |
| Sesión por el dominio de la web | Los navegadores que bloquean cookies de terceros cerraban la sesión |
| 30 s de margen al renovar | Dos pestañas a la vez se tomaban por robo |
| Límite por usuario, no por IP | En un taller todos comparten IP: 11 de 20 no podían entrar |
| `trust proxy` en 1 | Sin él, todos compartían la IP del enrutador de Heroku |
| Si la sesión vence no se sale de la pantalla | Se perdía lo que no se había guardado |
| Cola sin conexión | El internet del taller se corta; solo se encola un error de red, no un rechazo |
| Guardado automático por sección | Se pidió en el piloto |
| Aviso en vivo que recarga | Más simple que fusionar cambios; no pisa lo que se está escribiendo |
| Doble confirmación al completar | Es irreversible |
| Dos modelos de IA | El que razona tarda 20 s; el rápido, de 1 a 3 |
| Caché de IA por contenido | Exportar dos veces costaba el doble |
| 8 s de IA en el reporte | Debe salir en menos de 10 |
| Validación contra invención | Los modelos citan KPI que no existen |
| La IA no bloquea | Si falla, se completa y se exporta igual |
| Formas nativas en PowerPoint | Los gráficos de Office no se ven igual en Keynote y Google Slides |
| Cupo de exportes | Se generan en memoria; una ráfaga tumbaba el servidor |
| Analítica sin IA | Los resultados deben poder repetirse y citarse |
| Caída al arrancar si falta configuración | Mejor que fallar en la primera petición |
| Auditoría que no interrumpe | No debe deshacer una operación hecha |
| `require` de pptxgenjs | Su módulo no tiene exportación por defecto y falla en las pruebas |
| Organizaciones borradas que reviven | El índice único no distingue las borradas |
| Fechas de medidas a medianoche UTC | Con zona horaria, en Ecuador salía un día menos |
| Imagen Docker `node:slim` y no Alpine | Prisma 5 necesita OpenSSL y glibc |
| La imagen lleva `src` y `tsconfig` | El seed corre con ts-node e importa las plantillas |
| El contenedor corre como `node` | Nunca como administrador |
| Sin comentarios en el código | La documentación vive en un solo lugar y el pipeline lo vigila |
