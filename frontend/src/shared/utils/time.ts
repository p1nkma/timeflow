export const toMin = (h: number, m = 0): number => h * 60 + m;

export const fmt = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const rangeFmt = (start: number, end: number): string =>
  `${fmt(start)}—${fmt(end)}`;

export const nowMinutes = (): number => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/* «2 ч 25 мин» или «45 мин» — для отображения интервалов до события */
export const fmtCountdown = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h} ч ${m} мин`;
  if (h > 0)           return `${h} ч`;
  return `${m} мин`;
};

/** Find first free slot of `duration` minutes within [rangeStart, rangeEnd], avoiding `busy` intervals. */
export const findFreeSlot = (
  busy: { start: number; end: number }[],
  duration: number,
  rangeStart: number,
  rangeEnd: number,
): number => {
  // Sort and merge overlapping intervals first
  const merged: { start: number; end: number }[] = [];
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
    if (block.end <= cursor) continue;          // block is entirely before cursor
    if (block.start >= cursor + duration) break; // gap before this block fits
    cursor = block.end;                          // move cursor past this block
  }
  // Clamp to range — if nothing fits, return closest possible start
  return Math.min(cursor, rangeEnd - duration);
};

/* «осталось X мин» — оставшееся время текущего блока */
export const fmtRemaining = (endMin: number, nowMin: number): string => {
  const rem = endMin - nowMin;
  if (rem <= 0) return 'завершается';
  return fmtCountdown(rem);
};
