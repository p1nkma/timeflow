import { useState } from 'react';
import { useTaskApi } from '../../../features/tasks/useTaskApi';
import { Icon, Cancel01Icon, Delete01Icon } from '../Icon/Icon';
import { ModalShell } from '../ModalShell/ModalShell';
import type { Task } from '../../types';
import styles from './TaskModal.module.css';

interface Props { task: Task; onClose: () => void; }

export function DeleteConfirm({ task, onClose }: Props) {
  const taskApi   = useTaskApi();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ModalShell
      onClose={onClose}
      backdropClassName={styles.backdrop}
      className={styles.modal}
      ariaLabel="Удалить задачу"
    >
        <div className={styles.header}>
          <span className={styles.headerTitle}>Удалить задачу</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.deleteWarning}>
            «{task.title}» будет удалена без возможности восстановления.
          </div>

          <label className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Я понимаю, удалить</span>
            <span className={styles.toggle}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
              />
              <span className={styles.toggleTrack}><span className={styles.toggleThumb} /></span>
            </span>
          </label>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.btnDanger}
            disabled={!confirmed}
            onClick={() => { taskApi.deleteTask(task.id); onClose(); }}
          >
            <Icon icon={Delete01Icon} size={14} />
            Удалить
          </button>
          <button className={styles.btnSecondary} onClick={onClose}>Отмена</button>
        </div>
    </ModalShell>
  );
}
