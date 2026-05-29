import type { Task, InboxItem, CategoryKey, EnergyLevel } from '../../../shared/types';

interface BusySlot { start: number; end: number }

interface Settings {
  workStart: number;
  workEnd: number;
  enabledCategories: CategoryKey[];
  peakStart?: number; // default 9:00
  peakEnd?: number;   // default 12:00
}

interface GeneratedTask {
  title: string;
  cat: CategoryKey;
  date?: string;
  start: number;
  end: number;
  source: 'ai';
  energy?: EnergyLevel;
  reason?: string;
  isBreak?: boolean;
  inboxId?: string; // so caller can remove from inbox after apply
}

const DEFAULT_DUR = 45;
const BREAK_DUR   = 15;
const BREAK_AFTER = 60; // вставить перерыв после блока >= 60 мин

// Категории с высокой когнитивной нагрузкой → ставим на пик энергии
const HIGH_ENERGY_CATS: ReadonlySet<CategoryKey> = new Set(['code', 'study', 'freelance']);

function energyForCat(cat: CategoryKey): EnergyLevel {
  if (HIGH_ENERGY_CATS.has(cat)) return 'high';
  if (cat === 'reading') return 'medium';
  return 'low';
}

function reasonForTask(item: InboxItem, slotStart: number, isPeak: boolean): string {
  if (item.urgent) return 'Срочно — поставлено первым';
  if (isPeak && HIGH_ENERGY_CATS.has(item.cat)) return 'Пик энергии — тяжёлая задача';
  if (slotStart < 12 * 60) return 'Утренний слот';
  if (slotStart < 17 * 60) return 'Дневной слот';
  return 'Вечерний слот';
}

/**
 * Mock plan generator.
 *
 * Algorithm:
 *  1. Sort inbox: urgent first, then high-energy categories
 *  2. Place each item into the first free slot that fits, preferring peak hours for high-energy
 *  3. Insert 15-min breaks between back-to-back blocks ≥ 60 min long
 *  4. Respect locked tasks (ВУЗ, etc.)
 */
export function mockGenerate(
  inbox: InboxItem[],
  existingTasks: Task[],
  date: string,
  settings: Settings,
): GeneratedTask[] {
  const peakStart = settings.peakStart ?? 9 * 60;
  const peakEnd   = settings.peakEnd ?? 12 * 60;

  // Busy slots = unfinished tasks on target date (done tasks are history, don't block scheduling)
  const busy: BusySlot[] = existingTasks
    .filter(t => (t.date ?? date) === date && !t.isBreak && !t.done)
    .map(t => ({ start: t.start, end: t.end }));

  // Sort inbox: urgent → high-energy → rest
  const sorted = [...inbox]
    .filter(i => settings.enabledCategories.includes(i.cat))
    .sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      const aHigh = HIGH_ENERGY_CATS.has(a.cat) ? 1 : 0;
      const bHigh = HIGH_ENERGY_CATS.has(b.cat) ? 1 : 0;
      return bHigh - aHigh;
    });

  const placed: GeneratedTask[] = [];

  for (const item of sorted) {
    const wantsPeak = HIGH_ENERGY_CATS.has(item.cat);

    // First try peak window for high-energy categories
    let start = -1;
    if (wantsPeak) {
      start = tryFit(busy, DEFAULT_DUR, peakStart, peakEnd);
    }
    // Fallback: full work window
    if (start < 0) {
      start = tryFit(busy, DEFAULT_DUR, settings.workStart, settings.workEnd);
    }
    if (start < 0) continue; // no room — skip

    const end = start + DEFAULT_DUR;
    const isPeak = start >= peakStart && end <= peakEnd;

    placed.push({
      title: item.title,
      cat: item.cat,
      date,
      start,
      end,
      source: 'ai',
      energy: energyForCat(item.cat),
      reason: reasonForTask(item, start, isPeak),
      inboxId: item.id,
    });

    busy.push({ start, end });
    busy.sort((a, b) => a.start - b.start);
  }

  // Insert breaks between long back-to-back blocks
  const withBreaks: GeneratedTask[] = [];
  const sortedPlaced = [...placed].sort((a, b) => a.start - b.start);

  for (let i = 0; i < sortedPlaced.length; i++) {
    withBreaks.push(sortedPlaced[i]);
    const cur  = sortedPlaced[i];
    const next = sortedPlaced[i + 1];
    if (!next) continue;

    const curLong  = cur.end - cur.start >= BREAK_AFTER;
    const nextLong = next.end - next.start >= BREAK_AFTER;
    const gap      = next.start - cur.end;

    // Insert a break if both blocks are long and gap allows
    if (curLong && nextLong && gap >= BREAK_DUR) {
      withBreaks.push({
        title: 'Перерыв',
        cat: 'fixed',
        date,
        start: cur.end,
        end: cur.end + BREAK_DUR,
        source: 'ai',
        isBreak: true,
        reason: 'Восстановить фокус',
      });
    }
  }

  return withBreaks;
}

function tryFit(busy: BusySlot[], duration: number, rangeStart: number, rangeEnd: number): number {
  const merged: BusySlot[] = [];
  for (const b of [...busy].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && b.start < last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      merged.push({ ...b });
    }
  }

  let cursor = rangeStart;
  for (const block of merged) {
    if (block.end <= cursor) continue;
    if (block.start >= cursor + duration && cursor + duration <= rangeEnd) {
      return cursor;
    }
    cursor = Math.max(cursor, block.end);
  }
  if (cursor + duration <= rangeEnd) return cursor;
  return -1;
}

export type { GeneratedTask };
