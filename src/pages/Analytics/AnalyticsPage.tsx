import { useState } from 'react';
import { StatCard }          from './components/StatCard';
import { ActivityChart }     from './components/ActivityChart';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { DonutChart }        from './components/DonutChart';
import { InsightsList }      from './components/InsightsList';
import styles from './AnalyticsPage.module.css';

type Period = '7' | '30' | '90';

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className="t-h2">Аналитика</h2>
        <div className={styles.periodSwitch}>
          {(['7', '30', '90'] as Period[]).map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p} дней
            </button>
          ))}
        </div>
      </div>

      <div className={styles.statGrid}>
        <StatCard
          label="Стрик" value={7} sub="дней подряд" trend="Лучший: 14 дней"
          featured streakDays={7} streakMax={14}
        />
        <StatCard label="Задач выполнено" value={47}     sub="из 58 запланированных"   trend="↑ 12% к прошлой" trendUp />
        <StatCard label="Глубокая работа" value="3.2 ч"  sub="в среднем за день"        trend="↓ 0.4 ч"         trendUp={false} />
        <StatCard label="В срок"          value="81%"    sub="задач сданы вовремя"       trend="↑ 5%"            trendUp />
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.left}>
          <ActivityChart />
          <CategoryBreakdown />
          <InsightsList />
        </div>
        <div className={styles.right}>
          <DonutChart />
        </div>
      </div>
    </div>
  );
}
