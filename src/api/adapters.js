import { emptyDb } from './core.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

/** Penyimpanan di memori (dipakai test dan sebagai cadangan). */
export function memoryAdapter(initial = emptyDb()) {
  let db = clone(initial);
  return { load: () => clone(db), save: (next) => { db = clone(next); } };
}

/**
 * Penyimpanan di localStorage. Bila localStorage tidak tersedia atau datanya
 * rusak (mis. mode privat, kuota penuh), otomatis memakai memori / data awal
 * agar aplikasi tetap berjalan.
 */
export function localStorageAdapter(seed, key = 'taskhub:db', storage = globalThis.localStorage) {
  const fallback = memoryAdapter(seed());
  return {
    load() {
      try {
        const raw = storage?.getItem(key);
        if (raw) return JSON.parse(raw);
        const fresh = seed();
        storage?.setItem(key, JSON.stringify(fresh));
        return fresh;
      } catch {
        return fallback.load();
      }
    },
    save(db) {
      try {
        storage.setItem(key, JSON.stringify(db));
      } catch {
        fallback.save(db);
      }
    },
  };
}
