import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/core.js';
import { makeApi } from '../test/utils.jsx';
import { createStore } from './index.js';
import { clearTasksError, addTask, editTask, fetchTasks, removeTask, tasksSelectors } from './tasksSlice.js';
import { fetchActivity } from './activitySlice.js';

const setup = (api = makeApi()) => ({ api, store: createStore({ api }) });
const tasks = (store) => tasksSelectors.selectAll(store.getState());
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe('fetchTasks', () => {
  it('status idle -> loading -> succeeded dan mengisi task', async () => {
    const { store } = setup();
    expect(store.getState().tasks.status).toBe('idle');
    const promise = store.dispatch(fetchTasks('p_web'));
    expect(store.getState().tasks.status).toBe('loading');
    await promise;
    expect(store.getState().tasks.status).toBe('succeeded');
    expect(tasks(store)).toHaveLength(3);
  });

  it('gagal -> status failed + pesan error', async () => {
    const { store } = setup();
    await store.dispatch(fetchTasks('p_tidak_ada'));
    expect(store.getState().tasks).toMatchObject({ status: 'failed', error: 'Proyek tidak ditemukan' });
  });

  it('respons basi dari proyek sebelumnya diabaikan (race condition)', async () => {
    const real = makeApi();
    const slow = { ...real, listTasks: async (id) => { if (id === 'p_web') await delay(30); return real.listTasks(id); } };
    const { store } = setup(slow);
    const first = store.dispatch(fetchTasks('p_web'));        // lambat
    await store.dispatch(fetchTasks('p_skripsi'));            // cepat, pengguna sudah pindah
    await first;
    expect(tasks(store).map((t) => t.projectId)).toEqual(['p_skripsi']);
  });
});

describe('addTask', () => {
  it('menambah task dan mencatat aktivitas', async () => {
    const { store, api } = setup();
    await store.dispatch(fetchTasks('p_web'));
    await store.dispatch(addTask({ projectId: 'p_web', input: { title: 'Baru' } }));
    expect(tasks(store)).toHaveLength(4);
    const log = await api.listActivity('p_web');
    expect(log[0]).toMatchObject({ userName: 'Ayu', text: 'menambahkan task "Baru"' });
  });

  it('memakai pengguna aktif dari state ui', async () => {
    const { store, api } = setup();
    store.dispatch({ type: 'ui/setCurrentUser', payload: 'u_budi' });
    await store.dispatch(addTask({ projectId: 'p_web', input: { title: 'Dari Budi' } }));
    expect((await api.listActivity('p_web'))[0].userName).toBe('Budi');
  });

  it('validasi gagal -> error tersimpan, task tidak bertambah, bisa dihapus', async () => {
    const { store } = setup();
    await store.dispatch(fetchTasks('p_web'));
    await store.dispatch(addTask({ projectId: 'p_web', input: { title: '' } }));
    expect(tasks(store)).toHaveLength(3);
    expect(store.getState().tasks.error).toMatch(/wajib/);
    store.dispatch(clearTasksError());
    expect(store.getState().tasks.error).toBeNull();
  });
});

describe('editTask (optimistic update)', () => {
  it('UI langsung berubah sebelum server menjawab, lalu dikonfirmasi', async () => {
    const { store } = setup();
    await store.dispatch(fetchTasks('p_web'));
    const promise = store.dispatch(editTask({ id: 't_3', patch: { status: 'done' } }));
    expect(store.getState().tasks.entities.t_3.status).toBe('done');      // sebelum await
    await promise;
    expect(store.getState().tasks.entities.t_3.status).toBe('done');
    expect(store.getState().tasks.snapshots).toEqual({});
  });

  it('server menolak -> dikembalikan (rollback) dan error diisi', async () => {
    const real = makeApi();
    const failing = { ...real, updateTask: async () => { await delay(10); throw new ApiError(500, 'Server error'); } };
    const { store } = setup(failing);
    await store.dispatch(fetchTasks('p_web'));
    const promise = store.dispatch(editTask({ id: 't_3', patch: { status: 'done' } }));
    expect(store.getState().tasks.entities.t_3.status).toBe('done');      // optimistic
    await promise;
    expect(store.getState().tasks.entities.t_3.status).toBe('todo');      // rollback
    expect(store.getState().tasks.error).toBe('Server error');
    expect(store.getState().tasks.snapshots).toEqual({});
  });

  it('mengedit judul lewat patch dan mencatat aktivitas perpindahan status', async () => {
    const { store, api } = setup();
    await store.dispatch(fetchTasks('p_web'));
    await store.dispatch(editTask({ id: 't_2', patch: { status: 'done' } }));
    expect((await api.listActivity('p_web'))[0].text).toMatch(/dari In Progress ke Done/);
  });
});

describe('removeTask', () => {
  it('menghapus task dari state', async () => {
    const { store } = setup();
    await store.dispatch(fetchTasks('p_web'));
    await store.dispatch(removeTask('t_1'));
    expect(tasks(store).map((t) => t.id)).not.toContain('t_1');
  });

  it('gagal menghapus (task sudah hilang di server) -> error, state tak berubah', async () => {
    const { store, api } = setup();
    await store.dispatch(fetchTasks('p_web'));
    await api.deleteTask('t_1', 'u_ayu');                     // dihapus pengguna lain
    await store.dispatch(removeTask('t_1'));
    expect(store.getState().tasks.error).toBe('Task tidak ditemukan');
    expect(tasks(store)).toHaveLength(3);
  });
});

describe('fetchActivity', () => {
  it('mengabaikan respons basi', async () => {
    const real = makeApi();
    const slow = { ...real, listActivity: async (id) => { if (id === 'p_web') await delay(30); return real.listActivity(id); } };
    const { store } = setup(slow);
    const a = store.dispatch(fetchActivity('p_web'));
    await store.dispatch(fetchActivity('p_skripsi'));
    await a;
    expect(store.getState().activity.projectId).toBe('p_skripsi');
  });
});
