# Base de datos

PostgreSQL con Prisma 5. El modelo está en `prisma/schema.prisma` y tiene 23 tablas.

## Diagrama

```mermaid
erDiagram
  User |o--o{ Organisation : "createdById"
  User ||--o{ RefreshToken : "userId"
  Organisation ||--o{ OrganisationMember : "organisationId"
  User ||--o{ OrganisationMember : "userId"
  AppModule ||--o{ AppModulePermission : "moduleId"
  AuthRole ||--o{ AuthRolePermission : "roleId"
  AppModulePermission ||--o{ AuthRolePermission : "permissionId"
  Organisation ||--o{ AuthUserRole : "organisation"
  User ||--o{ AuthUserRole : "userId"
  AuthRole ||--o{ AuthUserRole : "roleId"
  Organisation ||--o{ ActivityLog : "organisation"
  User ||--o{ ActivityLog : "createdById"
  Organisation ||--o{ AssessmentOrganisationProfile : "organisation"
  AssessmentOrganisationProfile |o--o{ AssessmentOrganisationProfile : "parentProfileId"
  AssessmentOrganisationProfile ||--o{ AssessmentProfileSectionExclusion : "profileId"
  AssessmentSection ||--o{ AssessmentProfileSectionExclusion : "sectionId"
  AssessmentOrganisationProfile ||--o{ AssessmentProfileIndicatorExclusion : "profileId"
  AssessmentIndicator ||--o{ AssessmentProfileIndicatorExclusion : "indicatorId"
  Organisation ||--o{ AssessmentRiskCountryParam : "organisation"
  Organisation ||--o{ AssessmentTemplate : "organisation"
  AssessmentTemplate ||--o{ AssessmentSection : "templateId"
  AssessmentSection ||--o{ AssessmentIndicator : "sectionId"
  Organisation ||--o{ AssessmentEvaluation : "organisation"
  AssessmentTemplate ||--o{ AssessmentEvaluation : "templateId"
  AssessmentOrganisationProfile ||--o{ AssessmentEvaluation : "profileId"
  AssessmentEvaluation ||--o{ AssessmentResponse : "evaluationId"
  AssessmentIndicator ||--o{ AssessmentResponse : "indicatorId"
  AssessmentEvaluation ||--o{ AssessmentRisk : "evaluationId"
  AssessmentRisk ||--o{ AssessmentMitigationMeasure : "riskId"
  Organisation ||--o{ AssessmentIndicatorMeasure : "organisation"
  AssessmentEvaluation ||--o{ AssessmentIndicatorMeasure : "evaluationId"
  AssessmentIndicator ||--o{ AssessmentIndicatorMeasure : "indicatorId"
```

## Convenciones

- **Inquilino.** Los datos de evaluación llevan `organisation`, el proyecto dueño.
  Toda consulta filtra por él.
- **Claves.** `cuid` como texto, salvo `Organisation` (un texto legible) y
  `AssessmentAiCache` (un sha256).
- **Borrado lógico.** `deletedAt` con fecha significa borrado. No hay un filtro
  automático: cada consulta agrega `deletedAt: null`.
- **Fechas de calendario** (inicio y fin de medidas): medianoche UTC. La web toma
  solo año, mes y día.
- **Decimales.** Pesos y puntajes son `Decimal`; la API los entrega como texto.
- **Nombres únicos con borrado lógico.** Los índices únicos no excluyen los
  borrados: por eso se revive la fila con `upsert` en lugar de crear otra.

## Enumeraciones

| Enumeración | Valores |
|---|---|
| `AssessmentTool` | `ORGANIZATIONAL`, `CAPACITY`, `RISK` |
| `AssessmentEvaluationStatus` | `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `ARCHIVED` |
| `AssessmentRiskClass` | `NEGLIGIBLE`, `NON_NEGLIGIBLE` |
| `AssessmentMeasureStatus` | `PENDING`, `IN_PROGRESS`, `DONE` |


## Tablas

| Grupo | Tablas |
|---|---|
| [Identidad y acceso](identidad-y-acceso.md) | `Organisation`, `User`, `RefreshToken`, `OrganisationMember`, `AppModule`, `AppModulePermission`, `AuthRole`, `AuthRolePermission`, `AuthUserRole` |
| [Auditoría](auditoria.md) | `ActivityLog` |
| [Organizaciones evaluadas](organizaciones-evaluadas.md) | `AssessmentOrganisationProfile`, `AssessmentProfileSectionExclusion`, `AssessmentProfileIndicatorExclusion`, `AssessmentRiskCountryParam` |
| [Herramientas](herramientas.md) | `AssessmentTemplate`, `AssessmentSection`, `AssessmentIndicator` |
| [Evaluaciones y planes](evaluaciones-y-planes.md) | `AssessmentEvaluation`, `AssessmentResponse`, `AssessmentRisk`, `AssessmentMitigationMeasure`, `AssessmentIndicatorMeasure` |
| [Inteligencia artificial](inteligencia-artificial.md) | `AssessmentAiCache` |

Las migraciones, los datos iniciales y consultas útiles están en
[migraciones](migraciones.md).
