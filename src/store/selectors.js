import { createSelector } from '@reduxjs/toolkit';
import { STATUSES } from '../constants.js';
import { tasksSelectors } from './tasksSlice.js';

const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3 };

export const selectFilters = (state) => state.ui.filters;
export const selectSort = (state) => state.ui.sort;
export const selectCurrentUserId = (state) => state.ui.currentUserId;

/** Menyaring task. Fungsi murni agar mudah diuji. */
export function filterTasks(tasks, { status, priority, assigneeId, search }) {
  const q = search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (status !== 'all' && t.status !== status) return false;
    if (priority !== 'all' && t.priority !== priority) return false;
    if (assigneeId === 'none' && t.assigneeId) return false;
    if (assigneeId !== 'all' && assigneeId !== 'none' && t.assigneeId !== assigneeId) return false;
    if (q && !`${t.title} ${t.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/**
 * Mengurutkan task (tidak mengubah array asli).
 * Tenggat kosong selalu di akhir; seri diselesaikan dengan createdAt lalu id
 * supaya urutan stabil dan deterministik.
 */
export function sortTasks(tasks, { by, dir }) {
  const sign = dir === 'desc' ? -1 : 1;
  const tie = (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  return tasks.slice().sort((a, b) => {
    if (by === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return tie(a, b);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return sign * a.dueDate.localeCompare(b.dueDate) || tie(a, b);
    }
    let cmp = 0;
    if (by === 'priority') cmp = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    else if (by === 'title') cmp = a.title.localeCompare(b.title, 'id', { sensitivity: 'base' });
    else cmp = a.createdAt.localeCompare(b.createdAt);
    return sign * cmp || tie(a, b);
  });
}

export const selectVisibleTasks = createSelector(
  [tasksSelectors.selectAll, selectFilters, selectSort],
  (tasks, filters, sort) => sortTasks(filterTasks(tasks, filters), sort),
);

export const selectVisibleByStatus = createSelector([selectVisibleTasks], (tasks) =>
  Object.fromEntries(STATUSES.map((s) => [s, tasks.filter((t) => t.status === s)])));

export const selectTaskCounts = createSelector([tasksSelectors.selectAll], (tasks) => ({
  total: tasks.length,
  ...Object.fromEntries(STATUSES.map((s) => [s, tasks.filter((t) => t.status === s).length])),
}));
