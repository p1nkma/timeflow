import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ToastState } from '../../../shared/types';

interface UIState {
  darkMode: boolean;
  toast: ToastState | null;
}

const initialState: UIState = {
  darkMode: localStorage.getItem('tf.dark') === '1',
  toast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem('tf.dark', state.darkMode ? '1' : '0');
      document.documentElement.classList.toggle('dark', state.darkMode);
    },
    showToast(state, action: PayloadAction<Pick<ToastState, 'message' | 'variant'>>) {
      state.toast = { ...action.payload, id: Date.now() };
    },
    clearToast(state) {
      state.toast = null;
    },
  },
});

export const { toggleDarkMode, showToast, clearToast } = uiSlice.actions;
export default uiSlice.reducer;
