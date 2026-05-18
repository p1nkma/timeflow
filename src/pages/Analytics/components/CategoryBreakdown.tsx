import styles from './CategoryBreakdown.module.css';

const DATA = [
  { name: 'Учёба',   count: 14, color: 'var(--cat-study-border)'     },
  { name: 'Кодинг',  count: 12, color: 'var(--cat-code-border)'      },
  { name: 'Фриланс', count: 8,  color: 'var(--cat-freelance-border)' },
  { name: 'Спорт',   count: 6,  color: 'var(--cat-sport-border)'     },
  { name: 'Чтение',  count: 4,  color: 'var(--cat-reading-border)'   },
  { name: 'Вуз',     count: 3,  color: 'var(--cat-fixed-border)'     },
];

const MAX = Math.max(...DATA.map(d => d.count));

export function CategoryBreakdown() {
  return (
    <div className={styles.wrap}>
      <span className="t-h3">По категориям · эта неделя</span>
      <div className={styles.chips}>
        {DATA.map(d => (
          <span key={d.name} className={styles.chip} style={{ borderColor: d.color, color: d.color }}>
            {d.name} {d.count}
          </span>
        ))}
      </div>
      <div className={styles.bars}>
        {DATA.map(d => (
          <div key={d.name} className={styles.barRow}>
            <span className={`t-small ${styles.barLabel}`}>{d.name}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${(d.count / MAX) * 100}%`, background: d.color }}
              />
            </div>
            <span className="t-small muted">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
