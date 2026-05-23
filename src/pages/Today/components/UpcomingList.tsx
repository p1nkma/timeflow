import { useAppSelector } from '../../../app/hooks';
import { selectUpcomingTasks, selectCurrentTask, selectNextTask } from '../../../features/tasks';
import { catStyle } from '../../../shared/utils/categories';
import { fmt } from '../../../shared/utils/time';
import { CategoryChip } from '../../../shared/ui';
import styles from './UpcomingList.module.css';

interface Props {
  onTaskClick?: (id: string) => void;
}

export function UpcomingList({ onTaskClick }: Props) {
  const current  = useAppSelector(selectCurrentTask);
  const next     = useAppSelector(selectNextTask);
  const upcoming = useAppSelector(selectUpcomingTasks);

  // HeroFocus показывает current (или next если current нет) — исключаем обе
  const heroId = current?.id ?? next?.id;
  const tasks  = upcoming.filter(t => t.id !== heroId);

  if (tasks.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <h3 className="t-h3">Предстоит сегодня</h3>
      <ul className={styles.list}>
        {tasks.map(t => (
          <li
            key={t.id}
            className={`${styles.item} ${onTaskClick ? styles.itemClickable : ''}`}
            style={catStyle(t.cat)}
            onClick={() => onTaskClick?.(t.id)}
            role={onTaskClick ? 'button' : undefined}
            tabIndex={onTaskClick ? 0 : undefined}
            onKeyDown={onTaskClick ? e => { if (e.key === 'Enter' || e.key === ' ') onTaskClick(t.id); } : undefined}
          >
            <span className={`t-small ${styles.time}`}>{fmt(t.start)}</span>
            <span className={`t-body-md ${styles.title}`}>{t.title}</span>
            <CategoryChip cat={t.cat} size="xs" uppercase />

          </li>
        ))}
      </ul>
    </div>
  );
}
