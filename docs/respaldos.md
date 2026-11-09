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
plan de la base (`heroku pg:info -a evaluartesis` muestra el plan). CA-66.2 pide
al menos los últimos 7 días: se confirma con `pg:backups` una semana después de
programarlo. Si el plan guardara menos, se sube de plan o se agrega una copia
semanal descargada con `pg:backups:download`.

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
