// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { memoryAdapter } from '../src/api/adapters.js';
import { seedDb } from '../src/api/core.js';
import { createHttpApi } from '../src/api/httpApi.js';
import { fileAdapter, startServer } from './index.js';

let server;
let base;
let api;

beforeAll(async () => {
  server = await startServer({ port: 0, adapter: memoryAdapter(seedDb()) });
  base = `http://localhost:${server.address().port}`;
  api = createHttpApi(base);
});
afterAll(() => new Promise((resolve) => server.close(resolve)));

const raw = (method, url, body, headers = {}) =>
  fetch(`${base}${url}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body });

describe('REST API', () => {
  it('health check', async () => {
    const res = await raw('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('alur CRUD lengkap lewat klien HTTP', async () => {
    const users = await api.listUsers();
    expect(users.length).toBeGreaterThan(1);

    const project = await api.createProject({ name: 'Proyek Server' }, 'u_budi');
    const task = await api.createTask(project.id, { title: 'Tes', priority: 'high' }, 'u_budi');
    expect(task).toMatchObject({ title: 'Tes', priority: 'high', status: 'todo' });

    const moved = await api.updateTask(task.id, { status: 'done' }, 'u_budi');
    expect(moved.status).toBe('done');
    expect(await api.listTasks(project.id)).toHaveLength(1);

    const log = await api.listActivity(project.id);
    expect(log[0].text).toMatch(/memindahkan "Tes" dari To Do ke Done/);

    await api.deleteTask(task.id, 'u_budi');
    await api.deleteProject(project.id, 'u_budi');
    expect((await api.listProjects()).some((p) => p.id === project.id)).toBe(false);
  });

  it('status HTTP: 201 untuk POST, 422 validasi, 401 tanpa pengguna, 404 tidak ada', async () => {
    const ok = await raw('POST', '/api/projects', JSON.stringify({ name: 'A' }), { 'X-User-Id': 'u_ayu' });
    expect(ok.status).toBe(201);
    const invalid = await raw('POST', '/api/projects', JSON.stringify({ name: '' }), { 'X-User-Id': 'u_ayu' });
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error).toMatch(/wajib/);
    expect((await raw('POST', '/api/projects', JSON.stringify({ name: 'A' }))).status).toBe(401);
    expect((await raw('GET', '/api/projects/p_x/tasks')).status).toBe(404);
  });

  it('endpoint tak dikenal 404, metode salah 405', async () => {
    expect((await raw('GET', '/api/tidak-ada')).status).toBe(404);
    expect((await raw('PUT', '/api/projects')).status).toBe(405);
  });

  it('JSON rusak -> 400, body terlalu besar -> 413', async () => {
    const bad = await raw('POST', '/api/projects', '{rusak', { 'X-User-Id': 'u_ayu' });
    expect(bad.status).toBe(400);
    const huge = await raw('POST', '/api/projects', JSON.stringify({ name: 'x'.repeat(1_100_000) }), { 'X-User-Id': 'u_ayu' })
      .then((r) => r.status, () => 'terputus');
    expect([413, 'terputus']).toContain(huge);
  });

  it('CORS: preflight 204 dan header diizinkan', async () => {
    const res = await raw('OPTIONS', '/api/projects');
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-headers')).toMatch(/X-User-Id/);
  });
});

describe('fileAdapter (persistensi)', () => {
  it('membuat file awal, menyimpan, dan memuat ulang', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhub-'));
    const file = path.join(dir, 'nested', 'data.json');
    const a = fileAdapter(file);
    const db = a.load();                                  // file belum ada -> dibuat dari seed
    expect(fs.existsSync(file)).toBe(true);
    db.projects = [];
    a.save(db);
    expect(fileAdapter(file).load().projects).toEqual([]);
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);     // file sementara dibersihkan
    fs.rmSync(dir, { recursive: true });
  });

  it('file rusak digantikan data awal', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhub-'));
    const file = path.join(dir, 'data.json');
    fs.writeFileSync(file, '{rusak');
    expect(fileAdapter(file).load().projects.length).toBeGreaterThan(0);
    fs.rmSync(dir, { recursive: true });
  });
});
