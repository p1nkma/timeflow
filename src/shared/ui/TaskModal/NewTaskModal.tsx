import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { addTask, selectAllTasks, selectNowMin } from '../../../features/tasks';
import { findFreeSlot } from '../../utils/time';
import { Icon, Cancel01Icon } from '../Icon/Icon';
import { TaskForm } from './TaskForm';
import { TODAY_ISO } from './constants';
import { formValuesToTaskPatch, useTaskForm } from './useTaskForm';
import styles from './TaskModal.module.css';

interface Props { onClose: () => void; }

export function NewTaskModal({ onClose }: Props) {
  const dispatch = useAppDispatch();
  const allTasks = useAppSelector(selectAllTasks);
  const nowMin   = useAppSelector(selectNowMin);
  const planner  = useAppSelector(s => s.planner);
  const today    = TODAY_ISO();

  const todayBusy    = allTasks.filter(t => !t.date || t.date === today);
  const defaultStart = findFreeSlot(
    todayBusy,
    60,
    Math.max(nowMin, planner.workStart),
    planner.workEnd,
  );

  const form = useTaskForm({
    title:    '',
    cat:      'study',
    date:     today,
    start:    defaultStart,
    duration: 60,
    notes:    '',
  });

  function handleSubmit() {
    if (!form.isValid) return;
    dispatch(addTask({ ...formValuesToTaskPatch(form.values), source: 'user' }));
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Новая задача">
        <div className={styles.header}>
          <span className={styles.headerTitle}>Новая задача</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        </div>

        <div className={styles.body}>
          <TaskForm
            values={form.values}
            update={form.update}
            autoFocusTitle
            titlePlaceholder="Что нужно сделать?"
            notesLabel="Заметки (необязательно)"
            onSubmitOnEnter={handleSubmit}
          />
        </div>

        <div className={styles.footer}>
          <button className={styles.btnPrimary} onClick={handleSubmit} disabled={!form.isValid}>
            Добавить в расписание
          </button>
          <button className={styles.btnSecondary} onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
