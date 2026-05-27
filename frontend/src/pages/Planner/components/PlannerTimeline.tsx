import { useMemo, useState } from 'react';
import {
  format, addDays, subDays, startOfWeek, endOfWeek,
  isToday, isSameDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useAppSelector } from '../../../app/hooks';
import { selectAllTasks, selectNowMin } from '../../../features/tasks';
import { selectWorkWindow } from '../../../features/planner';
import { catStyle } from '../../../shared/utils/categories';
import { rangeFmt } from '../../../shared/utils/time';
import { CategoryChip, Icon, ArrowUp01Icon, ArrowDown01Icon } from '../../../shared/ui';
import type { Task } from '../../../shared/types';
import styles from './PlannerTimeline.module.css';

export type ViewMode = 'day' | 'week';

const MAX_VISIBLE   = 2;
const DISPLAY_START = 0;
const DISPLAY_END   = 24;

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function tasksForDate(tasks: Task[], date: Date): Task[] {
  const today = isoDate(new Date());
  const target = isoDate(date);
  return tasks.filter(t => (t.date ?? today) === target);
}

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

// ── Shared card components ────────────────────────────────────────────────────

function TaskCard({
  task, isActive, onClick,
}: { task: Task; isActive: boolean; nowMin: number; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
    disabled: task.locked,
  });

  const isAi = task.source === 'ai';
  const animDelay = isAi ? Math.max(0, (task.start - 8 * 60)) / 30 * 60 : 0;

  return (
    <div
      ref={setNodeRef}
      className={[
        styles.task,
        task.done    ? styles.taskDone    : '',
        task.overdue ? styles.taskOverdue : '',
        isActive     ? styles.taskActive  : '',
        isDragging   ? styles.taskDragging : '',
        isAi         ? styles.taskAiNew   : '',
      ].filter(Boolean).join(' ')}
      style={isAi
        ? { ...catStyle(task.cat), animationDelay: `${animDelay}ms` }
        : catStyle(task.cat)
      }
      role="button" tabIndex={0}
      aria-label={`${task.title}, ${rangeFmt(task.start, task.end)}${task.done ? ', выполнено' : ''}`}
      aria-expanded={isActive}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      {...listeners}
      {...attributes}
    >
      <div className={styles.taskBody}>
        <span className={styles.taskTime}>{rangeFmt(task.start, task.end)}</span>
        <span className={styles.taskTitle}>{task.title}</span>
        {task.reason && <span className={styles.taskReason}>{task.reason}</span>}
      </div>
      <div className={styles.taskMeta}>
        <CategoryChip
          cat={task.cat}
          size="xs"
          uppercase
          label={task.source === 'uni' ? 'ВУЗ' : undefined}
        />
      </div>
    </div>
  );
}

function ContinuationCard({
  task, isActive, onClick,
}: { task: Task; isActive: boolean; onClick: () => void }) {
  const endH   = Math.floor(task.end / 60);
  const endMin = task.end % 60;
  const endStr = `${endH}:${endMin.toString().padStart(2, '0')}`;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-cont-${task.id}`,
    data: { type: 'task', task },
    disabled: task.locked,
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        styles.contCard,
        isActive   ? styles.contCardActive : '',
        isDragging ? styles.taskDragging   : '',
      ].filter(Boolean).join(' ')}
      style={catStyle(task.cat)}
      role="button" tabIndex={0}
      aria-label={`${task.title} продолжается до ${endStr}`}
      aria-pressed={isActive}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      {...listeners}
      {...attributes}
    >
      <span className={styles.contTitle}>{task.title}</span>
      <span className={styles.contMeta}>до {endStr}</span>
    </div>
  );
}

// ── HourSlot — единый для day и week ─────────────────────────────────────────

function HourSlot({
  hour, primary, cont, activeId, isNow, isOffHours, nowMin, date, compact, onTaskClick,
}: {
  hour: number;
  primary: Task[];
  cont: Task[];
  activeId: string | null;
  isNow: boolean;
  isOffHours: boolean;
  nowMin: number;
  date: Date;
  compact?: boolean; // week mode: меньше высота, без reason
  onTaskClick: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${isoDate(date)}-${hour}`,
    data: { type: 'slot', hour, date: isoDate(date) },
  });

  const sorted     = [...primary].sort((a, b) => taskPriority(b) - taskPriority(a));
  const totalPages = Math.ceil(sorted.length / MAX_VISIBLE);
  const paginated  = totalPages > 1;
  const visible    = paginated ? sorted.slice(page * MAX_VISIBLE, page * MAX_VISIBLE + MAX_VISIBLE) : sorted;
  const hasPrev    = page > 0;
  const hasNext    = page < totalPages - 1;
  const isEmpty    = primary.length === 0 && cont.length === 0;
  const isConflict = isOver && !isEmpty;
  const ezColor    = isOffHours ? undefined : energyColor(hour);

  return (
    <div
      ref={setNodeRef}
      className={[
        styles.hourRow,
        isNow       ? styles.hourRowNow      : '',
        isConflict  ? styles.hourRowConflict : isOver ? styles.hourRowOver : '',
        isOffHours  ? styles.hourRowOffHours : '',
        compact     ? styles.hourRowCompact  : '',
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
                      <Icon icon={ArrowUp01Icon} size={12} strokeWidth={1.5} />
                    </button>
                    <button
                      className={styles.pageBtn}
                      onClick={() => setPage(p => p + 1)}
                      disabled={!hasNext}
                      aria-label="Следующие задачи"
                    >
                      <Icon icon={ArrowDown01Icon} size={12} strokeWidth={1.5} />
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

// ── Day View ──────────────────────────────────────────────────────────────────

interface DayViewProps {
  date: Date;
  selectedTaskId: string | null;
  onTaskSelect: (id: string) => void;
}

function DayView({ date, selectedTaskId, onTaskSelect }: DayViewProps) {
  const allTasks = useAppSelector(selectAllTasks);
  const nowMin   = useAppSelector(selectNowMin);
  const { startHour, endHour } = useAppSelector(selectWorkWindow);

  const nowHour = Math.floor(nowMin / 60);
  const showNow = isToday(date);

  const allHours = useMemo(
    () => Array.from({ length: DISPLAY_END - DISPLAY_START }, (_, i) => i + DISPLAY_START),
    [],
  );

  const dayTasks = useMemo(() => tasksForDate(allTasks.filter(t => !t.isBreak), date), [allTasks, date]);
  const slotMap  = useMemo(() => buildSlotMap(dayTasks, allHours, DISPLAY_START, DISPLAY_END), [dayTasks, allHours]);

  const hours = useMemo(() => allHours.filter(h => {
    if (h >= startHour && h < endHour) return true;
    const slot = slotMap.get(h);
    return !!slot && (slot.primary.length > 0 || slot.cont.length > 0);
  }), [allHours, startHour, endHour, slotMap]);

  const hasNoTasks = dayTasks.length === 0;

  return (
    <div className={styles.timelineWrap}>
      {hasNoTasks && (
        <div className={styles.emptyTimeline}>
          <span className={styles.emptyTimelineTitle}>На этот день ничего не запланировано</span>
          <span className={styles.emptyTimelineText}>Перетащите задачу из Inbox или добавьте новую</span>
        </div>
      )}
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
            date={date}
            onTaskClick={onTaskSelect}
          />
        );
      })}
    </div>
  );
}

// ── Week View — 7 колонок HourSlot-ов ────────────────────────────────────────

interface WeekDayColumnProps {
  date: Date;
  selectedTaskId: string | null;
  hours: number[];          // общий список часов для всех колонок
  slotMap: Map<number, { primary: Task[]; cont: Task[] }>;
  nowMin: number;
  startHour: number;
  endHour: number;
  onTaskSelect: (id: string) => void;
}

function WeekDayColumn({
  date, selectedTaskId, hours, slotMap, nowMin, startHour, endHour, onTaskSelect,
}: WeekDayColumnProps) {
  const nowHour  = Math.floor(nowMin / 60);
  const showNow  = isToday(date);

  return (
    <div className={`${styles.weekDayCol} ${isToday(date) ? styles.weekDayColToday : ''}`}>
      {hours.map(h => {
        const slot = slotMap.get(h) ?? { primary: [], cont: [] };
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
            date={date}
            compact
            onTaskClick={onTaskSelect}
          />
        );
      })}
    </div>
  );
}

interface WeekViewProps {
  weekStart: Date;
  selectedTaskId: string | null;
  onTaskSelect: (id: string) => void;
}

function WeekView({ weekStart, selectedTaskId, onTaskSelect }: WeekViewProps) {
  const allTasks = useAppSelector(selectAllTasks);
  const nowMin   = useAppSelector(selectNowMin);
  const { startHour, endHour } = useAppSelector(selectWorkWindow);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const allHours = useMemo(
    () => Array.from({ length: DISPLAY_END - DISPLAY_START }, (_, i) => i + DISPLAY_START),
    [],
  );

  const realTasks = useMemo(() => allTasks.filter(t => !t.isBreak), [allTasks]);

  // Единый набор часов для всех колонок: объединение рабочего окна и часов
  // с задачами хотя бы в одном из 7 дней
  const hours = useMemo(() => {
    const dayTaskMaps = weekDays.map(day => {
      const dt = tasksForDate(realTasks, day);
      return buildSlotMap(dt, allHours, DISPLAY_START, DISPLAY_END);
    });
    return allHours.filter(h => {
      if (h >= startHour && h < endHour) return true;
      return dayTaskMaps.some(m => {
        const s = m.get(h);
        return s && (s.primary.length > 0 || s.cont.length > 0);
      });
    });
  }, [allHours, weekDays, realTasks, startHour, endHour]);

  return (
    <div className={styles.weekRoot}>
      {/* Time gutter — пустые hourRow без контента для выравнивания */}
      <div className={styles.weekGutter}>
        {hours.map(h => (
          <div key={h} className={styles.weekGutterCell}>
            <span className={styles.weekGutterLabel}>{h}</span>
          </div>
        ))}
      </div>

      {/* 7 колонок дней */}
      {weekDays.map(day => {
        const dayTasks = tasksForDate(realTasks, day);
        const slotMap  = buildSlotMap(dayTasks, allHours, DISPLAY_START, DISPLAY_END);
        return (
          <WeekDayColumn
            key={isoDate(day)}
            date={day}
            selectedTaskId={selectedTaskId}
            hours={hours}
            slotMap={slotMap}
            nowMin={nowMin}
            startHour={startHour}
            endHour={endHour}
            onTaskSelect={onTaskSelect}
          />
        );
      })}
    </div>
  );
}

// ── Week header ───────────────────────────────────────────────────────────────

function WeekHeader({ weekStart }: { weekStart: Date }) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  return (
    <div className={styles.weekHeader}>
      <div className={styles.weekHeaderGutter} />
      {days.map(day => (
        <div
          key={isoDate(day)}
          className={`${styles.weekHeaderCell} ${isToday(day) ? styles.weekHeaderCellToday : ''}`}
        >
          <span className={styles.weekHeaderDay}>
            {format(day, 'EEE', { locale: ru })}
          </span>
          <span className={styles.weekHeaderDate}>
            {format(day, 'd')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface ToolbarProps {
  mode: ViewMode;
  date: Date;
  weekStart: Date;
  onModeChange: (m: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function Toolbar({ mode, date, weekStart, onModeChange, onPrev, onNext, onToday }: ToolbarProps) {
  const todayAlreadyActive = mode === 'day'
    ? isToday(date)
    : isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  const dateLabel = mode === 'day'
    ? format(date, 'EEEE, d MMMM yyyy', { locale: ru })
    : `${format(weekStart, 'd MMM', { locale: ru })} — ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: ru })}`;

  return (
    <div className={styles.toolbar}>
      <div className={styles.navGroup}>
        <button className={styles.navBtn} onClick={onPrev} aria-label="Назад">‹</button>
        <span className={styles.dateLabel}>{dateLabel}</span>
        <button className={styles.navBtn} onClick={onNext} aria-label="Вперёд">›</button>
      </div>
      <div className={styles.navRight}>
        <button
          className={`${styles.todayBtn} ${todayAlreadyActive ? styles.todayBtnActive : ''}`}
          onClick={onToday}
          disabled={todayAlreadyActive}
          aria-label="Перейти к сегодня"
        >
          Сегодня
        </button>
        <div className={styles.modeSwitch}>
          <button
            className={`${styles.modeBtn} ${mode === 'day' ? styles.modeBtnActive : ''}`}
            onClick={() => onModeChange('day')}
            aria-pressed={mode === 'day'}
          >
            День
          </button>
          <button
            className={styles.modeBtn}
            disabled
            title="В разработке"
          >
            Неделя
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export interface PlannerTimelineProps {
  selectedTaskId: string | null;
  onTaskSelect: (id: string) => void;
  onModeChange?: (mode: ViewMode) => void;
}

export function PlannerTimeline({ selectedTaskId, onTaskSelect, onModeChange }: PlannerTimelineProps) {
  const [date,      setDate]      = useState(new Date());
  const [mode,      setMode]      = useState<ViewMode>('day');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  function handleModeChange(m: ViewMode) {
    setMode(m);
    onModeChange?.(m);
    if (m === 'week') setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
  }

  function handlePrev() {
    if (mode === 'day') setDate(d => subDays(d, 1));
    else                setWeekStart(d => subDays(d, 7));
  }
  function handleNext() {
    if (mode === 'day') setDate(d => addDays(d, 1));
    else                setWeekStart(d => addDays(d, 7));
  }
  function handleToday() {
    const today = new Date();
    setDate(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  }

  return (
    <div className={styles.wrap}>
      <Toolbar
        mode={mode}
        date={date}
        weekStart={weekStart}
        onModeChange={handleModeChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      <div className={styles.root}>
        {mode === 'day' ? (
          <DayView
            date={date}
            selectedTaskId={selectedTaskId}
            onTaskSelect={onTaskSelect}
          />
        ) : (
          <div className={styles.weekWrap}>
            <WeekHeader weekStart={weekStart} />
            <div className={styles.weekScroll}>
              <WeekView
                weekStart={weekStart}
                selectedTaskId={selectedTaskId}
                onTaskSelect={onTaskSelect}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
