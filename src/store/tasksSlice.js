import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { fetchActivity } from './activitySlice.js';

const adapter = createEntityAdapter();
const actor = (getState) => getState().ui.currentUserId;

// ---------------------------------------------------------------- thunks (async)

export const fetchTasks = createAsyncThunk('tasks/fetch', (projectId, { extra }) =>
  extra.api.listTasks(projectId));

export const addTask = createAsyncThunk('tasks/add', async ({ projectId, input }, { extra, getState, dispatch }) => {
  const task = await extra.api.createTask(projectId, input, actor(getState));
  dispatch(fetchActivity(projectId));
  return task;
});

/**
 * Update dengan *optimistic update*: UI langsung berubah saat thunk dimulai
 * (pending), lalu dikembalikan (rollback) bila server menolak (rejected).
 */
export const editTask = createAsyncThunk('tasks/edit', async ({ id, patch }, { extra, getState, dispatch }) => {
  const task = await extra.api.updateTask(id, patch, actor(getState));
  dispatch(fetchActivity(task.projectId));
  return task;
});

export const removeTask = createAsyncThunk('tasks/remove', async (id, { extra, getState, dispatch }) => {
  const projectId = getState().tasks.entities[id]?.projectId;
  await extra.api.deleteTask(id, actor(getState));
  if (projectId) dispatch(fetchActivity(projectId));
  return id;
});

// ------------------------------------------------------------------------ slice

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: adapter.getInitialState({
    status: 'idle',      // idle | loading | succeeded | failed  (khusus pengambilan data)
    error: null,
    projectId: null,
    snapshots: {},       // requestId -> task sebelum optimistic update
  }),
  reducers: {
    clearTasksError: (s) => { s.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (s, a) => {
        if (s.projectId !== a.meta.arg) adapter.removeAll(s);
        s.projectId = a.meta.arg;
        s.status = 'loading';
        s.error = null;
      })
      .addCase(fetchTasks.fulfilled, (s, a) => {
        if (a.meta.arg !== s.projectId) return;     // respons basi dari proyek lain: abaikan
        s.status = 'succeeded';
        adapter.setAll(s, a.payload);
      })
      .addCase(fetchTasks.rejected, (s, a) => {
        if (a.meta.arg !== s.projectId) return;
        s.status = 'failed';
        s.error = a.error.message;
      })
      .addCase(addTask.fulfilled, (s, a) => { adapter.addOne(s, a.payload); })
      .addCase(editTask.pending, (s, a) => {
        const { id, patch } = a.meta.arg;
        const current = s.entities[id];
        if (!current) return;
        s.snapshots[a.meta.requestId] = { ...current };
        adapter.updateOne(s, { id, changes: patch });
      })
      .addCase(editTask.fulfilled, (s, a) => {
        delete s.snapshots[a.meta.requestId];
        adapter.upsertOne(s, a.payload);
      })
      .addCase(editTask.rejected, (s, a) => {
        const snapshot = s.snapshots[a.meta.requestId];
        if (snapshot) adapter.upsertOne(s, snapshot);   // rollback
        delete s.snapshots[a.meta.requestId];
        s.error = a.error.message;
      })
      .addCase(removeTask.fulfilled, (s, a) => { adapter.removeOne(s, a.payload); })
      .addMatcher(
        (a) => addTask.rejected.match(a) || removeTask.rejected.match(a),
        (s, a) => { s.error = a.error.message; },
      );
  },
});

export const { clearTasksError } = tasksSlice.actions;
export const tasksSelectors = adapter.getSelectors((state) => state.tasks);
export default tasksSlice.reducer;
