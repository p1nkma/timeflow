import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './DonutChart.module.css';

const DATA = [
  { name: 'Учёба',    value: 8.4, color: 'var(--cat-study-border)'    },
  { name: 'Кодинг',   value: 6.6, color: 'var(--cat-code-border)'     },
  { name: 'Фриланс',  value: 3.2, color: 'var(--cat-freelance-border)'},
  { name: 'Спорт',    value: 2.2, color: 'var(--cat-sport-border)'    },
  { name: 'Чтение',   value: 1.1, color: 'var(--cat-reading-border)'  },
  { name: 'Вуз',      value: 0.5, color: 'var(--cat-fixed-border)'    },
];

const TOTAL = DATA.reduce((s, d) => s + d.value, 0);

export function DonutChart() {
  return (
    <div className={styles.wrap}>
      <span className="t-h3">Распределение по типам</span>
      <span className="t-small muted">часов · последние 7 дней</span>

      <div className={styles.body}>
        <div className={styles.chart}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" stroke="none">
                {DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 8, fontSize: 13 }}
                formatter={(v) => [`${v} ч`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.center}>
            <span className="t-h2">{TOTAL} ч</span>
            <span className="t-xs muted">итого</span>
          </div>
        </div>

        <ul className={styles.legend}>
          {DATA.map(d => (
            <li key={d.name} className={styles.legendItem}>
              <span className={styles.dot} style={{ background: d.color }} />
              <span className="t-body-md">{d.name}</span>
              <span className={`t-small muted ${styles.hrs}`}>{d.value} ч</span>
              <span className={`t-xs muted`}>{Math.round(d.value / TOTAL * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
