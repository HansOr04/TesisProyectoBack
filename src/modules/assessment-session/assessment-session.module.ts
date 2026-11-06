import { Module } from '@nestjs/common';
import { AssessmentAccessScopeService } from '../assessment-core/application/assessment-access-scope.service';
import { REALTIME_NOTIFIER } from './domain/ports/realtime-notifier.port';
import { AssessmentSessionGateway } from './infrastructure/assessment-session.gateway';

// Importado explícitamente por core/organizational/capacity/risk. Nest resuelve el
// import a la misma instancia en todo el grafo, así que el gateway es un
// singleton real (un solo namespace /assessment) aunque 4 módulos dependan de él.
// El servicio de alcance solo depende de Identity y Prisma (globales), así que
// se provee aquí sin importar AssessmentCoreModule, que ya importa este módulo.
@Module({
  providers: [
    AssessmentAccessScopeService,
    AssessmentSessionGateway,
    { provide: REALTIME_NOTIFIER, useExisting: AssessmentSessionGateway },
  ],
  exports: [AssessmentSessionGateway, REALTIME_NOTIFIER],
})
export class AssessmentSessionModule {}
