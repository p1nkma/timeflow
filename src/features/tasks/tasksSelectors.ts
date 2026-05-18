import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

const selectTasksState = (state: RootState) => state.tasks;

export const selectAllTasks = createSelector(selectTasksState, s => s.items);
export const selectNowMin   = createSelector(selectTasksState, s => s.nowMin);

export const selectCurrentTask = createSelector(
  selectAllTasks, selectNowMin,
  (tasks, now) => tasks.find(t => !t.done && !t.isBreak && t.start <= now && t.end > now) ?? null,
);

export const selectNextTask = createSelector(
  selectAllTasks, selectNowMin,
  (tasks, now) => tasks.filter(t => !t.done && !t.isBreak && t.start > now)[0] ?? null,
);

export const selectUpcomingTasks = createSelector(
  selectAllTasks, selectNowMin,
  (tasks, now) => tasks.filter(t => !t.done && !t.isBreak && t.start > now),
);

export const selectDoneTasks = createSelector(
  selectAllTasks,
  tasks => tasks.filter(t => t.done && !t.isBreak),
);

export const selectRealTasks = createSelector(
  selectAllTasks,
  tasks => tasks.filter(t => !t.isBreak),
);

export const selectTaskById = (id: string) =>
  createSelector(selectAllTasks, tasks => tasks.find(t => t.id === id));
