import { format } from 'date-fns';
import { fmt } from '../../utils/time';
import type { CategoryKey } from '../../types';

export const CAT_OPTIONS: { key: CategoryKey; label: string }[] = [
  { key: 'study',     label: 'Учёба' },
  { key: 'code',      label: 'Кодинг' },
  { key: 'freelance', label: 'Фриланс' },
  { key: 'sport',     label: 'Спорт' },
  { key: 'reading',   label: 'Чтение' },
  { key: 'fixed',     label: 'Вуз (fixed)' },
];

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180] as const;

export const TODAY_ISO = () => format(new Date(), 'yyyy-MM-dd');

function buildTimeOptions() {
  const opts: { value: number; label: string }[] = [];
  for (let h = 6; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      opts.push({ value: h * 60 + m, label: fmt(h * 60 + m) });
    }
  }
  return opts;
}
export const TIME_OPTIONS = buildTimeOptions();
