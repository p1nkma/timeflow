import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppSelector } from '../../../app/hooks';
import styles from './ActivityChart.module.css';

type Period = '7' | '30' | '90';

const DATA_7 = [
  { day: 'Пн', tasks: 5 },
  { day: 'Вт', tasks: 8 },
  { day: 'Ср', tasks: 7 },
  { day: 'Чт', tasks: 4 },
  { day: 'Пт', tasks: 6 },
  { day: 'Сб', tasks: 2 },
  { day: 'Вс', tasks: 3 },
];

const DATA_30 = [
  { day: 'Нед 1', tasks: 32 },
  { day: 'Нед 2', tasks: 41 },
  { day: 'Нед 3', tasks: 28 },
  { day: 'Нед 4', tasks: 35 },
];

const DATA_90 = [
  { day: 'Март',   tasks: 120 },
  { day: 'Апрель', tasks: 136 },
  { day: 'Май',    tasks: 148 },
];

const CHART_DATA: Record<Period, { day: string; tasks: number }[]> = {
  '7':  DATA_7,
  '30': DATA_30,
  '90': DATA_90,
};

const SUBTITLE: Record<Period, string> = {
  '7':  'выполненных задач · по дням',
  '30': 'выполненных задач · по неделям',
  '90': 'выполненных задач · по месяцам',
};

// Hex акцентного цвета (CSS-переменная не работает в SVG fill)
const ACCENT   = '#253237';
const ACCENT_D = '#9db4c0';
const MUTED    = '#e2e8ea';
const MUTED_D  = '#2a3a40';

export function ActivityChart({ period }: { period: Period }) {
  const data = CHART_DATA[period];

  const highlightIdx = period === '7'
    ? (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
    : data.length - 1;

  const isDark = useAppSelector(s => s.ui.darkMode);
  const accent = isDark ? ACCENT_D : ACCENT;
  const muted  = isDark ? MUTED_D  : MUTED;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className="t-h3">Активность</span>
        <span className="t-small muted">{SUBTITLE[period]}</span>
      </div>
      <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={period === '7' ? 28 : 44} barCategoryGap="20%">
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#8a9ba8' }}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 8, fontSize: 13 }}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            formatter={(v) => [`${v} задач`, '']}
          />
          <Bar dataKey="tasks" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === highlightIdx ? accent : muted} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
