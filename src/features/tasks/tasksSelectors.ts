import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

const selectTasksState = (state: RootState) => state.tasks;

export const selectAllTasks = createSelector(
  selectTasksState,
  s => s.items,
);

export const selectNowMin = createSelector(
  selectTasksState,
  s => s.nowMin,
);

export const selectUpcomingTasks = createSelector(
  selectAllTasks,
  selectNowMin,
  (tasks, now) => tasks.filter(t => !t.done && t.start >= now),
);

export const selectTaskById = (id: string) =>
  createSelector(selectAllTasks, tasks => tasks.find(t => t.id === id));
