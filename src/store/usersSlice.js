import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

const adapter = createEntityAdapter();

export const fetchUsers = createAsyncThunk('users/fetch', (_, { extra }) => extra.api.listUsers());

const usersSlice = createSlice({
  name: 'users',
  initialState: adapter.getInitialState({ status: 'idle', error: null }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchUsers.fulfilled, (s, a) => { s.status = 'succeeded'; adapter.setAll(s, a.payload); })
      .addCase(fetchUsers.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; });
  },
});

export const usersSelectors = adapter.getSelectors((state) => state.users);
export default usersSlice.reducer;
