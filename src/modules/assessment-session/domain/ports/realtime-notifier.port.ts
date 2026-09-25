export const REALTIME_NOTIFIER = Symbol('REALTIME_NOTIFIER');

export interface ScoreUpdatedEvent {
  evaluationId: string;
  indicatorIds: string[];
  scoredBy: string;
}

// Puerto de notificación en tiempo real. Los servicios de herramienta lo
// invocan tras persistir respuestas; la implementación (Socket.IO) es un
// detalle de infraestructura y nunca debe hacer fallar el guardado.
export interface RealtimeNotifierPort {
  emitScoreUpdated(evaluationId: string, payload: ScoreUpdatedEvent): void;
}
