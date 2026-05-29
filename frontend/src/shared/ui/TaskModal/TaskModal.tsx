import { useState } from 'react';
import { catStyle } from '../../utils/categories';
import { Icon, Cancel01Icon, Delete01Icon, Edit01Icon } from '../Icon/Icon';
import { ModalShell } from '../ModalShell/ModalShell';
import type { Task } from '../../types';
import { DeleteConfirm } from './DeleteConfirm';
import { ViewMode }      from './ViewMode';
import { EditMode }      from './EditMode';
import styles from './TaskModal.module.css';

type ModalMode = 'view' | 'edit';

interface TaskModalProps { task: Task; onClose: () => void; }

export function TaskModal({ task, onClose }: TaskModalProps) {
  const [mode, setMode]             = useState<ModalMode>('view');
  const [showDelete, setShowDelete] = useState(false);

  if (showDelete) {
    return <DeleteConfirm task={task} onClose={onClose} />;
  }

  return (
    <ModalShell
      onClose={onClose}
      backdropClassName={styles.backdrop}
      className={styles.modal}
      ariaLabel={task.title}
    >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.catDot} style={catStyle(task.cat)} />
            <span className={styles.headerTitle} title={task.title}>
              {task.title}
            </span>
          </div>
          <div className={styles.headerActions}>
            {!task.locked && mode === 'view' && (<>
              <button
                className={styles.closeBtn}
                onClick={() => setMode('edit')}
                aria-label="Редактировать задачу"
                title="Редактировать"
              >
                <Icon icon={Edit01Icon} size={14} />
              </button>
              <button
                className={`${styles.closeBtn} ${styles.closeBtnDanger}`}
                onClick={() => setShowDelete(true)}
                aria-label="Удалить задачу"
                title="Удалить"
              >
                <Icon icon={Delete01Icon} size={14} />
              </button>
            </>)}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
              <Icon icon={Cancel01Icon} size={14} />
            </button>
          </div>
        </div>

        {mode === 'view' && <ViewMode task={task} onClose={onClose} />}
        {mode === 'edit' && (
          <EditMode
            task={task}
            onSaved={() => setMode('view')}
            onDiscard={() => setMode('view')}
            onDelete={() => setShowDelete(true)}
          />
        )}
    </ModalShell>
  );
}

export { NewTaskModal } from './NewTaskModal';
