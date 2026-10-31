import { createSlice } from '@reduxjs/toolkit';
import { fetchUsers } from './usersSlice.js';

export const USER_STORAGE_KEY = 'taskhub:user';
export const DEFAULT_FILTERS = { status: 'all', priority: 'all', assigneeId: 'all', search: '' };
export const DEFAULT_SORT = { by: 'createdAt', dir: 'asc' };

function storedUser() {
  try {
    return globalThis.localStorage?.getItem(USER_STORAGE_KEY) || 'u_ayu';
  } catch {
    return 'u_ayu';
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: () => ({
    currentUserId: storedUser(),
    filters: { ...DEFAULT_FILTERS },
    sort: { ...DEFAULT_SORT },
  }),
  reducers: {
    setCurrentUser: (s, a) => { s.currentUserId = a.payload; },
    setFilter: (s, a) => { s.filters[a.payload.key] = a.payload.value; },
    resetFilters: (s) => { s.filters = { ...DEFAULT_FILTERS }; },
    setSort: (s, a) => { s.sort = { ...s.sort, ...a.payload }; },
  },
  extraReducers: (builder) => {
    // Jika pengguna tersimpan tidak dikenal server, pakai pengguna pertama.
    builder.addCase(fetchUsers.fulfilled, (s, a) => {
      if (a.payload.length && !a.payload.some((u) => u.id === s.currentUserId)) {
        s.currentUserId = a.payload[0].id;
      }
    });
  },
});

export const { setCurrentUser, setFilter, resetFilters, setSort } = uiSlice.actions;
export default uiSlice.reducer;
