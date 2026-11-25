# Monitoreo, registros y alertas (HU-72)

## Dónde se consultan los registros (CA-72.1)

Todo sale por la salida estándar y Heroku lo junta en un solo flujo: la
aplicación, el enrutador, los despliegues, las migraciones y PostgreSQL.

```bash
heroku logs -a evaluartesis --tail              # en vivo
heroku logs -a evaluartesis -n 1500             # lo último
heroku logs -a evaluartesis -n 1500 | grep '"level":"error"'
heroku logs -a evaluartesis -n 1500 | grep '<requestId>'
```

También en el panel de Heroku › `evaluartesis` › More › View logs.

Cada línea de la aplicación es un JSON. Hay una por petición (`request`, con
método, ruta, estado, milisegundos, usuario y `requestId`) y una por error, con
su traza. No se registran parámetros, cuerpos, cabeceras ni contraseñas. El
`requestId` es el mismo que la API devuelve en el error y en la cabecera
`X-Request-Id`: con él se llega de lo que reporta una persona a su línea exacta.

Heroku conserva las últimas 1500 líneas (hasta una semana). La auditoría de
cambios va aparte, en la base, durante 24 meses. Para guardar más historia se
agrega un drenaje a un servicio externo: `heroku drains:add <url> -a evaluartesis`.

## Alertas (CA-72.2)

`.github/workflows/vigilancia.yml` corre cada 15 minutos y comprueba:

| Qué | Cuándo avisa |
|---|---|
| API | `/health` no responde 200 tras 3 intentos |
| Base de datos | `/health` responde 503 |
| Errores del servidor | Hubo algún error 500 en la última hora |
| Web | No carga o no es la aplicación |

Si algo falla abre un *issue* con la etiqueta `alerta`, asignado a la cuenta
dueña del repositorio. GitHub avisa por correo a quien lo tiene asignado y a
quienes siguen el repositorio; para recibirlo, cada integrante activa
**Watch › Custom › Issues** en GitHub. Cuando todo vuelve a estar bien, el
*issue* se cierra solo.

Probar la alerta sin una falla: Actions › Vigilancia › Run workflow ›
«Abrir una alerta de prueba». La siguiente corrida la cierra.

Límites: GitHub puede retrasar las corridas unos minutos y desactiva las
programadas tras 60 días sin actividad en el repositorio (avisa por correo).

## Qué hacer ante una alerta

1. **La API no responde.** `heroku ps -a evaluartesis`. Si está caída, revisar
   `heroku logs -n 500` y `heroku releases`. Reiniciar: `heroku ps:restart`. Si
   empezó con un despliegue: `heroku rollback` (no deshace migraciones).
2. **La base no responde.** `heroku pg:info -a evaluartesis` y
   [status.heroku.com](https://status.heroku.com). Restaurar un respaldo es el
   último recurso: `docs/respaldos.md`.
3. **Errores 500.** Buscar `"level":"error"` en los registros, con la hora de la
   alerta, y seguir el `requestId`.
4. **La web no carga.** Panel de Vercel › Deployments; desde ahí se vuelve a
   una versión anterior con «Instant Rollback».
