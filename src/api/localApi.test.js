import { describe, expect, it } from 'vitest';
import { memoryAdapter } from './adapters.js';
import { seedDb } from './core.js';
import { createLocalApi } from './localApi.js';

describe('createLocalApi', () => {
  it('mengekspos semua operasi layanan dan bersifat async', async () => {
    const api = createLocalApi({ adapter: memoryAdapter(seedDb()), latency: 0 });
    expect(Object.keys(api).sort()).toEqual([
      'createProject', 'createTask', 'deleteProject', 'deleteTask', 'listActivity',
      'listProjects', 'listTasks', 'listUsers', 'updateProject', 'updateTask',
    ]);
    const call = api.listProjects();
    expect(call).toBeInstanceOf(Promise);
    expect((await call).length).toBe(2);
  });

  it('mensimulasikan latensi jaringan', async () => {
    const api = createLocalApi({ adapter: memoryAdapter(seedDb()), latency: 40 });
    const start = performance.now();
    await api.listUsers();
    expect(performance.now() - start).toBeGreaterThanOrEqual(35);
  });

  it('error dari layanan diteruskan sebagai promise yang ditolak', async () => {
    const api = createLocalApi({ adapter: memoryAdapter(seedDb()), latency: 0 });
    await expect(api.listTasks('p_hantu')).rejects.toMatchObject({ status: 404 });
  });
});
