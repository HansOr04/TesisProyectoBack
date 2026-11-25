# Revisión de seguridad (HU-70)

Revisión de la API, la web y las dependencias contra el OWASP Top 10 (2021),
hecha el 25 de noviembre de 2026 sobre el código de `develop` y, en solo
lectura, sobre la demo publicada. No incluye una prueba de intrusión externa.

## Resultado

- **CA-70.1:** no quedan hallazgos de severidad alta sin resolver.
- **CA-70.2:** `npm audit` de los dos repositorios, con las dependencias de
  desarrollo, da 0 vulnerabilidades altas y 0 críticas.

## Hallazgos corregidos

| # | Severidad | OWASP | Hallazgo | Corrección |
|---|---|---|---|---|
| 1 | Alta | A01 | Un administrador de proyecto podía agregar a su proyecto una cuenta de otro y, ya como miembro, cambiarle la contraseña o desactivarla. | Nombre, contraseña y estado de una cuenta que está en otro proyecto solo los cambia un superadministrador. |
| 2 | Alta | A01, A07 | Los permisos salían del token (hasta 24 h): a quien se le quitaba el superadministrador lo conservaba hasta que el token vencía. | Cada petición y cada entrada a una sala en vivo leen de la base la cuenta, el superadministrador y los proyectos. |
| 3 | Alta | A06 | Dependencias de desarrollo con vulnerabilidades altas y críticas (`handlebars`, `vitest`, `tinypool`, `vite`, `tmp`, `zod`, `glob`, `picomatch`). | Actualizadas. El pipeline ya revisa también las de desarrollo. |
| 4 | Media | A07 | Intentos de contraseña limitados solo por IP. | 10 por minuto por cuenta y 120 por IP (HU-71). |
| 5 | Media | A05 | La web no enviaba CSP, `X-Frame-Options`, `nosniff` ni `Referrer-Policy`. | Cabeceras en `vercel.json`. |
| 6 | Media | A05 | Swagger público en producción. | Cerrado salvo `SWAGGER_ENABLED=true`. |
| 7 | Media | A09 | La IP de la auditoría se leía de una cabecera que escribe el cliente; el identificador de petición aceptaba cualquier texto. | IP resuelta por Express con `trust proxy`; identificador de 64 caracteres seguros. |
| 8 | Baja | A07 | El tiempo de respuesta del inicio de sesión revelaba si un correo existe. | Se compara siempre contra un hash. |
| 9 | Baja | A05 | El tiempo real aceptaba cualquier origen. | Usa `CORS_ORIGIN`. |
| 10 | Baja | A01 | Agregar una cuenta desactivada la reactivaba aunque fuera de otro proyecto. | Misma regla que el hallazgo 1. |

## Revisado sin hallazgos

| OWASP | Qué se comprobó |
|---|---|
| A01 Control de acceso | Toda ruta declara su acceso o se rechaza (`JwtAuthGuard`). Cada recurso se busca dentro de su proyecto y el evaluador y el visualizador solo llegan a sus organizaciones (`AssessmentScopeGuard`). |
| A02 Criptografía | bcrypt para contraseñas; el token de renovación se guarda como sha256; `JWT_SECRET` débil impide arrancar; HTTPS y HSTS en web y API. |
| A03 Inyección | Prisma parametriza todas las consultas; la única SQL escrita a mano es `SELECT 1`. La web no usa HTML sin escapar y los enlaces de evidencia solo admiten `http(s)`. Los Excel escriben texto, no fórmulas. |
| A04 Diseño | Límites por usuario, por IA y por exportes simultáneos. |
| A05 Configuración | Helmet en la API; en producción los errores 500 no muestran detalles. |
| A08 Integridad | `package-lock.json` con `npm ci`; `main` y `develop` protegidas; CodeQL en cada pull request. |
| A09 Registros | Auditoría de cambios con retención; registros estructurados con identificador de petición (`docs/monitoreo.md`). |
| A10 SSRF | El servidor solo llama a los proveedores de IA, con direcciones fijas. No hay subida de archivos. |

## Riesgos aceptados

- **Media.** Al cambiar una contraseña se cierran las renovaciones, pero un
  token de acceso ya emitido vale hasta `JWT_EXPIRES_IN`. Vive solo en memoria
  del navegador. Se reduce bajando ese valor.
- **Media.** Un superadministrador puede cambiar la cuenta de cualquier miembro
  de un proyecto suyo, incluida la de otro superadministrador agregado a él. Son
  el equipo que opera la plataforma.
- **Media y baja.** Quedan vulnerabilidades moderadas y bajas en dependencias,
  sin versión corregida compatible. El detalle sale con `npm audit`.

## Alertas de CodeQL

- `clear-text-storage` en `auth.controller.ts`: falso positivo. El token de
  renovación va en una cookie HttpOnly y Secure, es aleatorio, rota en cada uso
  y en la base solo está su sha256.
- `file-access-to-http` en `scripts/carga-guardado.mjs`: es lo que hace el
  script, leer las cuentas de prueba e iniciar sesión con ellas.

## Cómo se mantiene

- `test/security-routes.e2e-spec.ts` recorre **todas** las rutas registradas:
  sin sesión deben responder 401, y 403 a quien no es miembro. Una ruta pública
  nueva hace fallar la prueba hasta que se declara.
- El trabajo `seguridad` del pipeline impide agregar vulnerabilidades altas o
  críticas, y CodeQL revisa cada pull request.
