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

/* «осталось X мин» — оставшееся время текущего блока */
export const fmtRemaining = (endMin: number, nowMin: number): string => {
  const rem = endMin - nowMin;
  if (rem <= 0) return 'завершается';
  return fmtCountdown(rem);
};
