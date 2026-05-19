import { Icon, Fire02Icon } from '../../../shared/ui';
import styles from './KpiRow.module.css';

type Period = '7' | '30' | '90';

interface KpiRowProps {
  period: Period;
}

const DATA: Record<Period, {
  tasks: number; tasksOf: number; tasksUp: boolean; tasksDelta: string;
  streak: number;
  deep: string; deepDelta: string; deepUp: boolean;
  onTime: string; onTimeDelta: string; onTimeUp: boolean;
}> = {
  '7': {
    tasks: 47, tasksOf: 58, tasksUp: true,  tasksDelta: '+12%',
    streak: 7,
    deep: '3.2 ч/день', deepDelta: '−0.4 ч',  deepUp: false,
    onTime: '81%',       onTimeDelta: '+5%',    onTimeUp: true,
  },
  '30': {
    tasks: 164, tasksOf: 198, tasksUp: true, tasksDelta: '+8%',
    streak: 7,
    deep: '3.5 ч/день', deepDelta: '+0.3 ч', deepUp: true,
    onTime: '78%',       onTimeDelta: '−3%',  onTimeUp: false,
  },
  '90': {
    tasks: 470, tasksOf: 580, tasksUp: true, tasksDelta: '+6%',
    streak: 7,
    deep: '3.3 ч/день', deepDelta: '+0.1 ч', deepUp: true,
    onTime: '80%',       onTimeDelta: '+2%',  onTimeUp: true,
  },
};

export function KpiRow({ period }: KpiRowProps) {
  const d = DATA[period];

  return (
    <div className={styles.row}>
      <div className={styles.metric}>
        <span className={styles.value}>{d.tasks}<span className={styles.of}>/{d.tasksOf}</span></span>
        <span className={styles.label}>задач</span>
        <span className={`${styles.delta} ${d.tasksUp ? styles.up : styles.down}`}>{d.tasksDelta}</span>
      </div>

      <div className={styles.sep} aria-hidden />

      <div className={styles.metric}>
        <Icon icon={Fire02Icon} size={14} className={styles.fireIcon} aria-hidden />
        <span className={styles.value}>{d.streak}</span>
        <span className={styles.label}>дней подряд</span>
      </div>

      <div className={styles.sep} aria-hidden />

      <div className={styles.metric}>
        <span className={styles.value}>{d.deep}</span>
        <span className={styles.label}>глубокая работа</span>
        <span className={`${styles.delta} ${d.deepUp ? styles.up : styles.down}`}>{d.deepDelta}</span>
      </div>

      <div className={styles.sep} aria-hidden />

      <div className={styles.metric}>
        <span className={styles.value}>{d.onTime}</span>
        <span className={styles.label}>в срок</span>
        <span className={`${styles.delta} ${d.onTimeUp ? styles.up : styles.down}`}>{d.onTimeDelta}</span>
      </div>
    </div>
  );
}
