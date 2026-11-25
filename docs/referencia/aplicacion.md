# aplicacion

### app.module.ts

`src/app.module.ts`

| Elemento | Tipo | Qué es |
|---|---|---|
| `AppModule` | clase | Módulo raíz: configuración, límites de peticiones, tareas programadas y módulos |

| Método | Acceso | Qué hace |
|---|---|---|
| `configure(consumer)` | público | Registra los middlewares de identificador y de registro de peticiones |

Notas:

- Límite global generoso, por usuario con sesión (UserThrottlerGuard, en IdentityModule); los endpoints de IA aplican su propio límite por usuario (AssessmentAiThrottlerGuard, 10/min).
