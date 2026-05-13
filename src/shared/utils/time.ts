export const toMin = (h: number, m = 0): number => h * 60 + m;

export const fmt = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const rangeFmt = (start: number, end: number): string =>
  `${fmt(start)}—${fmt(end)}`;

export const nowMinutes = (): number => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
