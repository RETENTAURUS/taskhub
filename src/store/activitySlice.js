import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchActivity = createAsyncThunk('activity/fetch', (projectId, { extra }) =>
  extra.api.listActivity(projectId));

const activitySlice = createSlice({
  name: 'activity',
  initialState: { items: [], projectId: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivity.pending, (s, a) => {
        if (s.projectId !== a.meta.arg) s.items = [];
        s.projectId = a.meta.arg;
        s.status = 'loading';
        s.error = null;
      })
      .addCase(fetchActivity.fulfilled, (s, a) => {
        if (a.meta.arg !== s.projectId) return;        // respons basi dari proyek lain
        s.status = 'succeeded';
        s.items = a.payload;
      })
      .addCase(fetchActivity.rejected, (s, a) => {
        if (a.meta.arg !== s.projectId) return;
        s.status = 'failed';
        s.error = a.error.message;
      });
  },
});

export default activitySlice.reducer;
