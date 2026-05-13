import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Page, ToastState } from '../../shared/types';

interface UIState {
  page: Page;
  darkMode: boolean;
  openTaskId: string | null;
  toast: ToastState | null;
}

const initialState: UIState = {
  page: (localStorage.getItem('tf.page') as Page) ?? 'today',
  darkMode: localStorage.getItem('tf.dark') === '1',
  openTaskId: null,
  toast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<Page>) {
      state.page = action.payload;
      localStorage.setItem('tf.page', action.payload);
    },
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem('tf.dark', state.darkMode ? '1' : '0');
      document.documentElement.classList.toggle('dark', state.darkMode);
    },
    openTask(state, action: PayloadAction<string>) {
      state.openTaskId = action.payload;
    },
    closeTask(state) {
      state.openTaskId = null;
    },
    showToast(state, action: PayloadAction<Pick<ToastState, 'message' | 'variant'>>) {
      state.toast = { ...action.payload, id: Date.now() };
    },
    clearToast(state) {
      state.toast = null;
    },
  },
});

export const { setPage, toggleDarkMode, openTask, closeTask, showToast, clearToast } = uiSlice.actions;
export default uiSlice.reducer;
