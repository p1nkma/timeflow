import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task } from '../../../shared/types';
import { findFreeSlot, nowMinutes } from '../../../shared/utils/time';
import { MOCK_TASKS } from '../../../mocks/tasks';

interface TasksState {
  items: Task[];
  nowMin: number;
}

const initialState: TasksState = {
  items: import.meta.env.DEV ? MOCK_TASKS : [],
  nowMin: nowMinutes(),
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setNowMin(state, action: PayloadAction<number>) {
      state.nowMin = action.payload;
    },
    toggleTask(state, action: PayloadAction<string>) {
      const task = state.items.find(t => t.id === action.payload);
      if (task && !task.locked) task.done = !task.done;
    },
    updateTask(state, action: PayloadAction<Task>) {
      const idx = state.items.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    deleteTask(state, action: PayloadAction<string>) {
      state.items = state.items.filter(t => t.id !== action.payload);
    },
    // Убирает задачу из расписания (компонент отдельно кладёт её в Inbox)
    removeFromSchedule(state, action: PayloadAction<string>) {
      state.items = state.items.filter(t => t.id !== action.payload);
    },
    addTask(state, action: PayloadAction<Omit<Task, 'id' | 'done'> & { id?: string; done?: boolean }>) {
      const id = action.payload.id ?? `t${Date.now()}`;
      state.items.push({
        done: false,
        ...action.payload,
        id,
      });
    },
    reorderTask(state, action: PayloadAction<{ id: string; newStart: number }>) {
      const task = state.items.find(t => t.id === action.payload.id);
      if (task) {
        const dur = task.end - task.start;
        task.start = action.payload.newStart;
        task.end = action.payload.newStart + dur;
        task.overdue = false;
      }
    },
    // Сдвигает задачу на момент nowMin сохраняя длительность
    startTaskNow(state, action: PayloadAction<{ id: string; nowMin: number }>) {
      const task = state.items.find(t => t.id === action.payload.id);
      if (task && !task.locked) {
        const dur = task.end - task.start;
        task.start = action.payload.nowMin;
        task.end   = action.payload.nowMin + dur;
        task.overdue = false;
      }
    },
    // Сдвигает просроченную задачу на ближайший свободный слот после nowMin
    rescheduleTask(state, action: PayloadAction<{ id: string; nowMin: number }>) {
      const task = state.items.find(t => t.id === action.payload.id);
      if (task && !task.locked) {
        const dur  = task.end - task.start;
        const busy = state.items.filter(t => t.id !== task.id && !t.done);
        const newStart = findFreeSlot(busy, dur, action.payload.nowMin, 23 * 60);
        task.start   = newStart;
        task.end     = newStart + dur;
        task.overdue = false;
      }
    },
    moveTaskToDate(state, action: PayloadAction<{ id: string; date: string; newStart: number }>) {
      const task = state.items.find(t => t.id === action.payload.id);
      if (task && !task.locked) {
        const dur = task.end - task.start;
        task.date  = action.payload.date;
        task.start = action.payload.newStart;
        task.end   = action.payload.newStart + dur;
        task.overdue = false;
      }
    },
    // Переносит задачу в конец дня (20:00+) или на ближайший свободный вечерний слот
    moveTaskToEvening(state, action: PayloadAction<string>) {
      const task = state.items.find(t => t.id === action.payload);
      if (!task || task.locked) return;
      const EVENING_START = 20 * 60; // 20:00
      const dur = task.end - task.start;
      // Найти конец последней задачи после 20:00
      const eveningTasks = state.items
        .filter(t => t.id !== task.id && t.start >= EVENING_START)
        .sort((a, b) => a.start - b.start);
      const newStart = eveningTasks.length > 0
        ? eveningTasks[eveningTasks.length - 1].end
        : EVENING_START;
      task.start   = newStart;
      task.end     = newStart + dur;
      task.overdue = false;
    },
  },
});

export const { setNowMin, toggleTask, updateTask, deleteTask, addTask, reorderTask, startTaskNow, rescheduleTask, moveTaskToEvening, removeFromSchedule, moveTaskToDate } = tasksSlice.actions;
export default tasksSlice.reducer;
