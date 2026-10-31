import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './core.js';
import { createHttpApi } from './httpApi.js';

const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });

describe('createHttpApi', () => {
  it('memanggil endpoint yang benar dengan header pengguna', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply(201, { id: 't1' }));
    const api = createHttpApi('http://x.test/', fetchImpl);
    const result = await api.createTask('p1', { title: 'a' }, 'u_ayu');
    expect(result).toEqual({ id: 't1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://x.test/api/projects/p1/tasks');   // slash di akhir dibuang
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', 'X-User-Id': 'u_ayu' });
    expect(JSON.parse(init.body)).toEqual({ title: 'a' });
  });

  it('GET tanpa body tidak mengirim Content-Type', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply(200, []));
    await createHttpApi('http://x.test', fetchImpl).listProjects();
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({});
    expect(fetchImpl.mock.calls[0][1].body).toBeUndefined();
  });

  it.each([
    ['listUsers', [], 'GET', '/api/users'],
    ['updateProject', ['p1', { name: 'b' }, 'u'], 'PATCH', '/api/projects/p1'],
    ['deleteProject', ['p1', 'u'], 'DELETE', '/api/projects/p1'],
    ['listTasks', ['p1'], 'GET', '/api/projects/p1/tasks'],
    ['updateTask', ['t1', { status: 'done' }, 'u'], 'PATCH', '/api/tasks/t1'],
    ['deleteTask', ['t1', 'u'], 'DELETE', '/api/tasks/t1'],
    ['listActivity', ['p1'], 'GET', '/api/projects/p1/activity'],
  ])('%s -> %s %s', async (fn, args, method, path) => {
    const fetchImpl = vi.fn().mockResolvedValue(reply(200, {}));
    await createHttpApi('http://x.test', fetchImpl)[fn](...args);
    expect(fetchImpl.mock.calls[0][0]).toBe(`http://x.test${path}`);
    expect(fetchImpl.mock.calls[0][1].method).toBe(method);
  });

  it('respons error diubah menjadi ApiError dengan pesan dari server', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply(422, { error: 'Judul task wajib diisi' }));
    const err = await createHttpApi('http://x', fetchImpl).createTask('p', {}, 'u').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, message: 'Judul task wajib diisi' });
  });

  it('respons error tanpa JSON memakai pesan umum', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('html'); } });
    const err = await createHttpApi('http://x', fetchImpl).listProjects().catch((e) => e);
    expect(err).toMatchObject({ status: 502, message: 'Permintaan gagal (502)' });
  });

  it('server tidak terjangkau -> ApiError status 0', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await createHttpApi('http://x', fetchImpl).listProjects().catch((e) => e);
    expect(err).toMatchObject({ status: 0, message: 'Tidak dapat terhubung ke server' });
  });
});
