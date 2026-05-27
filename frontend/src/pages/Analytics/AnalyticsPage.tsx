import { useState, useRef, useCallback } from 'react';
import { AIInsightBlock }    from './components/AIInsightBlock';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import styles from './AnalyticsPage.module.css';

type Period = '7' | '30' | '90';

const PERIOD_LABEL: Record<Period, string> = {
  '7':  '7 дней',
  '30': '30 дней',
  '90': '90 дней',
};

export function AnalyticsPage() {
  const [period, setPeriod]             = useState<Period>('7');
  const [animClass, setAnimClass]       = useState(styles.fadeIn);
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePeriod = useCallback((p: Period) => {
    if (p === period) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    // 1. Fade out
    setAnimClass(styles.fadeOut);

    timerRef.current = setTimeout(() => {
      // 2. Swap data
      setPeriod(p);

      // 3. Force reflow so browser registers the class removal before re-adding fadeIn
      if (contentRef.current) {
        contentRef.current.classList.remove(styles.fadeOut, styles.fadeIn);
        void contentRef.current.offsetHeight; // reflow
      }

      // 4. Fade in
      setAnimClass(styles.fadeIn);
    }, 160);
  }, [period]);

  return (
    <div className={styles.page}>
      <div className={styles.stickyTop}>
        <div className={styles.header}>
          <h1 className="t-h2">Аналитика</h1>
          <div className={styles.periodSwitch}>
            {(['7', '30', '90'] as Period[]).map(p => (
              <button
                key={p}
                className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ''}`}
                onClick={() => handlePeriod(p)}
                aria-pressed={period === p}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={contentRef} className={animClass}>
        <div className={styles.content}>
          <CategoryBreakdown period={period} />
          <AIInsightBlock period={period} />
        </div>
      </div>
    </div>
  );
}
