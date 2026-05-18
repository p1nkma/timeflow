import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './ActivityChart.module.css';

const DATA = [
  { day: 'Пн', tasks: 5 },
  { day: 'Вт', tasks: 8 },
  { day: 'Ср', tasks: 7 },
  { day: 'Чт', tasks: 4 },
  { day: 'Пт', tasks: 6 },
  { day: 'Сб', tasks: 2 },
  { day: 'Вс', tasks: 3 },
];

const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

export function ActivityChart() {
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className="t-h3">Активность по дням</span>
        <span className="t-small muted">выполненные задачи · последние 7 дней</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={DATA} barSize={28}>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-tertiary)' }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 8, fontSize: 13 }}
            cursor={{ fill: 'var(--color-bg-tertiary)' }}
          />
          <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
            {DATA.map((_, i) => (
              <Cell key={i} fill={i === TODAY_IDX ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
