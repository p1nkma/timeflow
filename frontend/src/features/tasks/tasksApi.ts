import { baseApi } from '../../app/api/baseApi';
import type { Task, TaskSource, EnergyLevel } from '../../shared/types';
import type { CategoryOut } from '../categories/categoriesApi';

// ── Backend shape ────────────────────────────────────────────────────────────

export interface TaskOut {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  deadline: string | null;
  planned_start_at: string | null;
  planned_end_at: string | null;
  estimated_duration_minutes: number | null;
  started_at: string | null;
  completed_at: string | null;
  status: 'pending' | 'done' | 'skipped';
  source: TaskSource;
  energy: EnergyLevel | null;
  locked: boolean;
  urgent: boolean;
  is_break: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  reason: string | null;
  reason_long: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  category_id?: string | null;
  notes?: string | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  deadline?: string | null;
  energy?: EnergyLevel | null;
  urgent?: boolean;
  is_break?: boolean;
  source?: TaskSource;
}

export interface TaskUpdate {
  title?: string;
  category_id?: string | null;
  notes?: string | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  deadline?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  status?: 'pending' | 'done' | 'skipped';
  energy?: EnergyLevel | null;
  urgent?: boolean;
  is_break?: boolean;
}

// ── Mapper: TaskOut → Task ───────────────────────────────────────────────────

function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function isoToDate(iso: string): string {
  return iso.slice(0, 10);
}

export function taskOutToTask(t: TaskOut, catLookup: Map<string, string>): Task {
  const start = t.planned_start_at ? isoToMinutes(t.planned_start_at) : 0;
  const end   = t.planned_end_at   ? isoToMinutes(t.planned_end_at)   : start + 30;
  const date  = t.planned_start_at ? isoToDate(t.planned_start_at)    : new Date().toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  return {
    id:         t.id,
    title:      t.title,
    date:       date === today ? undefined : date,
    start,
    end,
    cat:        (t.category_id ? catLookup.get(t.category_id) : undefined) ?? '',
    source:     t.source,
    done:       t.status === 'done',
    locked:     t.locked || t.source === 'uni',
    isBreak:    t.is_break,
    energy:     t.energy ?? undefined,
    reason:     t.reason ?? undefined,
    reasonLong: t.reason_long ?? undefined,
    notes:      t.notes ?? undefined,
  };
}

export function inboxOutToInboxItem(t: TaskOut, catLookup: Map<string, string>) {
  return {
    id:                t.id,
    title:             t.title,
    cat:               (t.category_id ? catLookup.get(t.category_id) : undefined) ?? 'study',
    deadline:          t.deadline ? t.deadline.slice(0, 10) : null,
    urgent:            t.urgent,
    estimatedDuration: t.estimated_duration_minutes ?? null,
  };
}

export function buildCatLookup(cats: CategoryOut[]): Map<string, string> {
  return new Map(cats.map(c => [c.id, c.key]));
}

// ── Task → TaskCreate/Update ─────────────────────────────────────────────────

function minutesToIso(date: string, minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${date}T${h}:${m}:00`;
}

export function taskToCreate(
  task: Omit<Task, 'id' | 'done'> & { id?: string; done?: boolean },
  catIdLookup: Map<string, string>,
): TaskCreate {
  const today = new Date().toISOString().slice(0, 10);
  const date  = task.date ?? today;
  return {
    title:           task.title,
    category_id:     catIdLookup.get(task.cat) ?? null,
    notes:           task.notes ?? null,
    planned_start_at: minutesToIso(date, task.start),
    planned_end_at:   minutesToIso(date, task.end),
    energy:          task.energy ?? null,
    is_break:        task.isBreak ?? false,
    source:          task.source,
  };
}

export function taskToUpdate(patch: Partial<Task> & { date?: string }, catIdLookup: Map<string, string>): TaskUpdate {
  const update: TaskUpdate = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.notes !== undefined) update.notes = patch.notes ?? null;
  if (patch.energy !== undefined) update.energy = patch.energy ?? null;
  if (patch.cat !== undefined) update.category_id = catIdLookup.get(patch.cat) ?? null;
  if (patch.done !== undefined) update.status = patch.done ? 'done' : 'pending';

  if (patch.start !== undefined && patch.end !== undefined) {
    const today = new Date().toISOString().slice(0, 10);
    const date  = patch.date ?? today;
    update.planned_start_at = minutesToIso(date, patch.start);
    update.planned_end_at   = minutesToIso(date, patch.end);
  }

  return update;
}

// ── RTK Query endpoints ──────────────────────────────────────────────────────

export interface ListTasksParams {
  from?: string; // ISO date YYYY-MM-DD
  to?: string;
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getTasks: builder.query<TaskOut[], ListTasksParams>({
      query: ({ from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', `${from}T00:00:00`);
        if (to)   params.set('to',   `${to}T23:59:59`);
        const qs = params.toString();
        return qs ? `/tasks?${qs}` : '/tasks';
      },
      providesTags: ['Task'],
    }),
    getInbox: builder.query<TaskOut[], void>({
      query: () => '/tasks/inbox',
      providesTags: ['Task'],
    }),
    createTask: builder.mutation<TaskOut, TaskCreate>({
      query: body => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
    updateTask: builder.mutation<TaskOut, { id: string; data: TaskUpdate }>({
      query: ({ id, data }) => ({ url: `/tasks/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Task'],
    }),
    deleteTask: builder.mutation<void, string>({
      query: id => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Task'],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetInboxQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = tasksApi;
