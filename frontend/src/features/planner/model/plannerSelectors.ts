import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../app/store';

const selectPlannerState = (state: RootState) => state.planner;

export const selectWorkWindow = createSelector(
  selectPlannerState,
  s => ({
    startHour: Math.floor(s.workStart / 60),
    endHour:   Math.ceil(s.workEnd / 60),
    startMin:  s.workStart,
    endMin:    s.workEnd,
  }),
);

export const selectPlannerSettings = selectPlannerState;
