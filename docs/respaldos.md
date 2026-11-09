# Respaldos de la base de datos

Respaldos diarios de la base de la demo (HU-66) y prueba de que se pueden
restaurar (HU-67). Los respaldos los hace Heroku Postgres: no salen del
proveedor, quedan cifrados y no hay que guardar ninguna clave adicional.

Todos los comandos necesitan la CLI de Heroku con sesión iniciada
(`heroku login`) y acceso a la aplicación `evaluartesis`.

## Programar el respaldo diario (HU-66)

```bash
heroku pg:backups:schedule DATABASE_URL --at '03:00 America/Guayaquil' -a evaluartesis
```

Se elige las 03:00 porque nadie usa la plataforma a esa hora y coincide con la
purga diaria de la auditoría.

Comprobar que quedó programado y sacar el primer respaldo sin esperar a la noche:

```bash
heroku pg:backups:schedules -a evaluartesis
heroku pg:backups:capture -a evaluartesis
heroku pg:backups -a evaluartesis
```

`pg:backups` lista los respaldos con su fecha, tamaño y estado (`Completed`).

**Cuántos días se guardan.** Heroku conserva los respaldos programados según el
plan de la base (`heroku pg:info -a evaluartesis` muestra el plan). La demo usa
el plan *Essential*, que guarda un respaldo diario por cada uno de los últimos
7 días, uno semanal y hasta 5 manuales (al pasar de 5, el más antiguo se borra).
CA-66.2 pide al menos los últimos 7 días: se confirma con `pg:backups` una
semana después de programarlo. Heroku **no avisa** si un respaldo programado
falla, así que conviene revisar `pg:backups` de vez en cuando. Si se cambia de
plan, hay que volver a revisar `pg:backups:schedules`: el cambio puede borrar la
programación.

## Restaurar un respaldo para probarlo (HU-67)

La prueba **no toca la base de la demo**: el respaldo se descarga y se carga en
una base local desechable en Docker.

```bash
# 1. Descargar el último respaldo (queda como latest.dump)
heroku pg:backups:download -a evaluartesis

# 2. Base desechable con la misma versión mayor de PostgreSQL que Heroku
heroku pg:info -a evaluartesis | grep 'PG Version'
docker run -d --name restauracion -e POSTGRES_PASSWORD=restauracion -p 5436:5432 postgres:<versión>

# 3. Restaurar
docker cp latest.dump restauracion:/latest.dump
docker exec restauracion pg_restore --no-owner --no-acl -U postgres -d postgres /latest.dump
```

Luego se levanta el servidor contra esa base
(`DATABASE_URL=postgresql://postgres:restauracion@localhost:5436/postgres`),
se entra a la web local y se revisa que estén las organizaciones, las
evaluaciones y los planes.

Al terminar se borran el contenedor y el archivo, porque contienen datos reales:

```bash
docker rm -f restauracion && rm latest.dump
```

## Restaurar en la demo (solo ante una falla real)

```bash
heroku pg:backups:restore <id-del-respaldo> DATABASE_URL -a evaluartesis --confirm evaluartesis
```

Reemplaza **todos** los datos actuales por los del respaldo. Antes conviene
sacar un respaldo del estado actual con `pg:backups:capture`.

## Verificación del 8 de noviembre de 2026

- Base de la demo: plan essential-0, PostgreSQL 18.4. No tenía respaldos
  programados; desde ese día tiene uno diario a las 03:00 (America/Guayaquil).
- Primer respaldo manual, `b001`: 209.74 KB, `Completed`.
- `b001` se restauró en un contenedor `postgres:18`: los conteos de las 9
  tablas comparadas coinciden con la demo, y el servidor conectado a la copia
  inicia sesión, muestra el panel consolidado, los resúmenes de las
  evaluaciones y genera los Excel.
- Pendiente: el 15 de noviembre, `pg:backups` debe mostrar 7 respaldos diarios.
