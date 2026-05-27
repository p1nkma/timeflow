import { useEffect, useMemo, useState } from 'react';
import type { CategoryKey, EnergyLevel, Task } from '../../types';
import { TODAY_ISO } from './constants';

export type Destination = 'schedule' | 'inbox';

export interface TaskFormValues {
  title: string;
  cat: CategoryKey;
  date: string;
  start: number;
  duration: number;
  energy: EnergyLevel | null;
  destination: Destination;
  notes: string;
}

export interface TaskFormErrors {
  title?: string;
  duration?: string;
}

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title:       task.title,
    cat:         task.cat,
    date:        task.date ?? TODAY_ISO(),
    start:       task.start,
    duration:    task.end - task.start,
    energy:      task.energy ?? null,
    destination: 'schedule',
    notes:       task.notes ?? '',
  };
}

export function formValuesToTaskPatch(v: TaskFormValues) {
  return {
    title:  v.title.trim(),
    cat:    v.cat,
    date:   v.date,
    start:  v.start,
    end:    v.start + v.duration,
    energy: v.energy ?? undefined,
    notes:  v.notes.trim() || undefined,
  };
}

function buildErrors(v: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};
  if (!v.title.trim()) errors.title = 'Введите название';
  if (v.destination === 'schedule' && v.duration <= 0) errors.duration = 'Длительность > 0';
  return errors;
}

function shallowEqual(a: TaskFormValues, b: TaskFormValues): boolean {
  return a.title === b.title
    && a.cat === b.cat
    && a.date === b.date
    && a.start === b.start
    && a.duration === b.duration
    && a.energy === b.energy
    && a.destination === b.destination
    && a.notes === b.notes;
}

export function useTaskForm(initial: TaskFormValues, resetKey?: string) {
  const [values, setValues] = useState<TaskFormValues>(initial);

  useEffect(() => {
    setValues(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const errors  = useMemo(() => buildErrors(values), [values]);
  const isValid = Object.keys(errors).length === 0;
  const isDirty = !shallowEqual(values, initial);

  function update<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  return { values, update, errors, isValid, isDirty };
}
