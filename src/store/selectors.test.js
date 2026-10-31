import { describe, expect, it } from 'vitest';
import { makeApi } from '../test/utils.jsx';
import { createStore } from './index.js';
import { filterTasks, selectTaskCounts, selectVisibleByStatus, selectVisibleTasks, sortTasks } from './selectors.js';
import { fetchTasks } from './tasksSlice.js';
import { resetFilters, setFilter, setSort } from './uiSlice.js';

const T = (id, o = {}) => ({
  id, projectId: 'p', title: id, description: '', status: 'todo', priority: 'medium',
  assigneeId: null, dueDate: null, createdAt: '2026-01-01T00:00:00Z', ...o,
});
const ids = (list) => list.map((t) => t.id);
const ALL = { status: 'all', priority: 'all', assigneeId: 'all', search: '' };

describe('filterTasks', () => {
  const list = [
    T('a', { status: 'done', priority: 'high', assigneeId: 'u1', title: 'Desain Logo' }),
    T('b', { status: 'todo', priority: 'low', assigneeId: 'u2', description: 'logo baru' }),
    T('c', { status: 'todo', priority: 'high' }),
  ];
  it('tanpa filter mengembalikan semua', () => expect(ids(filterTasks(list, ALL))).toEqual(['a', 'b', 'c']));
  it('berdasarkan status', () => expect(ids(filterTasks(list, { ...ALL, status: 'todo' }))).toEqual(['b', 'c']));
  it('berdasarkan prioritas', () => expect(ids(filterTasks(list, { ...ALL, priority: 'high' }))).toEqual(['a', 'c']));
  it('berdasarkan penanggung jawab', () => expect(ids(filterTasks(list, { ...ALL, assigneeId: 'u2' }))).toEqual(['b']));
  it('"none" = belum ditugaskan', () => expect(ids(filterTasks(list, { ...ALL, assigneeId: 'none' }))).toEqual(['c']));
  it('pencarian tidak peka huruf besar, mencakup judul dan deskripsi', () =>
    expect(ids(filterTasks(list, { ...ALL, search: ' LOGO ' }))).toEqual(['a', 'b']));
  it('filter digabung (AND)', () =>
    expect(ids(filterTasks(list, { ...ALL, status: 'todo', priority: 'high' }))).toEqual(['c']));
  it('tidak ada yang cocok -> array kosong', () => expect(filterTasks(list, { ...ALL, search: 'zzz' })).toEqual([]));
  it('input kosong', () => expect(filterTasks([], ALL)).toEqual([]));
});

describe('sortTasks', () => {
  it('judul A-Z dan Z-A (tidak peka huruf besar/kecil)', () => {
    const l = [T('x', { title: 'banana' }), T('y', { title: 'Apel' }), T('z', { title: 'cherry' })];
    expect(ids(sortTasks(l, { by: 'title', dir: 'asc' }))).toEqual(['y', 'x', 'z']);
    expect(ids(sortTasks(l, { by: 'title', dir: 'desc' }))).toEqual(['z', 'x', 'y']);
  });

  it('prioritas: low < medium < high', () => {
    const l = [T('m', { priority: 'medium' }), T('h', { priority: 'high' }), T('l', { priority: 'low' })];
    expect(ids(sortTasks(l, { by: 'priority', dir: 'asc' }))).toEqual(['l', 'm', 'h']);
    expect(ids(sortTasks(l, { by: 'priority', dir: 'desc' }))).toEqual(['h', 'm', 'l']);
  });

  it('tenggat: yang tanpa tenggat selalu di akhir, baik naik maupun turun', () => {
    const l = [T('none'), T('late', { dueDate: '2026-12-01' }), T('soon', { dueDate: '2026-02-01' })];
    expect(ids(sortTasks(l, { by: 'dueDate', dir: 'asc' }))).toEqual(['soon', 'late', 'none']);
    expect(ids(sortTasks(l, { by: 'dueDate', dir: 'desc' }))).toEqual(['late', 'soon', 'none']);
  });

  it('tenggat kosong di akhir untuk SEMUA urutan input (komparator konsisten)', () => {
    const items = [T('n1'), T('n2'), T('d1', { dueDate: '2026-01-01' }), T('d2', { dueDate: '2026-06-01' })];
    const permutations = (arr) => (arr.length <= 1 ? [arr]
      : arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((r) => [x, ...r])));
    for (const p of permutations(items)) {
      expect(ids(sortTasks(p, { by: 'dueDate', dir: 'asc' }))).toEqual(['d1', 'd2', 'n1', 'n2']);
      expect(ids(sortTasks(p, { by: 'dueDate', dir: 'desc' }))).toEqual(['d2', 'd1', 'n1', 'n2']);
    }
  });

  it('tanggal dibuat', () => {
    const l = [T('b', { createdAt: '2026-02-01' }), T('a', { createdAt: '2026-01-01' })];
    expect(ids(sortTasks(l, { by: 'createdAt', dir: 'asc' }))).toEqual(['a', 'b']);
  });

  it('seri diselesaikan stabil (createdAt lalu id), bukan acak', () => {
    const l = [T('b', { priority: 'high' }), T('a', { priority: 'high' }), T('c', { priority: 'high' })];
    expect(ids(sortTasks(l, { by: 'priority', dir: 'asc' }))).toEqual(['a', 'b', 'c']);
    expect(ids(sortTasks(l, { by: 'priority', dir: 'desc' }))).toEqual(['a', 'b', 'c']);
  });

  it('tidak mengubah array asli; array kosong aman', () => {
    const l = [T('b', { title: 'b' }), T('a', { title: 'a' })];
    sortTasks(l, { by: 'title', dir: 'asc' });
    expect(ids(l)).toEqual(['b', 'a']);
    expect(sortTasks([], { by: 'title', dir: 'asc' })).toEqual([]);
  });
});

describe('selector terhubung ke store', () => {
  const load = async () => {
    const store = createStore({ api: makeApi() });
    await store.dispatch(fetchTasks('p_web'));
    return store;
  };

  it('selectVisibleByStatus mengelompokkan ke 3 kolom', async () => {
    const store = await load();
    const g = selectVisibleByStatus(store.getState());
    expect(Object.keys(g)).toEqual(['todo', 'in_progress', 'done']);
    expect(ids(g.done)).toEqual(['t_1']);
  });

  it('mengikuti perubahan filter dan sort di ui state', async () => {
    const store = await load();
    store.dispatch(setFilter({ key: 'priority', value: 'high' }));
    expect(ids(selectVisibleTasks(store.getState()))).toEqual(['t_1']);
    store.dispatch(resetFilters());
    store.dispatch(setSort({ by: 'title', dir: 'desc' }));
    expect(ids(selectVisibleTasks(store.getState()))).toEqual(['t_3', 't_1', 't_2']);   // Tulis, Rancang, Implementasi
  });

  it('selectTaskCounts tidak terpengaruh filter dan di-memoize', async () => {
    const store = await load();
    store.dispatch(setFilter({ key: 'status', value: 'done' }));
    const a = selectTaskCounts(store.getState());
    expect(a).toEqual({ total: 3, todo: 1, in_progress: 1, done: 1 });
    expect(selectTaskCounts(store.getState())).toBe(a);        // referensi sama = memoization
  });
});
