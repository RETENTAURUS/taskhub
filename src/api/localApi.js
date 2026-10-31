import { createService, seedDb } from './core.js';
import { localStorageAdapter } from './adapters.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * API tiruan di browser. Antarmukanya identik dengan API HTTP, dan setiap
 * pemanggilan tetap async dengan jeda (latency) agar status loading/error
 * di UI benar-benar terlihat dan teruji.
 */
export function createLocalApi({ adapter = localStorageAdapter(seedDb), latency = 250 } = {}) {
  const service = createService(adapter);
  return Object.fromEntries(
    Object.entries(service).map(([name, fn]) => [
      name,
      async (...args) => {
        if (latency) await wait(latency);
        return fn(...args);
      },
    ]),
  );
}
