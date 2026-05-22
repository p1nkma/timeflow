import { CAT_COLORS } from '../../../shared/utils/categories';
import styles from './CategoryBreakdown.module.css';

type Period = '7' | '30' | '90';

interface CatRow {
  name: string;
  key: keyof typeof CAT_COLORS;
  count: number;
  hours: number;
}

function fmtHours(h: number): string {
  return h % 1 === 0 ? `${h}` : h.toFixed(1).replace('.', ',');
}

const DATA: Record<Period, CatRow[]> = {
  '7': [
    { name: 'Учёба',   key: 'study',     count: 14, hours: 8.4  },
    { name: 'Кодинг',  key: 'code',      count: 12, hours: 6.6  },
    { name: 'Фриланс', key: 'freelance', count: 8,  hours: 3.2  },
    { name: 'Спорт',   key: 'sport',     count: 6,  hours: 2.2  },
    { name: 'Чтение',  key: 'reading',   count: 4,  hours: 1.1  },
    { name: 'Вуз',     key: 'fixed',     count: 3,  hours: 0.5  },
  ],
  '30': [
    { name: 'Учёба',   key: 'study',     count: 52,  hours: 34.0 },
    { name: 'Кодинг',  key: 'code',      count: 44,  hours: 26.4 },
    { name: 'Фриланс', key: 'freelance', count: 28,  hours: 13.0 },
    { name: 'Спорт',   key: 'sport',     count: 18,  hours: 8.0  },
    { name: 'Чтение',  key: 'reading',   count: 12,  hours: 4.4  },
    { name: 'Вуз',     key: 'fixed',     count: 10,  hours: 2.0  },
  ],
  '90': [
    { name: 'Учёба',   key: 'study',     count: 148, hours: 102.0 },
    { name: 'Кодинг',  key: 'code',      count: 130, hours: 79.2  },
    { name: 'Фриланс', key: 'freelance', count: 78,  hours: 39.0  },
    { name: 'Спорт',   key: 'sport',     count: 52,  hours: 24.0  },
    { name: 'Чтение',  key: 'reading',   count: 34,  hours: 13.2  },
    { name: 'Вуз',     key: 'fixed',     count: 28,  hours: 6.0   },
  ],
};

export function CategoryBreakdown({ period }: { period: Period }) {
  const data       = DATA[period];
  const maxHours   = Math.max(...data.map(d => d.hours));
  const totalHours = Math.round(data.reduce((s, d) => s + d.hours, 0) * 10) / 10;
  const totalHoursFmt = fmtHours(totalHours);

  const periodLabel = period === '7' ? '7 дней' : period === '30' ? '30 дней' : '90 дней';

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className="t-h3">Время по категориям</span>
        <span className="t-small muted">{totalHoursFmt} ч за {periodLabel}</span>
      </div>

      <div className={styles.bars}>
        {data.map(d => {
          const pct = Math.round((d.hours / totalHours) * 100);
          return (
            <div key={d.key} className={styles.barRow}>
              <div className={styles.barLeft}>
                <span className={styles.dot} style={{ background: CAT_COLORS[d.key] }} />
                <span className={`t-small ${styles.barLabel}`}>{d.name}</span>
              </div>
              <div
                className={styles.barTrack}
                style={{ background: `${CAT_COLORS[d.key]}18` }}
              >
                <div
                  className={styles.barFill}
                  style={{
                    width: '100%',
                    transform: `scaleX(${d.hours / maxHours})`,
                    background: CAT_COLORS[d.key],
                  }}
                />
              </div>
              <span className={styles.barMeta}>
                <span className={styles.metaPct}>{pct}%</span>
                <span className={styles.metaHours}>{fmtHours(d.hours)} ч</span>
                <span className={styles.metaCount}>{d.count} задач</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
