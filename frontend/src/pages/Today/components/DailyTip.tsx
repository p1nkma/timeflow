import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { addTask, selectAllTasks, selectNowMin } from '../../../features/tasks';
import { removeInboxItem } from '../../../features/inbox';
import { showToast } from '../../../features/ui';
import {
  getDailyHint,
  formatSlotRange,
  type DailyHint,
} from '../../../shared/utils/dailyHint';
import { fmt } from '../../../shared/utils/time';
import { Icon, Cancel01Icon } from '../../../shared/ui';
import styles from './DailyTip.module.css';

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

export function DailyTip() {
  const dispatch = useAppDispatch();
  const allTasks = useAppSelector(selectAllTasks);
  const nowMin   = useAppSelector(selectNowMin);
  const inbox    = useAppSelector(s => s.inbox);
  const planner  = useAppSelector(s => s.planner);

  const [dismissed, setDismissed] = useState(false);
  const [skippedInboxIds, setSkippedInboxIds] = useState<string[]>([]);

  const today = TODAY_ISO();
  const todayTasks = useMemo(
    () => allTasks.filter(t => (t.date ?? today) === today),
    [allTasks, today],
  );

  const filteredInbox = useMemo(
    () => inbox.filter(i => !skippedInboxIds.includes(i.id)),
    [inbox, skippedInboxIds],
  );

  const hint = useMemo(
    () => getDailyHint({ tasks: todayTasks, inbox: filteredInbox, planner, nowMin }),
    [todayTasks, filteredInbox, planner, nowMin],
  );

  if (!hint || dismissed) return null;

  function handleScheduleFromInbox(h: Extract<DailyHint, { kind: 'free-slot' }>) {
    const duration = Math.min(h.slotEnd - h.slotStart, 60);
    dispatch(addTask({
      title:  h.inboxItem.title,
      cat:    h.inboxItem.cat,
      date:   today,
      start:  h.slotStart,
      end:    h.slotStart + duration,
      source: 'user',
    }));
    dispatch(removeInboxItem(h.inboxItem.id));
    dispatch(showToast({
      message: `Поставлено на ${fmt(h.slotStart)}`,
      variant: 'success',
    }));
  }

  function handleSkipInbox(itemId: string) {
    setSkippedInboxIds(prev => [...prev, itemId]);
  }

  return (
    <div className={styles.tip} role="region" aria-label="Совет дня">
      <div className={styles.body}>
        <div className={styles.label}>Совет дня</div>
        {renderHintContent(hint, handleScheduleFromInbox, handleSkipInbox)}
      </div>
      <button
        type="button"
        className={styles.dismissBtn}
        onClick={() => setDismissed(true)}
        aria-label="Скрыть совет"
      >
        <Icon icon={Cancel01Icon} size={12} />
      </button>
    </div>
  );
}

function renderHintContent(
  hint: DailyHint,
  onSchedule: (h: Extract<DailyHint, { kind: 'free-slot' }>) => void,
  onSkipInbox: (itemId: string) => void,
) {
  switch (hint.kind) {
    case 'overdue':
      return (
        <p className={styles.text}>
          {hint.count === 1
            ? '1 задача просрочена — открой её в списке, чтобы перенести'
            : `${hint.count} задач просрочены — перенеси их из списка`}
        </p>
      );

    case 'empty-day':
      return (
        <p className={styles.text}>
          На сегодня ничего не запланировано. Нажми «Сгенерировать план» или добавь задачи вручную.
        </p>
      );

    case 'free-slot':
      return (
        <>
          <p className={styles.text}>
            Свободно <span className="t-num">{formatSlotRange(hint.slotStart, hint.slotEnd)}</span>.
            Поставить <strong>«{hint.inboxItem.title}»</strong>?
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => onSchedule(hint)}
            >
              Поставить
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => onSkipInbox(hint.inboxItem.id)}
            >
              Другую задачу
            </button>
          </div>
        </>
      );

    case 'peak-unused':
      return (
        <p className={styles.text}>
          Твой пик энергии <span className="t-num">{formatSlotRange(hint.peakStart, hint.peakEnd)}</span> — а тяжёлых задач в этом окне нет.
        </p>
      );
  }
}
