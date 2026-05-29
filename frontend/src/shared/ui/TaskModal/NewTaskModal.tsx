import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { selectAllTasks, selectNowMin } from '../../../features/tasks';
import { useTaskApi } from '../../../features/tasks/useTaskApi';
import { showToast } from '../../../features/ui';
import { findFreeSlot } from '../../utils/time';
import { Icon, Cancel01Icon } from '../Icon/Icon';
import { ModalShell } from '../ModalShell/ModalShell';
import { TaskForm } from './TaskForm';
import { TODAY_ISO } from './constants';
import { formValuesToTaskPatch, useTaskForm } from './useTaskForm';
import styles from './TaskModal.module.css';

interface Props {
  onClose: () => void;
  defaultDestination?: 'schedule' | 'inbox';
  defaultDate?: string;    // ISO YYYY-MM-DD
  defaultStart?: number;   // minutes from midnight
}

export function NewTaskModal({ onClose, defaultDestination = 'schedule', defaultDate, defaultStart: defaultStartProp }: Props) {
  const dispatch = useAppDispatch();
  const taskApi  = useTaskApi();
  const allTasks = useAppSelector(selectAllTasks);
  const nowMin   = useAppSelector(selectNowMin);
  const planner  = useAppSelector(s => s.planner);
  const today    = TODAY_ISO();

  const resolvedDate = defaultDate ?? today;

  const autoStart = (() => {
    if (defaultStartProp !== undefined) return defaultStartProp;
    const dateBusy = allTasks.filter(t => !t.isBreak && (t.date ?? today) === resolvedDate);
    return findFreeSlot(
      dateBusy,
      60,
      Math.max(nowMin, planner.workStart),
      planner.workEnd,
    );
  })();

  const form = useTaskForm({
    title:       '',
    cat:         planner.enabledCategories[0] ?? '',
    date:        resolvedDate,
    start:       autoStart,
    duration:    60,
    energy:      null,
    destination: defaultDestination,
    notes:       '',
  });

  const isInbox = form.values.destination === 'inbox';

  function handleSubmit() {
    if (!form.isValid) return;

    if (isInbox) {
      taskApi.addInboxItem({ title: form.values.title.trim(), cat: form.values.cat });
      dispatch(showToast({ message: 'Добавлено в Inbox', variant: 'default' }));
    } else {
      const patch = formValuesToTaskPatch(form.values);
      const id = taskApi.addTask({ ...patch, source: 'user' });
      dispatch(showToast({ message: 'Задача создана', variant: 'success', undoId: id }));
    }

    onClose();
  }

  return (
    <ModalShell
      onClose={onClose}
      backdropClassName={styles.backdrop}
      className={styles.newModal}
      ariaLabel="Новая задача"
    >
        {/* Header: title + close */}
        <div className={styles.newHeader}>
          <span className={styles.newHeaderTitle}>Новая задача</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        </div>

        {/* Destination segmented control — full width, prominent */}
        <div className={styles.newDestRow}>
          <div className={styles.newSegmented}>
            <button
              className={`${styles.newSegBtn} ${!isInbox ? styles.newSegBtnActive : ''}`}
              onClick={() => form.update('destination', 'schedule')}
            >
              В расписание
            </button>
            <button
              className={`${styles.newSegBtn} ${isInbox ? styles.newSegBtnActive : ''}`}
              onClick={() => form.update('destination', 'inbox')}
            >
              В Inbox
            </button>
          </div>
        </div>

        <div className={styles.newBody}>
          <TaskForm
            values={form.values}
            update={form.update}
            autoFocusTitle
            titlePlaceholder="Что нужно сделать?"
            notesLabel="Заметки"
            onSubmitOnEnter={handleSubmit}
          />
        </div>

        <div className={styles.newFooter}>
          <button className={styles.btnPrimary} onClick={handleSubmit} disabled={!form.isValid}>
            {isInbox ? 'Добавить в Inbox' : 'Добавить в расписание'}
          </button>
          <button className={styles.btnSecondary} onClick={onClose}>Отмена</button>
        </div>
    </ModalShell>
  );
}
