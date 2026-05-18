import { useAppSelector } from '../../../app/hooks';
import { selectAllTasks } from '../../../features/tasks/tasksSelectors';
import { catStyle, CATEGORIES } from '../../../shared/utils/categories';
import type { Task } from '../../../shared/types';
import styles from './SegmentsView.module.css';

const SEGMENTS = [
  { key: 'morning', label: 'Утро',   sub: 'до 12:00',    from: 0,    to: 720  },
  { key: 'day',     label: 'День',   sub: '12—17',        from: 720,  to: 1020 },
  { key: 'evening', label: 'Вечер',  sub: 'после 17',     from: 1020, to: 1440 },
];

function SegmentCard({ label, sub, tasks, active }: {
  label: string; sub: string; tasks: Task[]; active: boolean;
}) {
  const real    = tasks.filter(t => !t.isBreak);
  const done    = real.filter(t => t.done);
  const current = real.find(t => !t.done);
  const cats    = [...new Set(real.map(t => t.cat))].slice(0, 5);

  return (
    <div className={`${styles.card} ${active ? styles.active : ''}`}>
      <div className={styles.cardHead}>
        <div>
          <div className="t-h3">{label}</div>
          <div className="t-small muted">{sub}</div>
        </div>
        <div className={`t-small ${styles.count}`}>
          {done.length}/{real.length}
        </div>
      </div>

      {current ? (
        <>
          <div className={`t-body-md ${styles.currentTitle}`}>{current.title}</div>
          {current.reason && (
            <div className="t-xs muted">{current.reason}</div>
          )}
        </>
      ) : real.length > 0 ? (
        <div className="t-small muted">закрыто</div>
      ) : (
        <div className="t-small muted">нет задач</div>
      )}

      <div className={styles.dots}>
        {cats.map(cat => (
          <span key={cat} className={styles.dot} style={catStyle(cat)} title={CATEGORIES[cat].label} />
        ))}
      </div>
    </div>
  );
}

export function SegmentsView() {
  const tasks  = useAppSelector(selectAllTasks);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <div className={styles.wrap}>
      <div className={styles.hint} aria-hidden>Три блока дня — фокус на то, где ты сейчас</div>
      <div className={styles.grid}>
        {SEGMENTS.map(seg => {
          const segTasks = tasks.filter(t => t.start >= seg.from && t.start < seg.to);
          const active   = nowMin >= seg.from && nowMin < seg.to;
          return (
            <SegmentCard
              key={seg.key}
              label={seg.label}
              sub={seg.sub}
              tasks={segTasks}
              active={active}
            />
          );
        })}
      </div>
    </div>
  );
}
