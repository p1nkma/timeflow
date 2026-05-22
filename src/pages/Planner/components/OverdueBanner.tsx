import { useAppSelector } from '../../../app/hooks';
import { selectAllTasks } from '../../../features/tasks';
import styles from './OverdueBanner.module.css';

export function OverdueBanner() {
  const overdue = useAppSelector(s => selectAllTasks(s).filter(t => t.overdue && !t.done));
  if (overdue.length === 0) return null;

  return (
    <div className={styles.banner}>
      <svg className={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
      </svg>
      <span className="t-body-md">
        <strong>Просрочено:</strong>{' '}
        {overdue.map(t => t.title).join(', ')}
      </span>
    </div>
  );
}
