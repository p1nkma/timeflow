import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  toggleTask, rescheduleTask, moveTaskToEvening,
  selectAllTasks, selectNowMin,
} from '../../../features/tasks';
import { catStyle } from '../../../shared/utils/categories';
import { rangeFmt, fmtCountdown } from '../../../shared/utils/time';
import { TaskModal, CategoryChip } from '../../../shared/ui';
import type { Task } from '../../../shared/types';
import styles from './TaskList.module.css';

/* ── Карточка задачи (стиль Planner) ── */
function TaskCard({
  task, isActive, isNow, isFocused, nowMin, onClick,
}: { task: Task; isActive: boolean; isNow: boolean; isFocused?: boolean; nowMin: number; onClick: () => void }) {
  const dispatch = useAppDispatch();
  const cardRef  = useRef<HTMLDivElement>(null);
  const overdueMins = task.overdue ? nowMin - task.start : 0;

  useEffect(() => {
    if (isFocused && cardRef.current) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      cardRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }
  }, [isFocused]);

  return (
    <div
      ref={cardRef}
      className={[
        styles.task,
        task.done    ? styles.taskDone    : '',
        task.overdue ? styles.taskOverdue : '',
        isActive     ? styles.taskActive  : '',
        isNow        ? styles.taskNow     : '',
        isFocused    ? styles.taskFocused : '',
      ].filter(Boolean).join(' ')}
      style={catStyle(task.cat)}
      role="button" tabIndex={0}
      aria-label={`${task.title}, ${rangeFmt(task.start, task.end)}${task.done ? ', выполнено' : ''}`}
      aria-expanded={isActive}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <button
        type="button"
        className={`${styles.statusDot} ${task.done ? styles.statusDotDone : ''}`}
        aria-label={task.done ? 'Отметить невыполненным' : 'Отметить выполненным'}
        aria-pressed={task.done}
        disabled={task.locked}
        onClick={e => { e.stopPropagation(); dispatch(toggleTask(task.id)); }}
      />
      <div className={styles.taskBody}>
        <span className={styles.taskTime}>{rangeFmt(task.start, task.end)}</span>
        <span className={styles.taskTitle}>{task.title}</span>
        {task.reason && <span className={styles.taskReason}>{task.reason}</span>}
      </div>

      {task.overdue && !task.done && !task.locked ? (
        <div className={styles.overdueActions} onClick={e => e.stopPropagation()}>
          <button
            className={styles.overdueBtn}
            title={`Сдвинуть на ${fmtCountdown(overdueMins)}`}
            onClick={() => dispatch(rescheduleTask({ id: task.id, nowMin }))}
          >
            Сдвинуть
          </button>
          <button
            className={`${styles.overdueBtn} ${styles.overdueBtnSecondary}`}
            title="Перенести в вечерний слот"
            onClick={() => dispatch(moveTaskToEvening(task.id))}
          >
            На вечер
          </button>
        </div>
      ) : (
        <div className={styles.taskMeta}>
          <CategoryChip
            cat={task.cat}
            size="xs"
            uppercase
            label={task.source === 'uni' ? 'ВУЗ' : undefined}
          />
        </div>
      )}
    </div>
  );
}

interface TaskListProps {
  /** Если задан — показываем только задачи в диапазоне [from, to) минут */
  filterRange?: { from: number; to: number; label: string };
  /** ID задачи, на которую нужно проскроллить и подсветить (из Segments → Focus) */
  focusTaskId?: string | null;
  /** Вызывается после того, как фокус был применён */
  onFocusConsumed?: () => void;
  /** Callback при клике на карточку задачи (используется в Segments) */
  onTaskClick?: (id: string) => void;
}

const DONE_COLLAPSE_THRESHOLD = 3;

/* ── Основной компонент ── */
export function TaskList({ filterRange, focusTaskId, onFocusConsumed, onTaskClick }: TaskListProps) {
  const tasks      = useAppSelector(selectAllTasks);
  const nowMin     = useAppSelector(selectNowMin);
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [doneExpanded, setDoneExpanded] = useState(false);

  const allReal = tasks.filter(t => !t.isBreak).sort((a, b) => a.start - b.start);

  const realTasks = filterRange
    ? allReal.filter(t => t.start >= filterRange.from && t.start < filterRange.to)
    : allReal;

  const doneTasks   = realTasks.filter(t => t.done);
  const pendingTasks = realTasks.filter(t => !t.done);
  const shouldCollapse = doneTasks.length >= DONE_COLLAPSE_THRESHOLD;

  const activeTask = activeId ? tasks.find(t => t.id === activeId) ?? null : null;
  const nowHour    = Math.floor(nowMin / 60);

  useEffect(() => {
    if (focusTaskId) {
      setActiveId(focusTaskId);
      onFocusConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTaskId]);

  function handleClick(id: string) {
    if (onTaskClick) {
      onTaskClick(id);
      return;
    }
    setActiveId(id);
  }

  function renderCard(t: Task) {
    const taskHour = Math.floor(t.start / 60);
    const isNow    = taskHour === nowHour && t.start <= nowMin && t.end > nowMin;
    return (
      <li key={t.id}>
        <TaskCard
          task={t}
          isActive={activeId === t.id}
          isNow={isNow}
          isFocused={focusTaskId === t.id}
          nowMin={nowMin}
          onClick={() => handleClick(t.id)}
        />
      </li>
    );
  }

  const label = filterRange ? filterRange.label : 'Задачи дня';

  if (realTasks.length === 0) {
    if (filterRange) {
      return (
        <div className={styles.empty}>
          <span className="t-body muted">В этом блоке задач нет</span>
        </div>
      );
    }
    // На полном Today empty state уже показан в HeroFocus — здесь не дублируем
    return null;
  }

  return (
    <div className={styles.list}>
        <div className={styles.listHeader}>
          <span className="t-xs muted">
            {label}
          </span>
          <span className="t-small t-num muted">
            {doneTasks.length} / {realTasks.length} выполнено
          </span>
        </div>

        <ul className={styles.taskList}>
          {/* Невыполненные — всегда видны */}
          {pendingTasks.map(renderCard)}

          {/* Разделитель — только если есть и те и другие */}
          {doneTasks.length > 0 && pendingTasks.length > 0 && (
            <li className={styles.doneDivider} aria-hidden />
          )}

          {/* Выполненные: коллапс при >= 5 */}
          {shouldCollapse && !doneExpanded ? (
            <li>
              <button
                className={styles.doneCollapseBtn}
                onClick={() => setDoneExpanded(true)}
              >
                + ещё {doneTasks.length} выполненных
              </button>
            </li>
          ) : (
            <>
              {doneTasks.map(renderCard)}
              {shouldCollapse && doneExpanded && (
                <li>
                  <button
                    className={styles.doneCollapseBtn}
                    onClick={() => setDoneExpanded(false)}
                  >
                    Свернуть выполненные
                  </button>
                </li>
              )}
            </>
          )}
        </ul>

      {activeTask && !onTaskClick && (
        <TaskModal task={activeTask} onClose={() => setActiveId(null)} />
      )}
    </div>
  );
}
