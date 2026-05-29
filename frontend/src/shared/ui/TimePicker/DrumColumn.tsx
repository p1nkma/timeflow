import { useRef, useEffect, useCallback } from 'react';
import styles from './TimePicker.module.css';

export const ITEM_H  = 44;
export const VISIBLE = 5;

interface Props<T extends number | string> {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  formatItem?: (v: T) => string;
  width?: number;
}

const COPIES = 3;

export function DrumColumn<T extends number | string>({
  items,
  selected,
  onSelect,
  formatItem,
  width = 80,
}: Props<T>) {
  const listRef     = useRef<HTMLUListElement>(null);
  const isJumping   = useRef(false);
  const rafRef      = useRef<number>(0);
  const lastIdx     = useRef(-1);

  const pad = Math.floor(VISIBLE / 2);
  const n   = items.length;
  const label = (v: T) => formatItem ? formatItem(v) : String(v);
  const selectedIdx = items.indexOf(selected);

  const rowToIdx = (row: number) => {
    const offset = row - pad;
    if (offset < 0 || offset >= n * COPIES) return -1;
    return ((offset % n) + n) % n;
  };

  const scrollToRow = useCallback((row: number, smooth: boolean) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: row * ITEM_H, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const jumpToMiddle = useCallback((idx: number) => {
    isJumping.current = true;
    scrollToRow(pad + n + idx, false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { isJumping.current = false; });
    });
  }, [n, pad, scrollToRow]);

  // Mount
  useEffect(() => {
    if (selectedIdx >= 0) {
      lastIdx.current = selectedIdx;
      jumpToMiddle(selectedIdx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value change
  useEffect(() => {
    if (isJumping.current) return;
    if (selectedIdx < 0) return;
    const el = listRef.current;
    if (!el) return;
    const currentRow = Math.round(el.scrollTop / ITEM_H);
    const starts = [pad, pad + n, pad + 2 * n];
    const nearest = starts.reduce((best, s) =>
      Math.abs(s + selectedIdx - currentRow) < Math.abs(best + selectedIdx - currentRow) ? s : best
    );
    scrollToRow(nearest + selectedIdx, true);
  }, [selected, selectedIdx, n, pad, scrollToRow]);

  function handleScroll() {
    if (isJumping.current) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el || isJumping.current) return;

      const row = Math.round(el.scrollTop / ITEM_H);
      const idx = rowToIdx(row);
      if (idx < 0) return;

      // Update selected immediately so highlight tracks scroll in real time
      if (idx !== lastIdx.current) {
        lastIdx.current = idx;
        onSelect(items[idx]);
      }
    });
  }

  // scrollend: only used to wrap to middle copy if needed — no value change here
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    function onScrollEnd() {
      if (isJumping.current) return;
      const el2 = listRef.current;
      if (!el2) return;
      const row    = Math.round(el2.scrollTop / ITEM_H);
      const offset = row - pad;
      if (offset < 0 || offset >= n * COPIES) return;
      const copyIndex = Math.floor(offset / n);
      const idx = ((offset % n) + n) % n;
      if (copyIndex !== 1) jumpToMiddle(idx);
    }

    if ('onscrollend' in el) {
      const node: HTMLUListElement = el;
      node.addEventListener('scrollend', onScrollEnd);
      return () => node.removeEventListener('scrollend', onScrollEnd);
    }

    const node: HTMLUListElement = el;
    let timer: ReturnType<typeof setTimeout>;
    function fallback() {
      if (isJumping.current) return;
      clearTimeout(timer);
      timer = setTimeout(onScrollEnd, 120);
    }
    node.addEventListener('scroll', fallback, { passive: true });
    return () => { node.removeEventListener('scroll', fallback); clearTimeout(timer); };
  }, [jumpToMiddle, n, pad]);

  const allItems: T[] = [];
  for (let c = 0; c < COPIES; c++) for (const v of items) allItems.push(v);

  return (
    <div className={styles.drumColumn} style={{ width }}>
      <div className={styles.drumFadeTop} />
      <div className={styles.drumSelector} />
      <div className={styles.drumFadeBottom} />

      <ul ref={listRef} className={styles.drumList} onScroll={handleScroll}>
        {Array.from({ length: pad }).map((_, i) => (
          <li key={`pt${i}`} className={styles.drumPad} aria-hidden />
        ))}
        {allItems.map((v, i) => (
          <li
            key={i}
            className={`${styles.drumItem} ${v === selected ? styles.drumItemActive : ''}`}
            onClick={() => {
              onSelect(v);
              scrollToRow(pad + n + items.indexOf(v), true);
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
