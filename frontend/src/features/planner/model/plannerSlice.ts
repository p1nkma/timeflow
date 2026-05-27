import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { PlannerSettings, CategoryKey, ChronoType } from '../../../shared/types';
import { toMin } from '../../../shared/utils/time';

const initialState: PlannerSettings = {
  chronotype: 'lark',
  workStart: toMin(8),
  workEnd: toMin(22),
  breakDuration: 15,
  enabledCategories: ['study', 'code', 'freelance', 'sport', 'reading'],
};

const plannerSlice = createSlice({
  name: 'planner',
  initialState,
  reducers: {
    setChronotype(state, action: PayloadAction<ChronoType>) {
      state.chronotype = action.payload;
    },
    setWorkHours(state, action: PayloadAction<{ start: number; end: number }>) {
      state.workStart = action.payload.start;
      state.workEnd = action.payload.end;
    },
    toggleCategory(state, action: PayloadAction<CategoryKey>) {
      const cat = action.payload;
      const idx = state.enabledCategories.indexOf(cat);
      if (idx === -1) state.enabledCategories.push(cat);
      else state.enabledCategories.splice(idx, 1);
    },
  },
});

export const { setChronotype, setWorkHours, toggleCategory } = plannerSlice.actions;
export default plannerSlice.reducer;
