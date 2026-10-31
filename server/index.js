/**
 * Server REST TaskHub (Node murni, tanpa dependensi tambahan).
 *   npm run server            -> http://localhost:4000
 * Data disimpan ke server/data.json sehingga dibagikan ke semua pengguna.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, createService, seedDb } from '../src/api/core.js';

const MAX_BODY = 1_000_000; // 1 MB

export function fileAdapter(file, seed = seedDb) {
  return {
    load() {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        const fresh = seed();
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(fresh, null, 2));
        return fresh;
      }
    },
    save(db) {
      // tulis ke file sementara lalu rename, supaya file tidak rusak bila proses mati
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
      fs.renameSync(tmp, file);
    },
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new ApiError(413, 'Body terlalu besar')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new ApiError(400, 'JSON tidak valid')); }
    });
    req.on('error', reject);
  });
}

export function createRequestHandler(service, { corsOrigin = '*' } = {}) {
  const routes = [
    ['GET', /^\/api\/health$/, async () => ({ ok: true })],
    ['GET', /^\/api\/users$/, () => service.listUsers()],
    ['GET', /^\/api\/projects$/, () => service.listProjects()],
    ['POST', /^\/api\/projects$/, (_m, body, actor) => service.createProject(body, actor)],
    ['PATCH', /^\/api\/projects\/([^/]+)$/, ([id], body, actor) => service.updateProject(id, body, actor)],
    ['DELETE', /^\/api\/projects\/([^/]+)$/, ([id], _b, actor) => service.deleteProject(id, actor)],
    ['GET', /^\/api\/projects\/([^/]+)\/tasks$/, ([id]) => service.listTasks(id)],
    ['POST', /^\/api\/projects\/([^/]+)\/tasks$/, ([id], body, actor) => service.createTask(id, body, actor)],
    ['GET', /^\/api\/projects\/([^/]+)\/activity$/, ([id]) => service.listActivity(id)],
    ['PATCH', /^\/api\/tasks\/([^/]+)$/, ([id], body, actor) => service.updateTask(id, body, actor)],
    ['DELETE', /^\/api\/tasks\/([^/]+)$/, ([id], _b, actor) => service.deleteTask(id, actor)],
  ];

  const send = (res, status, payload) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-User-Id',
    });
    res.end(payload === undefined ? '' : JSON.stringify(payload));
  };

  return async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204);
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      let pathMatched = false;
      for (const [method, pattern, handler] of routes) {
        const match = pattern.exec(pathname);
        if (!match) continue;
        pathMatched = true;
        if (method !== req.method) continue;
        const body = method === 'POST' || method === 'PATCH' ? await readJson(req) : {};
        const result = await handler(match.slice(1).map(decodeURIComponent), body, req.headers['x-user-id']);
        return send(res, method === 'POST' ? 201 : 200, result);
      }
      throw new ApiError(pathMatched ? 405 : 404, pathMatched ? 'Metode tidak diizinkan' : 'Endpoint tidak ditemukan');
    } catch (err) {
      if (err instanceof ApiError) return send(res, err.status, { error: err.message });
      console.error(err);
      return send(res, 500, { error: 'Terjadi kesalahan pada server' });
    }
  };
}

export function startServer({ port = 4000, file, adapter, corsOrigin } = {}) {
  const service = createService(adapter ?? fileAdapter(file));
  const server = http.createServer(createRequestHandler(service, { corsOrigin }));
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const port = Number(process.env.PORT) || 4000;
  startServer({
    port,
    file: process.env.DATA_FILE || path.join(here, 'data.json'),
    corsOrigin: process.env.CORS_ORIGIN || '*',
  }).then(() => console.log(`TaskHub API berjalan di http://localhost:${port}`));
}
