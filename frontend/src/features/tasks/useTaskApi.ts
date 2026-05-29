/**
 * Optimistic Redux + API fire-and-forget mutations.
 * Redux dispatch runs immediately for instant UI; API call syncs the backend.
 * On API error the next refetch (invalidatesTags) will correct local state.
 */
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  toggleTask, updateTask, deleteTask, addTask, reorderTask,
  startTaskNow, rescheduleTask, moveTaskToEvening, removeFromSchedule, moveTaskToDate,
  setTaskItems,
} from '.';
import { addInboxItem, removeInboxItem, setInboxItems } from '../inbox';
import {
  useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation,
  useGetTasksQuery, useGetInboxQuery,
  taskToCreate, taskToUpdate, taskOutToTask, inboxOutToInboxItem, buildCatLookup,
} from './tasksApi';
import { useGetCategoriesQuery } from '../categories/categoriesApi';
import type { Task, InboxItem } from '../../shared/types';
import { getToken } from '../auth/token';
import { findFreeSlot } from '../../shared/utils/time';

function useCatIdLookup() {
  const { data: cats = [] } = useGetCategoriesQuery();
  return new Map(cats.map(c => [c.key, c.id]));
}

function useCatLookup() {
  const { data: cats = [] } = useGetCategoriesQuery();
  return buildCatLookup(cats);
}

export function useTaskApi() {
  const dispatch    = useAppDispatch();
  const catIdLookup = useCatIdLookup();
  const catLookup   = useCatLookup();
  const nowMin      = useAppSelector(s => s.tasks.nowMin);
  const isLoggedIn  = !!getToken();

  const [createTaskApi]  = useCreateTaskMutation();
  const [updateTaskApi]  = useUpdateTaskMutation();
  const [deleteTaskApi]  = useDeleteTaskMutation();

  const { data: taskOuts = [] } = useGetTasksQuery({}, { skip: !isLoggedIn });
  const { data: inboxOuts = [] } = useGetInboxQuery(undefined, { skip: !isLoggedIn });

  function refreshTasks() {
    dispatch(setTaskItems(taskOuts.map(t => taskOutToTask(t, catLookup))));
  }
  function refreshInbox() {
    dispatch(setInboxItems(inboxOuts.map(t => inboxOutToInboxItem(t, catLookup))));
  }

  // ── Toggle done ────────────────────────────────────────────────────────────

  function handleToggleTask(id: string) {
    dispatch(toggleTask(id));
    const task = taskOuts.find(t => t.id === id);
    if (task) {
      const newStatus = task.status === 'done' ? 'pending' : 'done';
      updateTaskApi({ id, data: { status: newStatus } }).catch(refreshTasks);
    }
  }

  // ── Add task (to schedule) ─────────────────────────────────────────────────

  function handleAddTask(
    payload: Omit<Task, 'id' | 'done'> & { id?: string; done?: boolean },
  ) {
    const id = payload.id ?? `t${Date.now()}`;
    dispatch(addTask({ ...payload, id }));
    createTaskApi(taskToCreate(payload, catIdLookup)).catch(refreshTasks);
    return id;
  }

  // ── Add inbox item ─────────────────────────────────────────────────────────

  function handleAddInboxItem(item: Omit<InboxItem, 'id'>) {
    const id = `i${Date.now()}`;
    dispatch(addInboxItem(item));
    createTaskApi({
      title:       item.title,
      category_id: catIdLookup.get(item.cat) ?? null,
      deadline:    item.deadline ?? null,
      urgent:      item.urgent ?? false,
    }).catch(refreshInbox);
    return id;
  }

  // ── Remove inbox item ──────────────────────────────────────────────────────

  function handleRemoveInboxItem(id: string) {
    dispatch(removeInboxItem(id));
    deleteTaskApi(id).catch(refreshInbox);
  }

  // ── Update task (full patch) ───────────────────────────────────────────────

  function handleUpdateTask(task: Task) {
    dispatch(updateTask(task));
    const today = new Date().toISOString().slice(0, 10);
    updateTaskApi({
      id: task.id,
      data: taskToUpdate({ ...task, date: task.date ?? today }, catIdLookup),
    }).catch(refreshTasks);
  }

  // ── Delete task ────────────────────────────────────────────────────────────

  function handleDeleteTask(id: string) {
    dispatch(deleteTask(id));
    deleteTaskApi(id).catch(refreshTasks);
  }

  // ── Reorder (drag-and-drop) ────────────────────────────────────────────────

  function handleReorderTask(id: string, newStart: number) {
    dispatch(reorderTask({ id, newStart }));
    const taskOut = taskOuts.find(t => t.id === id);
    const taskLocal = taskOut ? taskOutToTask(taskOut, catLookup) : null;
    if (taskLocal) {
      const dur = taskLocal.end - taskLocal.start;
      const today = new Date().toISOString().slice(0, 10);
      const date  = taskLocal.date ?? today;
      updateTaskApi({
        id,
        data: taskToUpdate({ ...taskLocal, start: newStart, end: newStart + dur, date }, catIdLookup),
      }).catch(refreshTasks);
    }
  }

  // ── Move to date ───────────────────────────────────────────────────────────

  function handleMoveTaskToDate(id: string, date: string, newStart: number) {
    dispatch(moveTaskToDate({ id, date, newStart }));
    const taskOut = taskOuts.find(t => t.id === id);
    const taskLocal = taskOut ? taskOutToTask(taskOut, catLookup) : null;
    if (taskLocal) {
      const dur = taskLocal.end - taskLocal.start;
      updateTaskApi({
        id,
        data: taskToUpdate({ ...taskLocal, date, start: newStart, end: newStart + dur }, catIdLookup),
      }).catch(refreshTasks);
    }
  }

  // ── Reschedule overdue ─────────────────────────────────────────────────────

  function handleRescheduleTask(id: string) {
    const allItems = taskOuts.map(t => taskOutToTask(t, catLookup));
    const task = allItems.find(t => t.id === id);
    if (!task || task.locked) return;
    const dur = task.end - task.start;
    const busy = allItems.filter(t => t.id !== id && !t.done);
    const newStart = findFreeSlot(busy, dur, nowMin, 23 * 60);
    dispatch(rescheduleTask({ id, nowMin }));
    const today = new Date().toISOString().slice(0, 10);
    updateTaskApi({
      id,
      data: taskToUpdate({ ...task, start: newStart, end: newStart + dur, date: task.date ?? today }, catIdLookup),
    }).catch(refreshTasks);
  }

  // ── Move to evening ────────────────────────────────────────────────────────

  function handleMoveToEvening(id: string) {
    dispatch(moveTaskToEvening(id));
    const allItems = taskOuts.map(t => taskOutToTask(t, catLookup));
    const task = allItems.find(t => t.id === id);
    if (!task || task.locked) return;
    const EVENING_START = 20 * 60;
    const dur = task.end - task.start;
    const eveningTasks = allItems
      .filter(t => t.id !== id && t.start >= EVENING_START)
      .sort((a, b) => a.start - b.start);
    const newStart = eveningTasks.length > 0
      ? eveningTasks[eveningTasks.length - 1].end
      : EVENING_START;
    const today = new Date().toISOString().slice(0, 10);
    updateTaskApi({
      id,
      data: taskToUpdate({ ...task, start: newStart, end: newStart + dur, date: task.date ?? today }, catIdLookup),
    }).catch(refreshTasks);
  }

  // ── Start task now ─────────────────────────────────────────────────────────

  function handleStartTaskNow(id: string) {
    dispatch(startTaskNow({ id, nowMin }));
    const taskOut = taskOuts.find(t => t.id === id);
    const taskLocal = taskOut ? taskOutToTask(taskOut, catLookup) : null;
    if (taskLocal) {
      const dur = taskLocal.end - taskLocal.start;
      const today = new Date().toISOString().slice(0, 10);
      updateTaskApi({
        id,
        data: taskToUpdate({ ...taskLocal, start: nowMin, end: nowMin + dur, date: taskLocal.date ?? today }, catIdLookup),
      }).catch(refreshTasks);
    }
  }

  // ── Remove from schedule (send to inbox) ──────────────────────────────────

  function handleRemoveFromSchedule(id: string) {
    dispatch(removeFromSchedule(id));
    updateTaskApi({ id, data: { planned_start_at: null, planned_end_at: null } }).catch(refreshTasks);
  }

  return {
    toggleTask:           handleToggleTask,
    addTask:              handleAddTask,
    addInboxItem:         handleAddInboxItem,
    removeInboxItem:      handleRemoveInboxItem,
    updateTask:           handleUpdateTask,
    deleteTask:           handleDeleteTask,
    reorderTask:          handleReorderTask,
    moveTaskToDate:       handleMoveTaskToDate,
    rescheduleTask:       handleRescheduleTask,
    moveToEvening:        handleMoveToEvening,
    startTaskNow:         handleStartTaskNow,
    removeFromSchedule:   handleRemoveFromSchedule,
  };
}
