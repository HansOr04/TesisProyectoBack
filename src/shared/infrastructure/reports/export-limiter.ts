import { ServiceUnavailableException } from '@nestjs/common';

// Los exportes (PPTX/Excel) se generan en memoria y son costosos en CPU: un
// semáforo acota cuántos se construyen a la vez y cuántos esperan en cola,
// para que un lote de descargas no tumbe el proceso. Sin dependencias.
const MAX_CONCURRENT = Math.max(
  1,
  Number(process.env.EXPORT_MAX_CONCURRENCY ?? 2),
);
const MAX_QUEUED = Math.max(0, Number(process.env.EXPORT_MAX_QUEUED ?? 20));
const QUEUE_TIMEOUT_MS = 30_000;

let running = 0;
const waiting: Array<() => void> = [];

function release() {
  running -= 1;
  const next = waiting.shift();
  if (next) next();
}

/** Ejecuta `task` cuando hay un cupo libre; rechaza si la cola está llena. */
export async function withExportSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) {
    if (waiting.length >= MAX_QUEUED) {
      throw new ServiceUnavailableException(
        'Demasiados exportes en curso. Intenta de nuevo en unos segundos.',
      );
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = waiting.indexOf(wake);
        if (index >= 0) waiting.splice(index, 1);
        reject(
          new ServiceUnavailableException(
            'El exporte tardó demasiado en obtener un cupo. Intenta de nuevo.',
          ),
        );
      }, QUEUE_TIMEOUT_MS);
      const wake = () => {
        clearTimeout(timer);
        resolve();
      };
      waiting.push(wake);
    });
  }
  running += 1;
  try {
    return await task();
  } finally {
    release();
  }
}

/** Estado actual, para pruebas y diagnóstico. */
export function exportLimiterStats() {
  return { running, waiting: waiting.length, maxConcurrent: MAX_CONCURRENT };
}
