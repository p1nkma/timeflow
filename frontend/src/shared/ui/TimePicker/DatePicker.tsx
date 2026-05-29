import { useMemo } from 'react';
import { parseISO, format, getDaysInMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DrumColumn } from './DrumColumn';
import styles from './TimePicker.module.css';

// ── constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

// ── helpers ───────────────────────────────────────────────────────────────────

function buildYears(around: number, span = 3): number[] {
  return Array.from({ length: span * 2 + 1 }, (_, i) => around - span + i);
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  value: string;            // ISO yyyy-MM-dd
  onChange: (iso: string) => void;
  minDate?: Date;           // default: today
}

export function DatePicker({ value, onChange, minDate }: Props) {
  const parsed = useMemo(() => {
    try { return parseISO(value); }
    catch { return new Date(); }
  }, [value]);

  const day   = parsed.getDate();
  const month = parsed.getMonth() + 1; // 1-12
  const year  = parsed.getFullYear();

  // Days available in current month/year
  const days = useMemo(
    () => Array.from({ length: getDaysInMonth(new Date(year, month - 1)) }, (_, i) => i + 1),
    [year, month],
  );

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years  = buildYears(year);

  // Clamp day when switching to a month with fewer days
  function commit(d: number, m: number, y: number) {
    const maxDay = getDaysInMonth(new Date(y, m - 1));
    const safeDay = Math.min(d, maxDay);
    const date = new Date(y, m - 1, safeDay);
    // Clamp to minDate if provided
    const effective = minDate && date < minDate ? minDate : date;
    onChange(format(effective, 'yyyy-MM-dd'));
  }

  const displayStr = format(parsed, 'd MMMM yyyy', { locale: ru });

  return (
    <div className={styles.root}>
      <div className={styles.display}>
        <span className={styles.displayDate}>{displayStr}</span>
      </div>

      <div className={styles.drumWrap}>
        {/* Day */}
        <DrumColumn
          items={days}
          selected={day}
          onSelect={d => commit(d, month, year)}
          formatItem={v => String(v).padStart(2, '0')}
          width={56}
        />

        {/* Month */}
        <DrumColumn
          items={months}
          selected={month}
          onSelect={m => commit(day, m, year)}
          formatItem={v => MONTH_NAMES[v - 1]}
          width={110}
        />

        {/* Year */}
        <DrumColumn
          items={years}
          selected={year}
          onSelect={y => commit(day, month, y)}
          formatItem={v => String(v)}
          width={72}
        />
      </div>
    </div>
  );
}
