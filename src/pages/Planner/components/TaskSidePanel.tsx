import { Icon, PlusSignIcon } from '../../../shared/ui';
import { InboxPanel } from './InboxPanel';
import styles from './TaskSidePanel.module.css';

interface Props {
  onNewTask: () => void;
}

export function TaskSidePanel({ onNewTask }: Props) {
  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Inbox</span>
        <button className={styles.btnAdd} onClick={onNewTask} aria-label="Добавить задачу">
          <Icon icon={PlusSignIcon} size={16} />
          Задача
        </button>
      </div>
      <InboxPanel />
    </aside>
  );
}
