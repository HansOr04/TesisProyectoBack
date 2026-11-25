# assessment-session


## Dominio

### realtime-notifier.port.ts

`src/modules/assessment-session/domain/ports/realtime-notifier.port.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `REALTIME_NOTIFIER` | constante | Símbolo de inyección |
| `ScoreUpdatedEvent` | tipo |  |
| `RealtimeNotifierPort` | tipo | Puerto de notificación en tiempo real. Los servicios de herramienta lo invocan tras persistir respuestas; la implementación (Socket.IO) es un detalle de infraestructura y nunca debe hacer fallar el guardado. |


## Infraestructura

### assessment-session.gateway.ts

`src/modules/assessment-session/infrastructure/assessment-session.gateway.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentSocketAuth` | tipo |  |
| `AssessmentSessionGateway` | clase | Varios facilitadores calificando la misma evaluación en el taller ven el avance del otro en vivo. Namespace propio /assessment, sala por evaluación (eval:&lt;evaluationId>) para no reenviar eventos a clientes ajenos. El handshake valida el mismo JWT que la API HTTP, y un evaluador solo entra a la sala de una evaluación de una organización que tiene asignada. |

| Método | Acceso | Qué hace |
|---|---|---|
| `handleConnection(client)` | público | Valida el token al conectar |
| `handleJoin(client, body)` | público | `SUBSCRIBEMESSAGE join`. Entra a la sala si tiene acceso a la evaluación |
| `handleLeave(client, body)` | público | `SUBSCRIBEMESSAGE leave`. Sale de la sala |
| `emitScoreUpdated(evaluationId, payload)` | público | Llamado por los servicios de herramienta tras persistir una respuesta. Nunca lanza. |
| `room(evaluationId)` | interno |  |
| `extractToken(client)` | interno |  |

Notas:

- Mismos orígenes que la API; sin CORS_ORIGIN (local) se admite cualquiera.


## Módulo

### assessment-session.module.ts

`src/modules/assessment-session/assessment-session.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AssessmentSessionModule` | clase | Importado explícitamente por core/organizational/capacity/risk. Nest resuelve el import a la misma instancia en todo el grafo, así que el gateway es un singleton real (un solo namespace /assessment) aunque 4 módulos dependan de él. El servicio de alcance solo depende de Identity y Prisma (globales), así que se provee aquí sin importar AssessmentCoreModule, que ya importa este módulo. |
