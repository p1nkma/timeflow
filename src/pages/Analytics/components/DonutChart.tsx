import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CAT_COLORS } from '../../../shared/utils/categories';
import styles from './DonutChart.module.css';

type Period = '7' | '30' | '90';

const DATA: Record<Period, { name: string; key: keyof typeof CAT_COLORS; value: number }[]> = {
  '7': [
    { name: 'Учёба',   key: 'study',     value: 8.4  },
    { name: 'Кодинг',  key: 'code',      value: 6.6  },
    { name: 'Фриланс', key: 'freelance', value: 3.2  },
    { name: 'Спорт',   key: 'sport',     value: 2.2  },
    { name: 'Чтение',  key: 'reading',   value: 1.1  },
    { name: 'Вуз',     key: 'fixed',     value: 0.5  },
  ],
  '30': [
    { name: 'Учёба',   key: 'study',     value: 34.0 },
    { name: 'Кодинг',  key: 'code',      value: 26.4 },
    { name: 'Фриланс', key: 'freelance', value: 13.0 },
    { name: 'Спорт',   key: 'sport',     value: 8.0  },
    { name: 'Чтение',  key: 'reading',   value: 4.4  },
    { name: 'Вуз',     key: 'fixed',     value: 2.0  },
  ],
  '90': [
    { name: 'Учёба',   key: 'study',     value: 102.0 },
    { name: 'Кодинг',  key: 'code',      value: 79.2  },
    { name: 'Фриланс', key: 'freelance', value: 39.0  },
    { name: 'Спорт',   key: 'sport',     value: 24.0  },
    { name: 'Чтение',  key: 'reading',   value: 13.2  },
    { name: 'Вуз',     key: 'fixed',     value: 6.0   },
  ],
};

export function DonutChart({ period }: { period: Period }) {
  const data  = DATA[period];
  const total = Math.round(data.reduce((s, d) => s + d.value, 0) * 10) / 10;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className="t-h3">Время по категориям</span>
        <span className="t-small muted">часов</span>
      </div>

      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={160} minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={64}
              dataKey="value"
              stroke="none"
              paddingAngle={2}
            >
              {data.map(d => <Cell key={d.key} fill={CAT_COLORS[d.key]} />)}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(v, name) => [`${v} ч · ${Math.round((Number(v) / total) * 100)}%`, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.center}>
          <span className="t-h2">{total}</span>
          <span className="t-xs muted">ч всего</span>
        </div>
      </div>

      <ul className={styles.legend}>
        {data.map(d => (
          <li key={d.key} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: CAT_COLORS[d.key] }} />
            <span className="t-small">{d.name}</span>
            <span className={`t-xs muted ${styles.pct}`}>{Math.round(d.value / total * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
