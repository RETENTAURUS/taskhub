import { createHttpApi } from './httpApi.js';
import { createLocalApi } from './localApi.js';

/**
 * Memilih backend lewat environment variable:
 *   VITE_API_URL diisi  -> memakai server REST (folder /server)
 *   VITE_API_URL kosong -> memakai API tiruan di browser (cocok untuk Netlify/Vercel statis)
 */
export function createDefaultApi(env = import.meta.env) {
  return env.VITE_API_URL ? createHttpApi(env.VITE_API_URL) : createLocalApi();
}
