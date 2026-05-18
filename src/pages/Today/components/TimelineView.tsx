import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { toggleTask } from '../../../features/tasks';
import { selectAllTasks, selectNowMin } from '../../../features/tasks/tasksSelectors';
import { catStyle, CATEGORIES } from '../../../shared/utils/categories';
import { rangeFmt } from '../../../shared/utils/time';
import { Icon, SparklesIcon, Tick01Icon, Cancel01Icon } from '../../../shared/ui';
import type { Task } from '../../../shared/types';
import styles from './TimelineView.module.css';

const START_H    = 7;
const END_H      = 22;
const HOURS      = Array.from({ length: END_H - START_H }, (_, i) => i + START_H);
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

function buildSlotMap(tasks: Task[]): Map<number, { primary: Task[]; cont: Task[] }> {
  const map = new Map<number, { primary: Task[]; cont: Task[] }>();
  for (const h of HOURS) map.set(h, { primary: [], cont: [] });

  for (const task of tasks) {
    const startH = Math.floor(task.start / 60);
    const endH   = Math.ceil(task.end / 60);

    for (let h = startH; h < endH && h < END_H; h++) {
      if (h < START_H) continue;
      const slot = map.get(h);
      if (!slot) continue;
      if (h === startH) slot.primary.push(task);
      else              slot.cont.push(task);
    }
  }
  return map;
}

/* ── Drawer ── */
function TaskDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const catLabel = CATEGORIES[task.cat]?.label ?? task.cat;

  return (
    <div className={styles.drawer} role="dialog" aria-label={`Детали: ${task.title}`}>
      <div className={styles.drawerHeader}>
        <div className={styles.drawerCatBadge} style={catStyle(task.cat)}>{catLabel}</div>
        <button className={styles.drawerClose} onClick={onClose} aria-label="Закрыть">
          <Icon icon={Cancel01Icon} size={16} aria-hidden />
        </button>
      </div>
      <h3 className={`t-h3 ${styles.drawerTitle} ${task.done ? styles.drawerDone : ''}`}>
        {task.title}
      </h3>
      <div className={styles.drawerMeta}>
        <span className="t-small muted">{rangeFmt(task.start, task.end)}</span>
        <span className="t-small muted">·</span>
        <span className="t-small muted">{task.end - task.start} мин</span>
        {task.source === 'uni' && <span className={`t-xs ${styles.drawerLocked}`}>ВУЗ</span>}
        {task.source === 'ai'  && <span className={`t-xs ${styles.drawerAi}`}>ИИ</span>}
      </div>
      {task.reasonLong && (
        <p className={`t-body-md muted ${styles.drawerReason}`}>{task.reasonLong}</p>
      )}
      {!task.locked && (
        <button
          className={`${styles.drawerBtn} ${task.done ? styles.drawerBtnDone : ''}`}
          onClick={() => dispatch(toggleTask(task.id))}
        >
          <Icon icon={Tick01Icon} size={15} aria-hidden />
          {task.done ? 'Отменить выполнение' : 'Отметить выполненным'}
        </button>
      )}
    </div>
  );
}

/* ── Карточка задачи ── */
function TaskCard({
  task, isActive, onClick,
}: { task: Task; isActive: boolean; onClick: () => void }) {
  const dispatch = useAppDispatch();
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
      <button
        className={`${styles.statusDot} ${task.done ? styles.statusDotDone : ''}`}
        aria-label={task.done ? 'Отметить невыполненным' : 'Отметить выполненным'}
        onClick={e => { e.stopPropagation(); if (!task.locked) dispatch(toggleTask(task.id)); }}
        tabIndex={-1}
      />
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
  const [expanded, setExpanded] = useState(false);
  const sorted  = [...primary].sort((a, b) => taskPriority(b) - taskPriority(a));
  const visible = expanded ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hidden  = sorted.length - MAX_VISIBLE;
  const isEmpty = primary.length === 0 && cont.length === 0;

  return (
    <div className={`${styles.hourRow} ${isNow ? styles.hourRowNow : ''}`}>
      <div className={styles.gutter}>
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
              <>
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
                {!expanded && hidden > 0 && (
                  <button className={styles.collapseBtn} onClick={() => setExpanded(true)}>
                    + ещё {hidden} {hidden === 1 ? 'задача' : hidden < 5 ? 'задачи' : 'задач'}
                  </button>
                )}
                {expanded && hidden > 0 && (
                  <button className={styles.collapseBtn} onClick={() => setExpanded(false)}>
                    Свернуть
                  </button>
                )}
              </>
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
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const nowHour   = Math.floor(nowMin / 60);
  const realTasks = tasks.filter(t => !t.isBreak);
  const slotMap   = buildSlotMap(realTasks);

  const activeTask = activeTaskId
    ? tasks.find(t => t.id === activeTaskId) ?? null
    : null;

  function handleTaskClick(id: string) {
    setActiveTaskId(prev => prev === id ? null : id);
  }

  return (
    <div className={styles.root}>
      <div className={styles.timeline}>
        {HOURS.map(h => {
          const slot = slotMap.get(h)!;
          return (
            <HourSlot
              key={h} hour={h}
              primary={slot.primary} cont={slot.cont}
              activeId={activeTaskId}
              isNow={h === nowHour && nowMin >= START_H * 60 && nowMin <= END_H * 60}
              onTaskClick={handleTaskClick}
            />
          );
        })}
      </div>

      {activeTask && (
        <TaskDrawer task={activeTask} onClose={() => setActiveTaskId(null)} />
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
