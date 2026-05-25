import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { selectAllTasks, deleteTask, moveTaskToDate } from '../../../features/tasks';
import { Icon, Cancel01Icon } from '../../../shared/ui/Icon/Icon';
import { ModalShell } from '../../../shared/ui/ModalShell/ModalShell';
import { fmt } from '../../../shared/utils/time';
import type { Task } from '../../../shared/types';
import styles from './OverdueBanner.module.css';

function ReschedulePopover({
  task, onClose,
}: { task: Task; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const today    = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(task.start);

  function confirm() {
    dispatch(moveTaskToDate({ id: task.id, date, newStart: time }));
    onClose();
  }

  return (
    <ModalShell
      onClose={onClose}
      backdropClassName={styles.backdrop}
      className={styles.popover}
      ariaLabel={`Перенести: ${task.title}`}
    >
        <div className={styles.popoverTitle}>Перенести: {task.title}</div>
        <div className={styles.popoverRow}>
          <span className={styles.popoverLabel}>Дата</span>
          <div className={styles.dateBtns}>
            <button
              className={`${styles.dateBtn} ${date === today ? styles.dateBtnActive : ''}`}
              onClick={() => setDate(today)}
            >Сегодня</button>
            <button
              className={`${styles.dateBtn} ${date === tomorrow ? styles.dateBtnActive : ''}`}
              onClick={() => setDate(tomorrow)}
            >Завтра</button>
          </div>
        </div>
        <div className={styles.popoverRow}>
          <span className={styles.popoverLabel}>Время</span>
          <select
            className={styles.timeSelect}
            value={time}
            onChange={e => setTime(Number(e.target.value))}
          >
            {Array.from({ length: 34 }, (_, i) => {
              const min = (6 + Math.floor(i / 2)) * 60 + (i % 2) * 30;
              return <option key={min} value={min}>{fmt(min)}</option>;
            })}
          </select>
        </div>
        <button className={styles.confirmBtn} onClick={confirm}>Перенести</button>
    </ModalShell>
  );
}

export function OverdueBanner() {
  const overdue  = useAppSelector(s => selectAllTasks(s).filter(t => t.overdue && !t.done && !t.locked));
  const dispatch = useAppDispatch();
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  if (overdue.length === 0) return null;

  const rescheduleTask = rescheduleId ? overdue.find(t => t.id === rescheduleId) : null;

  return (
    <>
      <div className={styles.banner}>
        <svg className={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
        </svg>
        <div className={styles.list}>
          {overdue.map(t => (
            <div key={t.id} className={styles.item}>
              <span className={styles.itemTitle}>{t.title}</span>
              <div className={styles.itemActions}>
                <button
                  className={styles.actionBtn}
                  aria-label="Перенести задачу"
                  onClick={() => setRescheduleId(id => id === t.id ? null : t.id)}
                >
                  Перенести
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDismiss}`}
                  aria-label="Удалить задачу"
                  onClick={() => dispatch(deleteTask(t.id))}
                >
                  <Icon icon={Cancel01Icon} size={12} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {rescheduleTask && (
        <ReschedulePopover
          task={rescheduleTask}
          onClose={() => setRescheduleId(null)}
        />
      )}
    </>
  );
}
