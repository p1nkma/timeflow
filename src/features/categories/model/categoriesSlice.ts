import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CustomCategory } from '../../../shared/types';

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: [] as CustomCategory[],
  reducers: {
    addCategory(state, action: PayloadAction<CustomCategory>) {
      state.push(action.payload);
    },
    removeCategory(state, action: PayloadAction<string>) {
      return state.filter(c => c.key !== action.payload);
    },
    updateCategory(state, action: PayloadAction<CustomCategory>) {
      const idx = state.findIndex(c => c.key === action.payload.key);
      if (idx !== -1) state[idx] = action.payload;
    },
  },
});

export const { addCategory, removeCategory, updateCategory } = categoriesSlice.actions;
export default categoriesSlice.reducer;
