import { beforeEach, describe, expect, it } from 'vitest';
import { memoryAdapter, localStorageAdapter } from './adapters.js';
import { ApiError, cleanTaskInput, createService, emptyDb, seedDb } from './core.js';

const AYU = 'u_ayu';
let tick;
const now = () => `2026-01-01T00:00:${String(tick++).padStart(2, '0')}.000Z`;
let svc;
let adapter;

beforeEach(() => {
  tick = 0;
  adapter = memoryAdapter(emptyDb());
  svc = createService(adapter, { now });
});

const rejects = async (promise, status, pattern) => {
  const err = await promise.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.status).toBe(status);
  if (pattern) expect(err.message).toMatch(pattern);
};

describe('proyek', () => {
  it('membuat proyek dan memasukkan pembuat sebagai anggota', async () => {
    const p = await svc.createProject({ name: '  Proyek A  ' }, AYU);
    expect(p).toMatchObject({ name: 'Proyek A', memberIds: [AYU], stats: { total: 0, done: 0 } });
  });

  it('menolak nama kosong, terlalu panjang, atau bukan teks', async () => {
    await rejects(svc.createProject({ name: '   ' }, AYU), 422, /wajib/);
    await rejects(svc.createProject({ name: 'x'.repeat(61) }, AYU), 422, /maksimal 60/);
    await rejects(svc.createProject({ name: 42 }, AYU), 422, /teks/);
  });

  it('menolak anggota yang tidak dikenal', async () => {
    await rejects(svc.createProject({ name: 'A', memberIds: ['u_hantu'] }, AYU), 422, /tidak dikenal/);
  });

  it('menolak pengguna tak dikenal (401)', async () => {
    await rejects(svc.createProject({ name: 'A' }, 'u_hantu'), 401);
    await rejects(svc.createProject({ name: 'A' }, undefined), 401);
  });

  it('daftar proyek diurutkan dari yang terbaru dan memuat statistik', async () => {
    const a = await svc.createProject({ name: 'Lama' }, AYU);
    const b = await svc.createProject({ name: 'Baru' }, AYU);
    const t = await svc.createTask(a.id, { title: 'x' }, AYU);
    await svc.updateTask(t.id, { status: 'done' }, AYU);
    const list = await svc.listProjects();
    expect(list.map((p) => p.name)).toEqual(['Baru', 'Lama']);
    expect(list.find((p) => p.id === a.id).stats).toEqual({ total: 1, done: 1 });
    expect(list.find((p) => p.id === b.id).stats).toEqual({ total: 0, done: 0 });
  });

  it('mengubah proyek (parsial) dan 404 untuk id tak dikenal', async () => {
    const p = await svc.createProject({ name: 'A', description: 'd' }, AYU);
    const upd = await svc.updateProject(p.id, { name: 'B' }, AYU);
    expect(upd).toMatchObject({ name: 'B', description: 'd' });
    await rejects(svc.updateProject('p_x', { name: 'B' }, AYU), 404);
  });

  it('tidak boleh mengeluarkan anggota yang masih punya task', async () => {
    const p = await svc.createProject({ name: 'A', memberIds: [AYU, 'u_budi'] }, AYU);
    await svc.createTask(p.id, { title: 'x', assigneeId: 'u_budi' }, AYU);
    await rejects(svc.updateProject(p.id, { memberIds: [AYU] }, AYU), 422, /ditugaskan/);
  });

  it('menghapus satu proyek tidak menyentuh data proyek lain', async () => {
    const a = await svc.createProject({ name: 'A' }, AYU);
    const b = await svc.createProject({ name: 'B' }, AYU);
    await svc.createTask(a.id, { title: 'a1' }, AYU);
    await svc.createTask(b.id, { title: 'b1' }, AYU);
    await svc.deleteProject(a.id, AYU);
    expect((await svc.listTasks(b.id)).map((t) => t.title)).toEqual(['b1']);
    expect(await svc.listActivity(b.id)).toHaveLength(2);
  });

  it('menghapus proyek ikut menghapus task dan aktivitasnya (cascade)', async () => {
    const p = await svc.createProject({ name: 'A' }, AYU);
    await svc.createTask(p.id, { title: 'x' }, AYU);
    await svc.deleteProject(p.id, AYU);
    const stored = adapter.load();                       // periksa penyimpanan, bukan hanya API
    expect(stored.tasks).toEqual([]);
    expect(stored.activity).toEqual([]);
    expect(await svc.listProjects()).toEqual([]);
    await rejects(svc.listTasks(p.id), 404);
    await rejects(svc.deleteProject(p.id, AYU), 404);
  });
});

describe('task', () => {
  let project;
  beforeEach(async () => {
    project = await svc.createProject({ name: 'P', memberIds: [AYU, 'u_budi'] }, AYU);
  });

  it('membuat task dengan nilai bawaan', async () => {
    const t = await svc.createTask(project.id, { title: ' Tulis laporan ' }, AYU);
    expect(t).toMatchObject({
      title: 'Tulis laporan', status: 'todo', priority: 'medium', assigneeId: null, dueDate: null, projectId: project.id,
    });
    expect(await svc.listTasks(project.id)).toHaveLength(1);
  });

  it.each([
    [{ title: '' }, /wajib/],
    [{ title: 'x'.repeat(121) }, /maksimal 120/],
    [{ title: 'a', status: 'selesai' }, /Status/],
    [{ title: 'a', priority: 'urgent' }, /Prioritas/],
    [{ title: 'a', dueDate: '2026-02-30' }, /Tanggal/],
    [{ title: 'a', dueDate: '30-02-2026' }, /Tanggal/],
    [{ title: 'a', assigneeId: 'u_citra' }, /anggota proyek/],
  ])('menolak input tidak valid %j', async (input, pattern) => {
    await rejects(svc.createTask(project.id, input, AYU), 422, pattern);
  });

  it('menerima tanggal valid (termasuk 29 Februari tahun kabisat)', async () => {
    const t = await svc.createTask(project.id, { title: 'a', dueDate: '2028-02-29' }, AYU);
    expect(t.dueDate).toBe('2028-02-29');
  });

  it('task untuk proyek tak dikenal -> 404', async () => {
    await rejects(svc.createTask('p_x', { title: 'a' }, AYU), 404);
  });

  it('update parsial tidak mewajibkan judul dan memperbarui updatedAt', async () => {
    const t = await svc.createTask(project.id, { title: 'a' }, AYU);
    const upd = await svc.updateTask(t.id, { priority: 'high' }, AYU);
    expect(upd).toMatchObject({ title: 'a', priority: 'high' });
    expect(upd.updatedAt > t.updatedAt).toBe(true);
  });

  it('update memvalidasi nilai dan penanggung jawab', async () => {
    const t = await svc.createTask(project.id, { title: 'a' }, AYU);
    await rejects(svc.updateTask(t.id, { status: 'x' }, AYU), 422);
    await rejects(svc.updateTask(t.id, { assigneeId: 'u_citra' }, AYU), 422);
    await rejects(svc.updateTask('t_x', { title: 'b' }, AYU), 404);
  });

  it('boleh mengosongkan penanggung jawab dan tenggat', async () => {
    const t = await svc.createTask(project.id, { title: 'a', assigneeId: 'u_budi', dueDate: '2026-05-01' }, AYU);
    const upd = await svc.updateTask(t.id, { assigneeId: '', dueDate: '' }, AYU);
    expect(upd).toMatchObject({ assigneeId: null, dueDate: null });
  });

  it('menghapus task', async () => {
    const t = await svc.createTask(project.id, { title: 'a' }, AYU);
    expect(await svc.deleteTask(t.id, AYU)).toEqual({ id: t.id });
    expect(await svc.listTasks(project.id)).toEqual([]);
    await rejects(svc.deleteTask(t.id, AYU), 404);
  });

  it('hasil service tidak berbagi referensi dengan penyimpanan', async () => {
    const t = await svc.createTask(project.id, { title: 'a' }, AYU);
    t.title = 'DIUBAH DARI LUAR';
    expect((await svc.listTasks(project.id))[0].title).toBe('a');
  });
});

describe('aktivitas (kolaborasi)', () => {
  it('mencatat siapa melakukan apa, terbaru di atas', async () => {
    const p = await svc.createProject({ name: 'P', memberIds: [AYU, 'u_budi'] }, AYU);
    const t = await svc.createTask(p.id, { title: 'Desain' }, AYU);
    await svc.updateTask(t.id, { status: 'in_progress' }, 'u_budi');
    await svc.updateTask(t.id, { priority: 'high' }, 'u_budi');
    await svc.deleteTask(t.id, AYU);
    const log = await svc.listActivity(p.id);
    expect(log.map((a) => `${a.userName}: ${a.text}`)).toEqual([
      'Ayu: menghapus task "Desain"',
      'Budi: memperbarui task "Desain"',
      'Budi: memindahkan "Desain" dari To Do ke In Progress',
      'Ayu: menambahkan task "Desain"',
      'Ayu: membuat proyek "P"',
    ]);
  });

  it('membatasi jumlah dan hanya memuat aktivitas proyek itu', async () => {
    const a = await svc.createProject({ name: 'A' }, AYU);
    const b = await svc.createProject({ name: 'B' }, AYU);
    await svc.createTask(a.id, { title: '1' }, AYU);
    await svc.createTask(a.id, { title: '2' }, AYU);
    expect(await svc.listActivity(a.id, 2)).toHaveLength(2);
    expect(await svc.listActivity(b.id)).toHaveLength(1);
    await rejects(svc.listActivity('p_x'), 404);
  });
});

describe('cleanTaskInput', () => {
  it('menolak non-teks untuk deskripsi', () => {
    expect(() => cleanTaskInput({ title: 'a', description: 5 })).toThrow(ApiError);
  });
});

describe('adapters', () => {
  it('memoryAdapter terisolasi dari objek luar', () => {
    const initial = emptyDb();
    const a = memoryAdapter(initial);
    initial.projects.push({ id: 'x' });
    expect(a.load().projects).toEqual([]);
  });

  it('localStorageAdapter menyimpan dan memuat ulang', () => {
    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
    const a = localStorageAdapter(seedDb, 'k', storage);
    const db = a.load();
    db.projects = [];
    a.save(db);
    expect(localStorageAdapter(seedDb, 'k', storage).load().projects).toEqual([]);
  });

  it('data rusak di localStorage tidak membuat crash (pakai data awal)', () => {
    const storage = { getItem: () => '{rusak', setItem: () => {} };
    expect(localStorageAdapter(seedDb, 'k', storage).load().projects.length).toBeGreaterThan(0);
  });

  it('localStorage penuh/tidak tersedia -> tetap bekerja di memori', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const a = localStorageAdapter(emptyDb, 'k', storage);
    const db = a.load();
    db.projects.push({ id: 'p1' });
    a.save(db);
    expect(a.load().projects).toEqual([{ id: 'p1' }]);
    expect(localStorageAdapter(emptyDb, 'k', undefined).load().projects).toEqual([]);
  });
});
