import type { Task, InboxItem, PlannerSettings } from '../types';
import { rangeFmt, fmtCountdown } from './time';

export type DailyHint =
  | { kind: 'overdue';   count: number }
  | { kind: 'empty-day' }
  | { kind: 'free-slot'; slotStart: number; slotEnd: number; inboxItem: InboxItem }
  | { kind: 'peak-unused'; peakStart: number; peakEnd: number };

interface Input {
  tasks:   Task[];           // задачи сегодняшнего дня (без isBreak)
  inbox:   InboxItem[];
  planner: PlannerSettings;
  nowMin:  number;
}

const MIN_SLOT = 30; // минут

/** Все свободные интервалы >= MIN_SLOT, начиная не раньше nowMin и в пределах workStart..workEnd */
function findFreeSlots(tasks: Task[], nowMin: number, workStart: number, workEnd: number): Array<{ start: number; end: number }> {
  const sorted = [...tasks].sort((a, b) => a.start - b.start);
  const slots: Array<{ start: number; end: number }> = [];

  let cursor = Math.max(nowMin, workStart);

  for (const t of sorted) {
    if (t.end <= cursor) continue;
    if (t.start > cursor) {
      const slotEnd = Math.min(t.start, workEnd);
      if (slotEnd - cursor >= MIN_SLOT) {
        slots.push({ start: cursor, end: slotEnd });
      }
    }
    cursor = Math.max(cursor, t.end);
  }

  if (workEnd - cursor >= MIN_SLOT) {
    slots.push({ start: cursor, end: workEnd });
  }

  return slots;
}

/** Приоритезированный выбор задачи из Inbox для предложения */
function pickInboxItem(inbox: InboxItem[]): InboxItem | null {
  if (inbox.length === 0) return null;

  const urgent = inbox.filter(i => i.urgent);
  if (urgent.length > 0) return urgent[0];

  const withDeadline = inbox.filter(i => i.deadline);
  if (withDeadline.length > 0) {
    return [...withDeadline].sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0];
  }

  return inbox[0];
}

/** Энергетический пик по хронотипу */
function getPeakWindow(chronotype: PlannerSettings['chronotype']): { start: number; end: number } {
  if (chronotype === 'lark')   return { start: 9 * 60,  end: 12 * 60 };
  if (chronotype === 'owl')    return { start: 19 * 60, end: 22 * 60 };
  return { start: 10 * 60, end: 13 * 60 }; // pigeon
}

export function getDailyHint({ tasks, inbox, planner, nowMin }: Input): DailyHint | null {
  const real = tasks.filter(t => !t.isBreak);

  // 1. Овердью
  const overdueCount = real.filter(t => t.overdue && !t.done).length;
  if (overdueCount > 0) {
    return { kind: 'overdue', count: overdueCount };
  }

  // 2. Пустой день
  if (real.length === 0) {
    return { kind: 'empty-day' };
  }

  // 3. Свободный слот + есть что предложить из Inbox
  const slots = findFreeSlots(real, nowMin, planner.workStart, planner.workEnd);
  const inboxItem = pickInboxItem(inbox);
  if (slots.length > 0 && inboxItem) {
    const slot = slots[0]; // ближайший
    return {
      kind: 'free-slot',
      slotStart: slot.start,
      slotEnd:   slot.end,
      inboxItem,
    };
  }

  // 4. Пик энергии не используется тяжёлой задачей
  const peak = getPeakWindow(planner.chronotype);
  if (peak.end > nowMin) {
    const peakTasks = real.filter(t => t.start < peak.end && t.end > peak.start);
    const hasHeavyInPeak = peakTasks.some(t => t.energy === 'high');
    if (!hasHeavyInPeak && peakTasks.length === 0) {
      return { kind: 'peak-unused', peakStart: peak.start, peakEnd: peak.end };
    }
  }

  return null;
}

/** Хелперы форматирования для DailyTip-компонента */
export function formatSlotRange(start: number, end: number): string {
  return rangeFmt(start, end);
}

export function formatSlotDuration(start: number, end: number): string {
  return fmtCountdown(end - start);
}
