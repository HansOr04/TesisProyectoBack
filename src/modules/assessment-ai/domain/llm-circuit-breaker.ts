const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 5 * 60 * 1000;

interface BreakerState {
  consecutiveFailures: number;
  openUntil: number | null;
}

export class LlmCircuitBreaker {
  private readonly states = new Map<string, BreakerState>();

  private getState(key: string): BreakerState {
    let state = this.states.get(key);
    if (!state) {
      state = { consecutiveFailures: 0, openUntil: null };
      this.states.set(key, state);
    }
    return state;
  }

  isOpen(key: string): boolean {
    const state = this.getState(key);
    if (state.openUntil === null) return false;
    if (Date.now() >= state.openUntil) {
      state.openUntil = null;
      state.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  recordSuccess(key: string): void {
    const state = this.getState(key);
    state.consecutiveFailures = 0;
    state.openUntil = null;
  }

  recordFailure(key: string): void {
    const state = this.getState(key);
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
      state.openUntil = Date.now() + OPEN_DURATION_MS;
    }
  }
}
