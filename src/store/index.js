import { configureStore } from '@reduxjs/toolkit';
import activity from './activitySlice.js';
import projects from './projectsSlice.js';
import tasks from './tasksSlice.js';
import ui from './uiSlice.js';
import users from './usersSlice.js';

/** `api` disuntik lewat thunk extraArgument, sehingga test cukup mengganti api. */
export function createStore({ api, preloadedState } = {}) {
  return configureStore({
    reducer: { users, projects, tasks, activity, ui },
    preloadedState,
    middleware: (getDefault) => getDefault({ thunk: { extraArgument: { api } } }),
  });
}
