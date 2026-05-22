import { useAppSelector } from '../../../app/hooks';
import { selectDoneTasks, selectRealTasks } from '../../../features/tasks';
import { fmtCountdown } from '../../../shared/utils/time';
import styles from './ProgressRing.module.css';

const R = 54;
const CIRC = 2 * Math.PI * R;

export function ProgressRing() {
  const all  = useAppSelector(selectRealTasks);
  const done = useAppSelector(selectDoneTasks);

  const total     = all.length;
  const doneCount = done.length;
  const pct       = total > 0 ? doneCount / total : 0;
  const remaining = all.filter(t => !t.done);
  // Считаем только рабочее время (без перерывов), чтобы не пугать лишними часами
  const remMin    = remaining
    .filter(t => !t.isBreak)
    .reduce((s, t) => s + (t.end - t.start), 0);

  const dash = CIRC * pct;
  const gap  = CIRC - dash;

  return (
    <div className={styles.wrap}>
      <div className={styles.ring}>
        <svg className={styles.svg} viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={R} className={styles.track} />
          <circle
            cx="64" cy="64" r={R}
            className={styles.progress}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={CIRC / 4}
          />
        </svg>
        <div className={styles.pct}>{Math.round(pct * 100)}%</div>
      </div>
      <div className={styles.stats}>
        <span className="t-body">
          <strong>{doneCount} из {total}</strong> задач выполнено
        </span>
        {remaining.length > 0 && (
          <>
            <span className="t-small muted">
              Осталось {remaining.length} задач · {fmtCountdown(remMin)}
            </span>
            <span className="t-xs tertiary">За весь день</span>
          </>
        )}
      </div>
    </div>
  );
}
