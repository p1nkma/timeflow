import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { selectAllTasks, selectNowMin } from '../../../features/tasks';
import { useTaskApi } from '../../../features/tasks/useTaskApi';
import { showToast } from '../../../features/ui';
import { findFreeSlot, rangeFmt, fmt, fmtCountdown } from '../../utils/time';
import { Icon, SparklesIcon, LockIcon } from '../Icon/Icon';
import { TimePicker } from '../TimePicker/TimePicker';
import type { Task } from '../../types';
import styles from './TaskModal.module.css';

interface Props { task: Task; onClose: () => void; }

export function ViewMode({ task, onClose }: Props) {
  const dispatch  = useAppDispatch();
  const taskApi   = useTaskApi();
  const nowMin    = useAppSelector(selectNowMin);
  const allTasks  = useAppSelector(selectAllTasks);

  const dur         = task.end - task.start;
  const otherTasks  = allTasks.filter(t => t.id !== task.id && !t.done);
  const overdueMins = task.overdue ? Math.max(0, nowMin - task.start) : 0;
  const isOverdue   = task.overdue && !task.done && !task.locked;

  const tomorrowIso  = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowBusy = allTasks.filter(t => t.date === tomorrowIso && t.id !== task.id);

  function handleMoveToTomorrow() {
    const newStart = findFreeSlot(tomorrowBusy, dur, 9 * 60, 21 * 60);
    taskApi.moveTaskToDate(task.id, tomorrowIso, newStart);
    dispatch(showToast({ message: `Перенесено на завтра, ${fmt(newStart)}`, variant: 'success' }));
    onClose();
  }

  function handleReturnToInbox() {
    taskApi.removeFromSchedule(task.id);
    taskApi.addInboxItem({ title: task.title, cat: task.cat });
    dispatch(showToast({ message: 'Возвращено в Inbox', variant: 'default' }));
    onClose();
  }

  const suggestedStart = isOverdue
    ? findFreeSlot(otherTasks, dur, nowMin, 23 * 60)
    : null;

  const [showPicker, setShowPicker]   = useState(false);
  const [customStart, setCustomStart] = useState(nowMin);

  const customEnd = customStart + dur;
  const conflict  = otherTasks.find(t => customStart < t.end && customEnd > t.start);

  return (
    <div className={styles.body}>
      <p className={`${styles.viewTitle} ${task.done ? styles.viewTitleDone : ''}`}>
        {task.title}
      </p>

      <div className={styles.viewMeta}>
        <span className={styles.viewTime}>
          {rangeFmt(task.start, task.end)} · {task.end - task.start} мин
        </span>
        {task.source === 'ai' && (
          <span className={`${styles.badge} ${styles.badgeAi}`}>
            <Icon icon={SparklesIcon} size={12} />
            ИИ
          </span>
        )}
        {task.locked && (
          <span className={`${styles.badge} ${styles.badgeLocked}`}>
            <Icon icon={LockIcon} size={12} />
            Вуз
          </span>
        )}
      </div>

      {task.reasonLong && !isOverdue && (
        <div className={styles.reasonBlock}>{task.reasonLong}</div>
      )}

      {task.notes && (
        <div className={styles.notesBlock}>{task.notes}</div>
      )}

      {isOverdue && suggestedStart !== null && (
        <div className={styles.overdueBlock}>
          <span className={styles.overdueLabel}>
            Просрочено на {fmtCountdown(overdueMins)}
          </span>
          <div className={styles.overdueActions}>
            <button
              className={`${styles.btnOverdue} ${styles.btnOverdueFull}`}
              onClick={() => { taskApi.rescheduleTask(task.id); onClose(); }}
            >
              Сдвинуть → {rangeFmt(suggestedStart, suggestedStart + dur)}
            </button>
            <button
              className={`${styles.btnOverdue} ${styles.btnOverdueSecondary} ${styles.btnOverdueFull}`}
              onClick={() => { setCustomStart(nowMin); setShowPicker(p => !p); }}
            >
              {showPicker ? 'Скрыть' : 'Выбрать время вручную'}
            </button>
          </div>

          {showPicker && (
            <div className={styles.customPickerWrap}>
              <TimePicker value={customStart} onChange={setCustomStart} step={15} />
              <div className={styles.customPickerInfo}>
                {conflict
                  ? <span className={styles.customConflict}>Пересекается с «{conflict.title}» ({rangeFmt(conflict.start, conflict.end)})</span>
                  : <span className={styles.customOk}>{rangeFmt(customStart, customEnd)} — слот свободен</span>
                }
              </div>
              <button
                className={styles.btnOverduePrimary}
                onClick={() => { taskApi.reorderTask(task.id, customStart); onClose(); }}
              >
                Поставить в {fmt(customStart)}
              </button>
            </div>
          )}
        </div>
      )}

      {!task.locked && (
        <div className={styles.footer}>
          <button
            className={`${styles.btnPrimary} ${task.done ? styles.btnDoneActive : ''}`}
            onClick={() => { taskApi.toggleTask(task.id); onClose(); }}
          >
            {task.done ? 'Отменить выполнение' : 'Выполнено'}
          </button>
          {!task.done && (
            <button className={styles.btnSecondary} onClick={handleMoveToTomorrow}>
              На завтра
            </button>
          )}
          <button className={styles.btnSecondary} onClick={handleReturnToInbox}>
            В Inbox
          </button>
        </div>
      )}
    </div>
  );
}
