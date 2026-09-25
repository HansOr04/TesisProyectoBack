const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 5 * 60 * 1000;

interface BreakerState {
  consecutiveFailures: number;
  openUntil: number | null;
}

// LLM10 (doc 03/06): tras 5 fallos consecutivos (429/5xx) de un proveedor de
// IA se deja de llamarlo por 5 minutos en vez de seguir intentando y acumular
// costo/latencia contra un proveedor caído. Estado en memoria por instancia
// de proceso — cada servicio de IA (Organizativa/Capacidades/Riesgos) mantiene su propia
// instancia, ya que cada uno puede apuntar a un proveedor distinto.
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
