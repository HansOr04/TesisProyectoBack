import { Injectable } from '@nestjs/common';

const WINDOW_MS = 60 * 60 * 1000;

/**
 * Cuenta los errores 5xx de la última hora. Los expone /health para que la
 * vigilancia (`.github/workflows/vigilancia.yml`) avise al equipo. Vive en
 * memoria: se reinicia con el servidor, y el detalle queda en los registros.
 */
@Injectable()
export class ServerErrorMonitor {
  private timestamps: number[] = [];

  record(now = Date.now()): void {
    this.prune(now);
    this.timestamps.push(now);
  }

  snapshot(now = Date.now()): { lastHour: number; lastAt: string | null } {
    this.prune(now);
    const last = this.timestamps[this.timestamps.length - 1];
    return {
      lastHour: this.timestamps.length,
      lastAt: last === undefined ? null : new Date(last).toISOString(),
    };
  }

  private prune(now: number): void {
    this.timestamps = this.timestamps.filter((t) => now - t < WINDOW_MS);
  }
}
