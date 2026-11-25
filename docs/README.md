# Documentación de Evalúa

El código no lleva comentarios: todo lo que hay que saber está aquí.

| Si quieres… | Lee |
|---|---|
| Una vista general, instalar, desplegar o restaurar | [manual-tecnico.md](manual-tecnico.md) |
| Entender cómo está construido | [arquitectura.md](arquitectura.md) |
| Conocer las tablas y sus relaciones | [base-de-datos.md](base-de-datos.md) |
| Consultar las 126 rutas de la API y sus permisos | [api.md](api.md) |
| Saber cómo se calcula y qué se permite | [reglas-de-negocio.md](reglas-de-negocio.md) |
| Entender la IA y los reportes | [ia-y-reportes.md](ia-y-reportes.md) |
| **Ampliar el sistema** | [como-expandir.md](como-expandir.md) |
| Saber por qué algo está hecho así | [decisiones.md](decisiones.md) |
| Buscar un archivo, clase o método | [referencia-codigo.md](referencia-codigo.md) |
| Entender las pruebas y el pipeline | [pruebas-y-pipeline.md](pruebas-y-pipeline.md) |
| Operar la plataforma | [monitoreo.md](monitoreo.md), [respaldos.md](respaldos.md), [entornos-y-secretos.md](entornos-y-secretos.md), [lista-verificacion.md](lista-verificacion.md) |
| Ver seguridad y rendimiento | [seguridad.md](seguridad.md), [rendimiento.md](rendimiento.md) |
| Ponerla en marcha con la fundación | [puesta-en-marcha.md](puesta-en-marcha.md) |

La web tiene su propia documentación: [TesisFrontend/docs](https://github.com/HansOr04/TesisFrontend/tree/main/docs),
con su arquitectura, su referencia, cómo expandirla y el manual de usuario.

## Mantenerla al día

`npm run comentarios` falla si alguien agrega un comentario al código, y el
pipeline lo ejecuta. Lo que antes iría en un comentario va en el documento que
corresponda: una regla en *reglas-de-negocio*, un porqué en *decisiones*, una ruta
nueva en *api*, una tabla en *base-de-datos*.

Quedan fuera las instrucciones que leen las herramientas (`eslint-disable`, `@ts-nocheck`), las
migraciones publicadas, que no se pueden editar, y `.env.example`, que documenta cada
variable.
