# Lista de verificación posterior al despliegue (HU-73)

Se llena en cada versión final. Los puntos con (A) los comprueba el workflow
«Despliegue»; los demás, una persona con una **cuenta de prueba** en un proyecto
de prueba.

Versión: ______  Fecha: ______  Responsable: ______

| # | Punto | Resultado |
|---|---|---|
| 1 | El pipeline de `main` está en verde en los dos repositorios | |
| 2 | Hay un respaldo `Completed` sacado justo antes | |
| 3 | `heroku releases` muestra la versión nueva y `heroku releases:output`, las migraciones sin errores | |
| 4 | (A) `/health` responde `ok` | |
| 5 | (A) Sin sesión, la API responde 401; un inicio de sesión inválido, 401 | |
| 6 | (A) La web carga con sus recursos, sus rutas y sus cabeceras de seguridad | |
| 7 | (A) `/auth` llega a la API por el dominio de la web | |
| 8 | Se inicia sesión y, al recargar, la sesión sigue | |
| 9 | Con dos pestañas abiertas, recargar las dos no cierra la sesión | |
| 10 | Se registra una organización de prueba | |
| 11 | Se califica un KPI y aparece «Guardado»; al recargar, sigue ahí | |
| 12 | El resumen y el plan de una evaluación completada cargan | |
| 13 | Se exportan el PowerPoint y el Excel y abren bien | |
| 14 | Un evaluador solo ve lo asignado y un visualizador no puede modificar | |
| 15 | Los conteos de organizaciones, evaluaciones y respuestas no bajaron respecto al respaldo | |
| 16 | `heroku logs` no muestra errores en los 10 minutos siguientes | |

Si un punto falla, se vuelve atrás (manual técnico, sección 3) o se corrige antes
de dar la versión por publicada.
