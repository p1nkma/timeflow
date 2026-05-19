import { useAppSelector } from '../../../app/hooks';
import { selectUpcomingTasks, selectCurrentTask, selectNextTask } from '../../../features/tasks/tasksSelectors';
import { catStyle, CATEGORIES } from '../../../shared/utils/categories';
import { fmt } from '../../../shared/utils/time';
import styles from './UpcomingList.module.css';

export function UpcomingList() {
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
          <li key={t.id} className={styles.item} style={catStyle(t.cat)}>
            <span className={`t-small ${styles.time}`}>{fmt(t.start)}</span>
            <span className={`t-body-md ${styles.title}`}>{t.title}</span>
            <span className={styles.badge}>{CATEGORIES[t.cat]?.label ?? t.cat}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
