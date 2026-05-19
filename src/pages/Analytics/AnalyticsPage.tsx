import { useState, useEffect, useRef } from 'react';
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
  const [period, setPeriod]       = useState<Period>('7');
  const [fading, setFading]       = useState(false);
  const [visiblePeriod, setVisiblePeriod] = useState<Period>('7');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePeriod(p: Period) {
    if (p === period) return;
    setFading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPeriod(p);
      setVisiblePeriod(p);
      setFading(false);
    }, 180);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className={styles.page}>
      <div className={styles.stickyTop}>
        <div className={styles.header}>
          <h2 className="t-h2">Аналитика</h2>
          <div className={styles.periodSwitch}>
            {(['7', '30', '90'] as Period[]).map(p => (
              <button
                key={p}
                className={`${styles.periodBtn} ${visiblePeriod === p ? styles.periodBtnActive : ''}`}
                onClick={() => handlePeriod(p)}
                aria-pressed={visiblePeriod === p}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={fading ? styles.fadeOut : styles.fadeIn}>
        <div className={styles.content}>
          <AIInsightBlock period={period} />
          <CategoryBreakdown period={period} />
        </div>
      </div>
    </div>
  );
}
