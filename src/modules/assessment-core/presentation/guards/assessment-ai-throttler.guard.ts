import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// LLM10 (doc 03/06): limita las llamadas a los endpoints de asistencia con IA
// a 10 solicitudes por minuto por usuario autenticado (no por IP, para no
// penalizar a toda una oficina compartiendo salida a internet).
@Injectable()
export class AssessmentAiThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const email = req.auth?.email;
    return email || req.ip;
  }
}
