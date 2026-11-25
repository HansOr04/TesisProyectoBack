export const REALTIME_NOTIFIER = Symbol('REALTIME_NOTIFIER');

export interface ScoreUpdatedEvent {
  evaluationId: string;
  indicatorIds: string[];
  scoredBy: string;
}

export interface RealtimeNotifierPort {
  emitScoreUpdated(evaluationId: string, payload: ScoreUpdatedEvent): void;
}
