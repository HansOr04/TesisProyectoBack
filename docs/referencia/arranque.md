# arranque

### main.ts

`src/main.ts`

Notas:

- `bootstrap`: Heroku atiende detrás de un enrutador que agrega X-Forwarded-For. Sin confiar en ese primer salto, req.ip era la del enrutador y los límites por IP (300 peticiones y 10 inicios de sesión por minuto) se compartían entre todos los usuarios de la plataforma: un taller podía quedarse sin poder iniciar sesión.
- `bootstrap`: Sin esto el navegador repite el preflight OPTIONS antes de cada PUT/POST, un viaje de red extra por guardado. 7200 s es el tope de Chrome.
- `bootstrap`: Socket.IO para AssessmentSessionGateway (NestFactory no lo enlaza solo)
- `bootstrap`: En producción la documentación de la API queda cerrada, salvo que se pida.
