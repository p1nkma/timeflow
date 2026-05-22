import { useMemo, useState } from 'react';
import { useAppSelector } from '../../../app/hooks';
import { selectAllTasks, selectNowMin } from '../../../features/tasks';
import { selectWorkWindow } from '../../../features/planner';
import { catStyle, CATEGORIES } from '../../../shared/utils/categories';
import { rangeFmt } from '../../../shared/utils/time';
import { Icon, SparklesIcon, TaskModal } from '../../../shared/ui';
import type { Task } from '../../../shared/types';
import styles from './TimelineView.module.css';

const MAX_VISIBLE = 2;

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

function buildSlotMap(
  tasks: Task[], hours: number[], startH: number, endH: number,
): Map<number, { primary: Task[]; cont: Task[] }> {
  const map = new Map<number, { primary: Task[]; cont: Task[] }>();
  for (const h of hours) map.set(h, { primary: [], cont: [] });

  for (const task of tasks) {
    const taskStartH = Math.floor(task.start / 60);
    const taskEndH   = Math.ceil(task.end / 60);

    for (let h = taskStartH; h < taskEndH && h < endH; h++) {
      if (h < startH) continue;
      const slot = map.get(h);
      if (!slot) continue;
      if (h === taskStartH) slot.primary.push(task);
      else                  slot.cont.push(task);
    }
  }
  return map;
}

/* ── Карточка задачи ── */
function TaskCard({
  task, isActive, onClick,
}: { task: Task; isActive: boolean; onClick: () => void }) {
  const catLabel = CATEGORIES[task.cat]?.label ?? task.cat;

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
      <div className={styles.taskAccent} />
      <div className={styles.taskBody}>
        <span className={styles.taskTime}>{rangeFmt(task.start, task.end)}</span>
        <span className={styles.taskTitle}>{task.title}</span>
        {task.reason && <span className={styles.taskReason}>{task.reason}</span>}
      </div>
      <span className={styles.catBadge}>
        {task.source === 'uni' ? 'ВУЗ' : catLabel}
      </span>
    </div>
  );
}

/* ── Continuation-карточка ── */
function ContinuationCard({
  task, isActive, onClick,
}: { task: Task; isActive: boolean; onClick: () => void }) {
  const endH   = Math.floor(task.end / 60);
  const endMin = task.end % 60;
  const endStr = `${endH}:${endMin.toString().padStart(2, '0')}`;

  return (
    <div
      className={`${styles.contCard} ${isActive ? styles.contCardActive : ''}`}
      style={catStyle(task.cat)}
      role="button" tabIndex={0}
      aria-label={`${task.title} продолжается до ${endStr}`}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <div className={styles.taskAccent} />
      <span className={styles.contText}>↓ продолжается · до {endStr}</span>
    </div>
  );
}

/* ── Часовой слот ── */
function HourSlot({
  hour, primary, cont, activeId, isNow, onTaskClick,
}: {
  hour: number; primary: Task[]; cont: Task[];
  activeId: string | null; isNow: boolean; onTaskClick: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const sorted    = [...primary].sort((a, b) => taskPriority(b) - taskPriority(a));
  const totalPages = Math.ceil(sorted.length / MAX_VISIBLE);
  const visible   = sorted.slice(page * MAX_VISIBLE, page * MAX_VISIBLE + MAX_VISIBLE);
  const hasNext   = page < totalPages - 1;
  const hasPrev   = page > 0;
  const isEmpty   = primary.length === 0 && cont.length === 0;

  return (
    <div className={`${styles.hourRow} ${isNow ? styles.hourRowNow : ''}`}>
      <div className={styles.hourGutter}>
        <div className={styles.energyBar} style={{ background: energyColor(hour) }} />
        <span className={styles.hourNum}>{hour}</span>
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
                    key={t.id} task={t}
                    isActive={activeId === t.id}
                    onClick={() => onTaskClick(t.id)}
                  />
                ))}
              </div>
            )}
            {primary.length > 0 && (
              <div className={styles.pageWrap}>
                <div
                  className={styles.taskRow}
                  style={{ gridTemplateColumns: visible.length === 1 ? '1fr' : '1fr 1fr' }}
                >
                  {visible.map(t => (
                    <TaskCard
                      key={t.id} task={t}
                      isActive={activeId === t.id}
                      onClick={() => onTaskClick(t.id)}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
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

/* ── Основной компонент ── */
export function TimelineView() {
  const tasks  = useAppSelector(selectAllTasks);
  const nowMin = useAppSelector(selectNowMin);
  const { startHour, endHour } = useAppSelector(selectWorkWindow);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => i + startHour),
    [startHour, endHour],
  );

  const nowHour   = Math.floor(nowMin / 60);
  const realTasks = tasks.filter(t => !t.isBreak);
  const slotMap   = useMemo(
    () => buildSlotMap(realTasks, hours, startHour, endHour),
    [realTasks, hours, startHour, endHour],
  );

  const activeTask = activeTaskId
    ? tasks.find(t => t.id === activeTaskId) ?? null
    : null;

  function handleTaskClick(id: string) {
    setActiveTaskId(prev => prev === id ? null : id);
  }

  return (
    <div className={styles.root}>
      <div className={styles.timeline}>
        {hours.map(h => {
          const slot = slotMap.get(h)!;
          return (
            <HourSlot
              key={h} hour={h}
              primary={slot.primary} cont={slot.cont}
              activeId={activeTaskId}
              isNow={h === nowHour && nowMin >= startHour * 60 && nowMin <= endHour * 60}
              onTaskClick={handleTaskClick}
            />
          );
        })}
      </div>

      {activeTask && (
        <TaskModal task={activeTask} onClose={() => setActiveTaskId(null)} />
      )}

      {realTasks.length === 0 && (
        <div className={styles.emptyState}>
          <p className="t-body muted">День свободен</p>
          <button className={styles.emptyCta}>
            <Icon icon={SparklesIcon} size={14} aria-hidden />
            Сгенерировать план
          </button>
        </div>
      )}
    </div>
  );
}
