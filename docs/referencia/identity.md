# identity


## Dominio

### auth-context.ts

`src/modules/identity/domain/auth-context.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuthContext` | tipo | Identidad autenticada que viaja en la petición (request.auth) tras validar el JWT. Es lo único que la capa de presentación necesita del usuario. |
| `AUTH_CONTEXT_KEY` | constante | Propiedad de la petición donde viaja la identidad |
| `AccessTokenPayload` | tipo |  |

Campos:

- `AuthContext.isSuperAdmin`: Acceso total en la petición actual. En una ruta de proyecto (`:org`) solo es verdadero para el superadministrador que creó ese proyecto.
- `AuthContext.isPlatformSuperAdmin`: Superadministrador de la plataforma, sin importar el proyecto.
- `AuthContext.organisations`: Ids de organización a las que pertenece el usuario.

### permission.types.ts

`src/modules/identity/domain/permission.types.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UserPermission` | tipo |  |
| `CanPerformActionResult` | tipo |  |
| `UserRoleWithPermissions` | tipo |  |

### oauth-verifier.port.ts

`src/modules/identity/domain/ports/oauth-verifier.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OAUTH_VERIFIER` | constante | Símbolo de inyección |
| `OAuthIdentity` | tipo |  |
| `OAuthVerifierPort` | tipo | Un proveedor OAuth (Google hoy; GitHub/Microsoft mañana) solo tiene que saber verificar un id_token y devolver la identidad — Strategy. |

### password-hasher.port.ts

`src/modules/identity/domain/ports/password-hasher.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `PASSWORD_HASHER` | constante | Símbolo de inyección |
| `PasswordHasherPort` | tipo |  |

### token-issuer.port.ts

`src/modules/identity/domain/ports/token-issuer.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `TOKEN_ISSUER` | constante | Símbolo de inyección |
| `TokenIssuerPort` | tipo |  |


## Aplicación

### auth.service.ts

`src/modules/identity/application/auth.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuthenticatedSession` | tipo |  |
| `AuthService` | clase | Casos de uso de autenticación. No sabe de bcrypt, JWT ni Google: habla con puertos (DIP) y por eso se puede probar sin red ni criptografía real. |

| Método | Acceso | Qué hace |
|---|---|---|
| `loginWithPassword(email, password, userAgent?)` | público | Inicia sesión con correo y contraseña |
| `loginWithOAuth(idToken, userAgent?)` | público | Inicia sesión con Google |
| `refresh(rawRefreshToken, userAgent?)` | público | Rota el refresh token y emite un nuevo token de acceso. |
| `logout(rawRefreshToken?)` | público | Cierra la sesión |
| `oauthProviders()` | público | Proveedores disponibles |
| `buildSession(user, userAgent?, refresh?)` | interno |  |

Campos:

- `AuthenticatedSession.refreshToken`: Solo para el controlador: va a la cookie HttpOnly, nunca al cuerpo.

Notas:

- `loginWithPassword`: Mismo tiempo de respuesta que con una cuenta real: si no, se podría averiguar qué correos existen.
- `loginWithOAuth`: 1) usuario ya vinculado al proveedor; 2) usuario existente por email (se vincula); 3) no existe → se rechaza: las cuentas las crea un admin o el seed, para que no entre cualquiera con una cuenta de Google.

### authorization.service.ts

`src/modules/identity/application/authorization.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AuthorizationService` | clase | RBAC por organización: rol → permisos (módulo:acción). Un usuario puede tener varios roles en la misma organización; se unen sus permisos. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getUserRoles(organisation, userId)` | público | Roles del usuario en el proyecto |
| `getUserPermissions(organisation, userId)` | público | Permisos unidos de sus roles |
| `canPerformAction(organisation, userId, moduleCode, action, isSuperAdmin)` | público | Si puede hacer una acción |

### organisation-access.ts

`src/modules/identity/application/organisation-access.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganisationAccess` | tipo |  |
| `CurrentAccount` | tipo |  |
| `loadCurrentAccount(prisma, userId)` | función | Estado actual de la cuenta, leído de la base y no del token: el token dura horas, y a quien se desactiva, se le quita el superadministrador o se saca de un proyecto debe perder ese acceso de inmediato. |
| `resolveOrganisationAccess(prisma, user, organisation)` | función | Decide con qué alcance entra un usuario a un proyecto. Lo usan el guard de HTTP y el de WebSocket, para que las dos puertas apliquen la misma regla, siempre con la cuenta de loadCurrentAccount. |

Campos:

- `OrganisationAccess.allowed`: Puede entrar al proyecto: es miembro o es el superadministrador que lo creó.
- `OrganisationAccess.isSuperAdmin`: Superadministrador con acceso total en ESTE proyecto: solo el que lo creó. Un superadministrador en un proyecto ajeno entra como cualquier miembro, con el rol que le hayan asignado.
- `CurrentAccount.organisations`: Proyectos de los que es miembro ahora mismo.

### organisation-management.service.ts

`src/modules/identity/application/organisation-management.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganisationView` | tipo |  |
| `CreateOrganisationInput` | tipo |  |
| `SLUG` (interno) | constante | El identificador viaja en las URLs (`/:org/assessments/...`): slug estricto. |
| `RESERVED` (interno) | constante | Reservados por rutas globales existentes, para que nunca colisionen. |
| `OrganisationManagementService` | clase | Alta y mantenimiento de organizaciones (inquilinos) desde la API, reservado al superadministrador global. Cada superadministrador ve y administra solo los proyectos que creó. Crear una organización no es insertar una fila: hay que dejarla operativa (plantillas, parámetros de riesgo, administrador con su rol), y eso es lo que hace `create` en una sola transacción lógica. |

| Método | Acceso | Qué hace |
|---|---|---|
| `list(actorId)` | público | Proyectos que creó este superadministrador: solo esos administra. |
| `get(id, actorId)` | público | Un proyecto propio |
| `create(input, actor)` | público | Crea un proyecto listo para usar |
| `update(id, input, actor)` | público | Datos editables del alta. El identificador no cambia: vive en las URLs. |
| `reprovision(id, actor)` | público | Vuelve a aplicar las plantillas base sobre una organización existente (útil si se creó antes de que existiera el aprovisionamiento o si una plantilla se borró por error). No toca evaluaciones ni respuestas. |
| `assignableUsers(search?)` | público | Usuarios activos de la plataforma, para asignarlos a un proyecto sin tener que volver a crearlos. Solo datos de contacto, nunca credenciales. |
| `assertAdminInput(input, actor)` | interno | Un administrador nuevo necesita contraseña; una cuenta existente conserva la suya, así que crear un proyecto no sirve para cambiársela a otra persona. |
| `attachAdmin(organisation, input, actor)` | interno | Crea o reutiliza al administrador inicial y le da el rol en la organización. |

Campos:

- `CreateOrganisationInput.adminEmail`: Administrador inicial; si se omite, el superadmin que la crea queda como miembro.

Notas:

- `create`: El administrador se valida antes de crear nada: si sus datos no sirven, no debe quedar un proyecto a medio configurar.
- `create`: Sin plantillas no se puede iniciar ninguna evaluación: se aprovisiona antes de devolver, para que la organización nazca utilizable.
- `attachAdmin`: Validada en assertAdminInput antes de crear el proyecto.

### refresh-token.service.ts

`src/modules/identity/application/refresh-token.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IssuedRefreshToken` | tipo |  |
| `ROTATION_GRACE_MS` | constante | Dos pestañas comparten la cookie y pueden renovar a la vez: la segunda llega con el token que la primera acaba de rotar. Durante este margen eso no se toma por robo. Es corto para que una cookie robada siga sin servir después. |
| `RefreshTokenService` | clase | Refresh tokens rotatorios: cada uso emite uno nuevo y revoca el anterior. Si alguien presenta un token ya rotado (robo de cookie), se revoca toda la familia y la sesión legítima también cae — el usuario vuelve a iniciar sesión, el atacante pierde el acceso. |

| Método | Acceso | Qué hace |
|---|---|---|
| `ttlMilliseconds()` | público | Vigencia configurada |
| `hash(token)` | interno |  |
| `issue(userId, userAgent?, familyId, client)` | público | Emite un token nuevo en una familia |
| `rotate(rawToken, userAgent?)` | público | Valida y rota: devuelve el usuario y el nuevo token. |
| `isConcurrentRotation(familyId, revokedAt)` | interno | El token se rotó hace un momento y la sesión sigue abierta. Cerrar sesión, desactivar la cuenta o detectar un robo revocan toda la familia: ahí ya no queda ninguno activo y el margen no la revive. |
| `revokeFamily(familyId)` | interno |  |
| `revoke(rawToken)` | público | Cierra la sesión en todas las pestañas que la comparten. |
| `revokeAllForUser(userId)` | público | Cierra todas las sesiones de un usuario (desactivación, baja). |
| `purgeExpired()` | público | Limpieza de tokens vencidos/revocados con más de 30 días. |

Campos:

- `IssuedRefreshToken.token`: Valor opaco que viaja en la cookie HttpOnly (nunca se persiste en claro).

Notas:

- `rotate`: Revocar el token y emitir el siguiente van juntos: si dos pestañas llegan a la vez, solo una lo rota y la otra espera a que el nuevo ya exista.
- `rotate`: Reuso de un token ya rotado: se revoca toda la familia.

### request-context.service.ts

`src/modules/identity/application/request-context.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `RequestContextService` | clase | Acceso a la petición actual (usuario autenticado, ip, request-id) sin pasar todo por parámetros de controlador. Request-scoped en HTTP; en tests/scripts se inyecta sin REQUEST y devuelve valores vacíos. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getAuthContext()` | público | Identidad de la petición |
| `getCurrentUserId()` | público | Id del usuario |
| `getCurrentUserEmail()` | público | Correo |
| `getCurrentUserIsSuperAdmin()` | público | Acceso total en este proyecto |
| `getCurrentUserIsPlatformSuperAdmin()` | público | Superadministrador de la plataforma, aunque no sea dueño del proyecto actual. |
| `getCurrentUserOrganisations()` | público | Proyectos |
| `getRequestId()` | público | Identificador de la petición |
| `getRequestIp()` | público | IP resuelta por Express |
| `getUserAgent()` | público | Navegador |
| `getCurrentUser()` | público | Usuario de la base, una vez por petición |
| `requireCurrentUser()` | público | Lo mismo, o error |

Notas:

- `getRequestIp`: Express ya resuelve X-Forwarded-For según «trust proxy»: leer la cabecera aquí dejaba que el cliente escribiera cualquier IP en la auditoría.

### user-management.service.ts

`src/modules/identity/application/user-management.service.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganisationUserView` | tipo |  |
| `UserManagementService` | clase | Alta y administración de usuarios de una organización. Un administrador de evaluación (assessment_admin) gestiona usuarios y roles de su organización; solo un superadmin global puede otorgar/quitar superadmin. |

| Método | Acceso | Qué hace |
|---|---|---|
| `listMembers(organisation, query)` | público | Miembros del proyecto |
| `createMember(organisation, input, actor)` | público | Crea una cuenta o agrega una existente |
| `updateMember(organisation, userId, input, actor)` | público | Cambia datos, estado, contraseña o rol |
| `assertCanManageAccount(organisation, userId, actor)` | interno | Una cuenta es de la persona, no del proyecto: sin esto, un administrador agregaba a su proyecto la cuenta de otro y le cambiaba la contraseña. |
| `assertCanManageSuperAdmin(target, actor)` | interno |  |
| `removeMember(organisation, userId, actor)` | público | Saca del proyecto y cierra sus sesiones |
| `setViewerVisibility(organisation, userId, input, actor)` | público | Qué organizaciones evaluadas ve un visualizador: todas las del proyecto o una lista. Se guarda en su asignación de rol, así que solo aplica a quien tiene el rol de visualizador. |
| `replaceRole(organisation, userId, roleCode, actorId)` | interno |  |
| `assertMember(organisation, userId)` | interno |  |
| `getMember(organisation, userId)` | interno |  |
| `toView(user)` | interno |  |

Notas:

- Solo en el rol de visualizador: qué organizaciones evaluadas ve.
- `createMember`: Asignar una cuenta existente no cambia su contraseña: si no, quien administra un proyecto podría quedarse con la cuenta de cualquiera.
- `createMember`: Reactivar una cuenta también es cambiarla.
- `createMember`: Usuario existente en otra organización: se agrega como miembro.
- `updateMember`: El rol dentro del proyecto sí lo gestiona su administrador; la cuenta (nombre, contraseña, activación) de un superadministrador o de alguien que también está en otro proyecto, no.
- `updateMember`: Un usuario desactivado o con contraseña cambiada pierde sus sesiones.


## Infraestructura

### bcrypt-password-hasher.ts

`src/modules/identity/infrastructure/bcrypt-password-hasher.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `BcryptPasswordHasher` | clase | Contraseñas con bcrypt, coste 10 |

| Método | Acceso | Qué hace |
|---|---|---|
| `hash(plain)` | público | Cifra |
| `compare(plain, hash)` | público | Compara |

### google-oauth-verifier.ts

`src/modules/identity/infrastructure/google-oauth-verifier.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `GoogleOAuthVerifier` | clase | Login con Google (OAuth 2.0 / OpenID Connect). Gratis: solo requiere un OAuth Client ID de Google Cloud Console. El frontend obtiene el id_token con Google Identity Services y lo manda a POST /auth/google. |

| Método | Acceso | Qué hace |
|---|---|---|
| `enabled()` | público | Si hay Client ID configurado |
| `verify(idToken)` | público | Verifica el id_token |

### jwt-token-issuer.ts

`src/modules/identity/infrastructure/jwt-token-issuer.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `JwtTokenIssuer` | clase | Tokens de acceso JWT |

| Método | Acceso | Qué hace |
|---|---|---|
| `sign(payload)` | público | Firma |
| `verify(token)` | público | Verifica |


## Presentación

### auth.controller.ts

`src/modules/identity/presentation/auth.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `REFRESH_COOKIE` | constante | Nombre de la cookie |
| `REFRESH_COOKIE_PATH` (interno) | constante | Solo se envía a /auth/*: el resto de la API nunca ve la cookie. |
| `LOGIN_LIMIT_PER_ACCOUNT` (interno) | constante | La web llega a /auth a través de Vercel (cookie propia, HU-71): varias personas comparten la IP, así que el inicio de sesión cuenta por correo y la renovación por sesión. El tope por IP de abajo frena a quien prueba muchas cuentas y deja entrar a la vez a todo un taller (HU-68). |
| `refreshLimit(context)` (interno) | función | Sin cookie no hay sesión que renovar (cada visita a la web pasa por aquí) y ni siquiera se consulta la base: queda solo el tope por IP. |
| `AuthController` | clase | Rutas de sesión |

| Método | Acceso | Qué hace |
|---|---|---|
| `cookieOptions()` | interno | El refresh token viaja en cookie HttpOnly (inaccesible desde JS) y el token de acceso, corto, en el cuerpo — el frontend lo guarda en memoria. En producción la web llama a /auth en su propio dominio (Vercel lo reenvía aquí): la cookie es propia y los navegadores que bloquean las de terceros la aceptan. SameSite=None cubre a quien todavía llame directo a Heroku. |
| `issue(res, session)` | interno |  |
| `readRefreshCookie(req)` | interno |  |
| `login(dto, userAgent, res)` | público | `POST login`. Correo y contraseña |
| `loginWithGoogle(dto, userAgent, res)` | público | `POST google`. Google |
| `refresh(req, userAgent, res)` | público | `POST refresh`. Renueva el token de acceso rotando el refresh token de la cookie. |
| `logout(req, res)` | público | `POST logout`. Cierra la sesión |
| `providers()` | público | `GET providers`. Proveedores disponibles |
| `me()` | público | `GET me`. Perfil + roles Assessment por organización, para que el frontend sepa qué menús mostrar sin adivinar. |

### auth.decorators.ts

`src/modules/identity/presentation/decorators/auth.decorators.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IS_PUBLIC_KEY` | constante | Clave de metadatos |
| `REQUIRE_AUTHENTICATED_KEY` | constante | Clave de metadatos |
| `REQUIRE_SUPERADMIN_KEY` | constante | Clave de metadatos |
| `Public()` | función | Ruta sin token. |
| `RequireAuthenticated()` | función | Usuario autenticado (JWT válido). Si la ruta tiene `:org`, el usuario debe ser miembro de esa organización (o superadmin). |
| `RequireGlobalSuperAdmin()` | función | Solo superadmin global (User.isSuperAdmin). |

### current-auth.decorator.ts

`src/modules/identity/presentation/decorators/current-auth.decorator.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CurrentAuth` | constante | Inyecta la identidad en un controlador |

### login.dto.ts

`src/modules/identity/presentation/dto/login.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `LoginDto` | clase | Correo y contraseña |
| `OAuthLoginDto` | clase | id_token de Google |

### organisation.dto.ts

`src/modules/identity/presentation/dto/organisation.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateOrganisationDto` | clase | Alta de proyecto |
| `UpdateOrganisationDto` | clase | Nombre del proyecto |

Campos:

- `CreateOrganisationDto.id`: Identificador en las URLs (`/:org/assessments/...`). No se puede cambiar después.
- `CreateOrganisationDto.adminEmail`: Si se omite, el superadministrador que la crea queda como administrador.
- `CreateOrganisationDto.adminPassword`: Obligatoria solo si el correo no corresponde a un usuario existente.

### user-management.dto.ts

`src/modules/identity/presentation/dto/user-management.dto.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `CreateOrganisationUserDto` | clase | Alta de usuario |
| `UpdateOrganisationUserDto` | clase | Cambios de usuario |
| `ViewerVisibilityDto` | clase | Organizaciones evaluadas que ve un visualizador. |

Campos:

- `CreateOrganisationUserDto.password`: Opcional: sin contraseña el usuario solo podrá entrar por OAuth.
- `CreateOrganisationUserDto.isSuperAdmin`: Solo un superadmin puede otorgarlo.
- `UpdateOrganisationUserDto.roleCode`: Rol de evaluación dentro de la organización; null = sin rol.

### ip-throttler.ts

`src/modules/identity/presentation/guards/ip-throttler.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IP_THROTTLER` | constante | Tope por IP de las rutas de /auth, además de su límite por cuenta o sesión. |
| `AUTH_LIMIT_PER_IP` | constante | 300 peticiones por minuto |
| `ipThrottler` | constante | Configuración del tope por IP |

### jwt-auth.guard.ts

`src/modules/identity/presentation/guards/jwt-auth.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `getBearerToken(request)` | función | Lee el token de la cabecera |
| `JwtAuthGuard` | clase | Guard global (APP_GUARD). Toda ruta HTTP debe declarar exactamente qué exige: @Public(), @RequireAuthenticated() o @RequireGlobalSuperAdmin() — las rutas sin declaración se rechazan, para que olvidar un decorador nunca deje un endpoint abierto por accidente. |

| Método | Acceso | Qué hace |
|---|---|---|
| `canActivate(context)` | público | Valida sesión, cuenta y pertenencia al proyecto |
| `isEffectivelyPublic(context)` | interno | @Public en el handler gana; un handler restringido nunca se vuelve público por un @Public a nivel de clase. |

Notas:

- `canActivate`: Permisos y membresías de la base, no del token: un usuario desactivado, degradado o sacado de un proyecto pierde el acceso de inmediato.
- `canActivate`: Dentro de un proyecto, el superadministrador solo conserva el acceso total si es quien lo creó; en los demás entra como cualquier miembro.

### user-throttler.guard.ts

`src/modules/identity/presentation/guards/user-throttler.guard.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UserThrottlerGuard` | clase | Límite global de peticiones: por usuario con sesión y por IP sin ella (el inicio de sesión). Contado por IP, los evaluadores de un taller detrás del mismo router compartían 300 peticiones por minuto, y con 20 calificando a la vez una de cada cuatro calificaciones se rechazaba con 429. Se registra justo después de JwtAuthGuard para que la petición ya traiga el usuario. |

| Método | Acceso | Qué hace |
|---|---|---|
| `getTracker(req)` | redefinible | Cuenta por usuario o por IP |

### organisation-management.controller.ts

`src/modules/identity/presentation/organisation-management.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `OrganisationManagementController` | clase | Administración de organizaciones (inquilinos). Son rutas globales, sin `:org`, así que usan el guard de superadministrador en lugar del de permisos por organización. |

| Método | Acceso | Qué hace |
|---|---|---|
| `list()` | público | `GET `. Proyectos propios |
| `assignableUsers(search?)` | público | `GET assignable-users`. Usuarios ya creados que se pueden asignar a un proyecto. |
| `create(dto)` | público | `POST `. Crea |
| `update(id, dto)` | público | `PATCH :id`. Renombra |
| `reprovision(id)` | público | `POST :id/provision`. Reaplica las plantillas base sobre una organización existente. |

### user-management.controller.ts

`src/modules/identity/presentation/user-management.controller.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `UserManagementController` | clase | Gestión de usuarios de una organización. Requiere el permiso 'admin' del módulo assessment-core (rol assessment_admin) o ser superadmin global. |

| Método | Acceso | Qué hace |
|---|---|---|
| `actor()` | interno |  |
| `list(org, query)` | público | `GET :org/users`. Lista |
| `create(org, dto)` | público | `POST :org/users`. Crea o agrega |
| `update(org, id, dto)` | público | `PATCH :org/users/:id`. Edita |
| `setVisibility(org, id, dto)` | público | `PUT :org/users/:id/visibility`. Qué organizaciones evaluadas ve un usuario con rol de visualizador. |
| `remove(org, id)` | público | `DELETE :org/users/:id`. Saca del proyecto |


## Módulo

### identity.module.ts

`src/modules/identity/identity.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `IdentityModule` | clase | Global: RequestContextService y AuthorizationService los usan todos los módulos Assessment, igual que el guard JWT que se registra como APP_GUARD. |

Notas:

- El orden importa: el límite de peticiones cuenta por el usuario que deja JwtAuthGuard en la petición.
