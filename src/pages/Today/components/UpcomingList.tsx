import { useAppSelector } from '../../../app/hooks';
import { selectUpcomingTasks } from '../../../features/tasks/tasksSelectors';
import { catStyle } from '../../../shared/utils/categories';
import { fmt } from '../../../shared/utils/time';
import styles from './UpcomingList.module.css';

export function UpcomingList() {
  const tasks = useAppSelector(selectUpcomingTasks);

  if (tasks.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <h3 className="t-h3">Предстоит сегодня</h3>
      <ul className={styles.list}>
        {tasks.map(t => (
          <li key={t.id} className={styles.item} style={catStyle(t.cat)}>
            <span className={`t-small ${styles.time}`}>{fmt(t.start)}</span>
            <span className={`t-body-md ${styles.title}`}>{t.title}</span>
            <span className={styles.badge}>{t.cat}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
