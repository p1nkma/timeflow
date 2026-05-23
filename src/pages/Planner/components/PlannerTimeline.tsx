import { useMemo, useState } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { ru } from 'date-fns/locale';
import { useDroppable } from '@dnd-kit/core';
import { useAppSelector } from '../../../app/hooks';
import { selectAllTasks, selectNowMin } from '../../../features/tasks';
import { selectWorkWindow } from '../../../features/planner';
import { catStyle } from '../../../shared/utils/categories';
import { rangeFmt } from '../../../shared/utils/time';
import { CategoryChip } from '../../../shared/ui';
import type { Task } from '../../../shared/types';
import styles from './PlannerTimeline.module.css';

type ViewMode = 'day' | 'week';

const MAX_VISIBLE = 2;

// Hard ceiling/floor for the universe of possible slots
const DISPLAY_START = 0;
const DISPLAY_END   = 24;

function energyColor(hour: number): string {
  if (hour >= 9  && hour < 12) return 'var(--ez-peak)';
  if (hour >= 12 && hour < 17) return 'var(--ez-medium)';
  if (hour >= 17 && hour < 20) return 'var(--ez-low)';
  return 'var(--ez-dip)';
}


function taskPriority(t: Task): number {
  if (t.overdue && !t.done) return 3;
  if (t.locked)             return 2;
  if (!t.done)              return 1;
  return 0;
}

/* Для каждого часа собираем:
   - primary: задачи, НАЧИНАЮЩИЕСЯ в этом часу
   - continuation: задачи из предыдущих часов, которые сюда ПЕРЕХОДЯТ */
function buildSlotMap(
  tasks: Task[], hours: number[], windowStart: number, windowEnd: number,
): Map<number, { primary: Task[]; cont: Task[] }> {
  const map = new Map<number, { primary: Task[]; cont: Task[] }>();
  for (const h of hours) map.set(h, { primary: [], cont: [] });

  for (const task of tasks) {
    const taskStartH = Math.floor(task.start / 60);
    const taskEndH   = Math.ceil(task.end / 60);

    for (let h = taskStartH; h < taskEndH && h < windowEnd; h++) {
      if (h < windowStart) continue;
      const slot = map.get(h);
      if (!slot) continue;
      if (h === taskStartH) slot.primary.push(task);
      else                  slot.cont.push(task);
    }
  }
  return map;
}

/* ── Основная карточка задачи ── */
function TaskCard({
  task, isActive, onClick,
}: { task: Task; isActive: boolean; nowMin: number; onClick: () => void }) {
  return (
    <div
      className={[
        styles.task,
        task.done    ? styles.taskDone    : '',
        task.overdue ? styles.taskOverdue : '',
        isActive     ? styles.taskActive  : '',
      ].filter(Boolean).join(' ')}
      style={catStyle(task.cat)}
      role="button" tabIndex={0}
      aria-label={`${task.title}, ${rangeFmt(task.start, task.end)}`}
      aria-pressed={task.done} aria-expanded={isActive}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <div className={styles.taskBody}>
        <span className={styles.taskTime}>{rangeFmt(task.start, task.end)}</span>
        <span className={styles.taskTitle}>{task.title}</span>
        {task.reason && <span className={styles.taskReason}>{task.reason}</span>}
      </div>
      <CategoryChip
        cat={task.cat}
        size="xs"
        uppercase
        label={task.source === 'uni' ? 'ВУЗ' : undefined}
      />
    </div>
  );
}

/* ── Карточка-продолжение (задача переходит из предыдущего часа) ── */
function ContinuationCard({
  task, isActive, onClick,
}: { task: Task; isActive: boolean; onClick: () => void }) {
  const endH   = Math.floor(task.end / 60);
  const endMin = task.end % 60;
  const endStr = `${endH}:${endMin.toString().padStart(2, '0')}`;
  const durationMin = task.end - task.start;

  return (
    <div
      className={`${styles.contCard} ${isActive ? styles.contCardActive : ''}`}
      style={catStyle(task.cat)}
      role="button" tabIndex={0}
      aria-label={`${task.title} продолжается до ${endStr}`}
      aria-pressed={isActive}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <span className={styles.contTitle}>{task.title}</span>
      <span className={styles.contMeta}>
        <HugeiconsIcon icon={ArrowDown01Icon} size={10} strokeWidth={2} color="currentColor" />
        до {endStr} · {durationMin} мин
      </span>
    </div>
  );
}

/* ── Один часовой слот ── */
function HourSlot({
  hour, primary, cont, activeId, isNow, isOffHours, nowMin, onTaskClick,
}: {
  hour: number;
  primary: Task[];
  cont: Task[];
  activeId: string | null;
  isNow: boolean;
  isOffHours: boolean;
  nowMin: number;
  onTaskClick: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${hour}`,
    data: { type: 'slot', hour },
  });

  const sorted     = [...primary].sort((a, b) => taskPriority(b) - taskPriority(a));
  const totalPages = Math.ceil(sorted.length / MAX_VISIBLE);
  const paginated  = totalPages > 1;
  const visible    = paginated ? sorted.slice(page * MAX_VISIBLE, page * MAX_VISIBLE + MAX_VISIBLE) : sorted;
  const hasPrev    = page > 0;
  const hasNext    = page < totalPages - 1;
  const isEmpty   = primary.length === 0 && cont.length === 0;

  // Off-hours slots get no energy color — neutral bg only
  const ezColor = isOffHours ? undefined : energyColor(hour);

  return (
    <div
      ref={setNodeRef}
      className={[
        styles.hourRow,
        isNow       ? styles.hourRowNow      : '',
        isOver      ? styles.hourRowOver     : '',
        isOffHours  ? styles.hourRowOffHours : '',
      ].filter(Boolean).join(' ')}
      style={ezColor ? ({ '--ez-color': ezColor } as React.CSSProperties) : undefined}
    >
      <div className={styles.gutter}>
        <span className={`${styles.hourNum} ${isNow ? styles.hourNumNow : ''}`}>{hour}</span>
      </div>
      <div className={styles.slotContent}>
        {isEmpty ? (
          <div className={styles.emptyCell} />
        ) : (
          <>
            {cont.length > 0 && (
              <div className={styles.contRow}>
                {cont.map(t => (
                  <ContinuationCard
                    key={t.id}
                    task={t}
                    isActive={activeId === t.id}
                    onClick={() => onTaskClick(t.id)}
                  />
                ))}
              </div>
            )}

            {primary.length > 0 && (
              <div className={styles.primaryArea}>
                <div
                  className={styles.taskRow}
                  style={{ gridTemplateColumns: visible.length === 1 ? '1fr' : '1fr 1fr' }}
                >
                  {visible.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      isActive={activeId === t.id}
                      nowMin={nowMin}
                      onClick={() => onTaskClick(t.id)}
                    />
                  ))}
                </div>
                {paginated && (
                  <div className={styles.pageNav}>
                    <span className={styles.pageCounter}>{page + 1} / {totalPages}</span>
                    <button
                      className={styles.pageBtn}
                      onClick={() => setPage(p => p - 1)}
                      disabled={!hasPrev}
                      aria-label="Предыдущие задачи"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      className={styles.pageBtn}
                      onClick={() => setPage(p => p + 1)}
                      disabled={!hasNext}
                      aria-label="Следующие задачи"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface PlannerTimelineProps {
  selectedTaskId: string | null;
  onTaskSelect: (id: string) => void;
}

/* ── Основной компонент ── */
export function PlannerTimeline({ selectedTaskId, onTaskSelect }: PlannerTimelineProps) {
  const [date, setDate] = useState(new Date());
  const [mode, setMode] = useState<ViewMode>('day');

  const tasks  = useAppSelector(selectAllTasks);
  const nowMin = useAppSelector(selectNowMin);
  const { startHour, endHour } = useAppSelector(selectWorkWindow);

  const nowHour = Math.floor(nowMin / 60);
  const showNow = isToday(date);

  // Full display range 6–24; buildSlotMap uses this for mapping tasks to slots
  const allHours = useMemo(
    () => Array.from({ length: DISPLAY_END - DISPLAY_START }, (_, i) => i + DISPLAY_START),
    [],
  );

  const realTasks = tasks.filter(t => !t.isBreak);
  const slotMap   = useMemo(
    () => buildSlotMap(realTasks, allHours, DISPLAY_START, DISPLAY_END),
    [realTasks, allHours],
  );

  // Show work window + any hour outside it that has tasks
  const hours = useMemo(() => allHours.filter(h => {
    if (h >= startHour && h < endHour) return true;
    const slot = slotMap.get(h);
    return !!slot && (slot.primary.length > 0 || slot.cont.length > 0);
  }), [allHours, startHour, endHour, slotMap]);

  return (
    <div className={styles.wrap}>
      {/* ── Тулбар ── */}
      <div className={styles.toolbar}>
        <div className={styles.navGroup}>
          <button className={styles.navBtn} onClick={() => setDate(d => subDays(d, 1))} aria-label="Предыдущий день">‹</button>
          <span className={styles.dateLabel}>
            {format(date, 'EEEE, d MMMM yyyy', { locale: ru })}
          </span>
          <button className={styles.navBtn} onClick={() => setDate(d => addDays(d, 1))} aria-label="Следующий день">›</button>
        </div>
        <div className={styles.navRight}>
          <button className={styles.todayBtn} onClick={() => setDate(new Date())}>Сегодня</button>
          <div className={styles.modeSwitch}>
            {(['day', 'week'] as ViewMode[]).map(m => (
              <button
                key={m}
                className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
              >
                {m === 'day' ? 'День' : 'Неделя'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Таймлайн ── */}
      <div className={styles.root}>
        <div className={styles.timelineWrap}>
          {hours.map(h => {
            const slot = slotMap.get(h)!;
            return (
              <HourSlot
                key={h}
                hour={h}
                primary={slot.primary}
                cont={slot.cont}
                activeId={selectedTaskId}
                isNow={showNow && h === nowHour}
                isOffHours={h < startHour || h >= endHour}
                nowMin={nowMin}
                onTaskClick={onTaskSelect}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
