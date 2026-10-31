import { describe, expect, it } from 'vitest';
import { makeApi } from '../test/utils.jsx';
import { createStore } from './index.js';
import { DEFAULT_FILTERS, resetFilters, setCurrentUser, setFilter, setSort } from './uiSlice.js';
import { fetchUsers } from './usersSlice.js';

describe('uiSlice', () => {
  const store = () => createStore({ api: makeApi() });

  it('state awal', () => {
    const s = store().getState().ui;
    expect(s.filters).toEqual(DEFAULT_FILTERS);
    expect(s.sort).toEqual({ by: 'createdAt', dir: 'asc' });
  });

  it('setFilter hanya mengubah satu kunci; resetFilters mengembalikan semua', () => {
    const st = store();
    st.dispatch(setFilter({ key: 'status', value: 'done' }));
    st.dispatch(setFilter({ key: 'search', value: 'abc' }));
    expect(st.getState().ui.filters).toMatchObject({ status: 'done', search: 'abc', priority: 'all' });
    st.dispatch(resetFilters());
    expect(st.getState().ui.filters).toEqual(DEFAULT_FILTERS);
  });

  it('setSort menggabung sebagian (hanya dir atau hanya by)', () => {
    const st = store();
    st.dispatch(setSort({ dir: 'desc' }));
    st.dispatch(setSort({ by: 'title' }));
    expect(st.getState().ui.sort).toEqual({ by: 'title', dir: 'desc' });
  });

  it('pengguna tersimpan yang tidak dikenal server diganti ke pengguna pertama', async () => {
    const st = store();
    st.dispatch(setCurrentUser('u_hantu'));
    await st.dispatch(fetchUsers());
    expect(st.getState().ui.currentUserId).toBe('u_ayu');
  });

  it('pengguna valid dipertahankan', async () => {
    const st = store();
    st.dispatch(setCurrentUser('u_dewi'));
    await st.dispatch(fetchUsers());
    expect(st.getState().ui.currentUserId).toBe('u_dewi');
  });

  it('gagal memuat pengguna -> status failed', async () => {
    const st = createStore({ api: { listUsers: async () => { throw new Error('mati'); } } });
    await st.dispatch(fetchUsers());
    expect(st.getState().users).toMatchObject({ status: 'failed', error: 'mati' });
  });
});
