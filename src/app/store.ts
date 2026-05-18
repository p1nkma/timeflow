import { configureStore } from '@reduxjs/toolkit';
import { tasksReducer } from '../features/tasks';
import { plannerReducer } from '../features/planner';
import { uiReducer } from '../features/ui';
import { inboxReducer } from '../features/inbox';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    planner: plannerReducer,
    ui: uiReducer,
    inbox: inboxReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
