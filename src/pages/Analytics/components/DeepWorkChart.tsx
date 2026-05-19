import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAppSelector } from '../../../app/hooks';
import styles from './DeepWorkChart.module.css';

type Period = '7' | '30' | '90';

const DATA_7 = [
  { day: 'Пн', hrs: 2.5 },
  { day: 'Вт', hrs: 4.2 },
  { day: 'Ср', hrs: 3.0 },
  { day: 'Чт', hrs: 1.8 },
  { day: 'Пт', hrs: 3.8 },
  { day: 'Сб', hrs: 1.2 },
  { day: 'Вс', hrs: 1.5 },
];

const DATA_30 = [
  { day: 'Нед 1', hrs: 18.0 },
  { day: 'Нед 2', hrs: 24.5 },
  { day: 'Нед 3', hrs: 16.0 },
  { day: 'Нед 4', hrs: 22.0 },
];

const DATA_90 = [
  { day: 'Март',   hrs: 72 },
  { day: 'Апрель', hrs: 85 },
  { day: 'Май',    hrs: 90 },
];

const CHART_DATA: Record<Period, { day: string; hrs: number }[]> = {
  '7':  DATA_7,
  '30': DATA_30,
  '90': DATA_90,
};

const AVG: Record<Period, number> = { '7': 2.6, '30': 20.1, '90': 82.3 };

const SUBTITLE: Record<Period, string> = {
  '7':  'часов · по дням',
  '30': 'часов · по неделям',
  '90': 'часов · по месяцам',
};

const ACCENT   = '#253237';
const ACCENT_D = '#9db4c0';

export function DeepWorkChart({ period }: { period: Period }) {
  const data   = CHART_DATA[period];
  const avg    = AVG[period];
  const isDark = useAppSelector(s => s.ui.darkMode);
  const color  = isDark ? ACCENT_D : ACCENT;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className="t-h3">Глубокая работа</span>
        <span className="t-small muted">{SUBTITLE[period]}</span>
      </div>
      <div style={{ width: '100%', height: 140 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="deepGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#8a9ba8' }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(v) => [`${v} ч`, 'Глубокая работа']}
            />
            <ReferenceLine
              y={avg}
              stroke={color}
              strokeDasharray="4 3"
              strokeOpacity={0.35}
              label={{ value: `ср. ${avg}`, position: 'right', fontSize: 11, fill: '#8a9ba8' }}
            />
            <Area
              type="monotone"
              dataKey="hrs"
              stroke={color}
              strokeWidth={2}
              fill="url(#deepGrad)"
              dot={{ fill: color, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
