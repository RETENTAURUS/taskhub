import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

const adapter = createEntityAdapter();
const actor = (getState) => getState().ui.currentUserId;

export const fetchProjects = createAsyncThunk('projects/fetch', (_, { extra }) =>
  extra.api.listProjects());

export const addProject = createAsyncThunk('projects/add', (input, { extra, getState }) =>
  extra.api.createProject(input, actor(getState)));

export const editProject = createAsyncThunk('projects/edit', ({ id, patch }, { extra, getState }) =>
  extra.api.updateProject(id, patch, actor(getState)));

export const removeProject = createAsyncThunk('projects/remove', async (id, { extra, getState }) => {
  await extra.api.deleteProject(id, actor(getState));
  return id;
});

const projectsSlice = createSlice({
  name: 'projects',
  initialState: adapter.getInitialState({ status: 'idle', error: null }),
  reducers: {
    clearProjectsError: (s) => { s.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchProjects.fulfilled, (s, a) => { s.status = 'succeeded'; adapter.setAll(s, a.payload); })
      .addCase(fetchProjects.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; })
      .addCase(addProject.fulfilled, (s, a) => { adapter.addOne(s, a.payload); })
      .addCase(editProject.fulfilled, (s, a) => { adapter.upsertOne(s, a.payload); })
      .addCase(removeProject.fulfilled, (s, a) => { adapter.removeOne(s, a.payload); })
      .addMatcher(
        (a) => [addProject, editProject, removeProject].some((t) => t.rejected.match(a)),
        (s, a) => { s.error = a.error.message; },
      );
  },
});

export const { clearProjectsError } = projectsSlice.actions;
export const projectsSelectors = adapter.getSelectors((state) => state.projects);
export default projectsSlice.reducer;
