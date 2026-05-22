import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { tasksReducer } from '../features/tasks';
import { plannerReducer } from '../features/planner';
import { uiReducer } from '../features/ui';
import { inboxReducer } from '../features/inbox';
import { baseApi } from './api/baseApi';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    planner: plannerReducer,
    ui: uiReducer,
    inbox: inboxReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: getDefault => getDefault().concat(baseApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
