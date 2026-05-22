import { useRef, useEffect, useCallback } from 'react';
import styles from './TimePicker.module.css';

export const ITEM_H  = 44; // px per row
export const VISIBLE = 5;  // rows visible, centre = selected

interface Props<T extends number | string> {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  formatItem?: (v: T) => string;
  width?: number; // px, default 80
}

export function DrumColumn<T extends number | string>({
  items,
  selected,
  onSelect,
  formatItem,
  width = 80,
}: Props<T>) {
  const listRef    = useRef<HTMLUListElement>(null);
  const scrolling  = useRef(false);
  const rafRef     = useRef<number>(0);

  const scrollTo = useCallback((idx: number, smooth: boolean) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Mount: jump to initial position
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) scrollTo(idx, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value change: scroll smoothly
  useEffect(() => {
    if (scrolling.current) return;
    const idx = items.indexOf(selected);
    if (idx >= 0) scrollTo(idx, true);
  }, [selected, items, scrollTo]);

  function handleScroll() {
    scrolling.current = true;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      const idx     = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      onSelect(items[clamped]);
      scrolling.current = false;
    });
  }

  const pad = Math.floor(VISIBLE / 2);
  const label = (v: T) => formatItem ? formatItem(v) : String(v);

  return (
    <div className={styles.drumColumn} style={{ width }}>
      <div className={styles.drumFadeTop} />
      <div className={styles.drumSelector} />
      <div className={styles.drumFadeBottom} />

      <ul ref={listRef} className={styles.drumList} onScroll={handleScroll}>
        {Array.from({ length: pad }).map((_, i) => (
          <li key={`pt${i}`} className={styles.drumPad} aria-hidden />
        ))}
        {items.map(v => (
          <li
            key={String(v)}
            className={`${styles.drumItem} ${v === selected ? styles.drumItemActive : ''}`}
            onClick={() => {
              scrollTo(items.indexOf(v), true);
              onSelect(v);
            }}
          >
            {label(v)}
          </li>
        ))}
        {Array.from({ length: pad }).map((_, i) => (
          <li key={`pb${i}`} className={styles.drumPad} aria-hidden />
        ))}
      </ul>
    </div>
  );
}
