import { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { OverdueBanner }   from './components/OverdueBanner';
import { PlannerTimeline } from './components/PlannerTimeline';
import type { ViewMode }   from './components/PlannerTimeline';
import { TaskSidePanel }   from './components/TaskSidePanel';
import { GenerateModal }   from './components/GenerateModal';
import { Icon, SparklesIcon, PlusSignIcon, TaskModal, QuickAddModal } from '../../shared/ui';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectAllTasks, addTask, moveTaskToDate, reorderTask, removeFromSchedule } from '../../features/tasks';
import { removeInboxItem, addInboxItem } from '../../features/inbox';
import { showToast } from '../../features/ui';
import { findFreeSlot, fmt } from '../../shared/utils/time';
import { catStyle } from '../../shared/utils/categories';
import type { Task, InboxItem } from '../../shared/types';
import styles from './PlannerPage.module.css';

const DEFAULT_DUR = 30;

export function PlannerPage() {
  const dispatch = useAppDispatch();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask]        = useState(false);
  const [showGenerate, setShowGenerate]      = useState(false);
  const [draggingItem, setDraggingItem]      = useState<InboxItem | null>(null);
  const [draggingTask, setDraggingTask]      = useState<Task | null>(null);
  const [viewMode, setViewMode]              = useState<ViewMode>('day');
  const allTasks = useAppSelector(selectAllTasks);

  const selectedTask: Task | null = selectedTaskId
    ? allTasks.find(t => t.id === selectedTaskId) ?? null
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current;
    if (data?.type === 'inbox') setDraggingItem(data.item as InboxItem);
    if (data?.type === 'task')  setDraggingTask(data.task as Task);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingItem(null);
    setDraggingTask(null);
    const active = e.active.data.current;
    const over   = e.over?.data.current;
    if (!active) return;

    // Task dragged back to inbox — strip time, keep date as deadline
    if (active.type === 'task' && over?.type === 'inbox') {
      const task = active.task as Task;
      if (task.locked) return;
      dispatch(removeFromSchedule(task.id));
      dispatch(addInboxItem({
        title: task.title,
        cat: task.cat,
        deadline: task.date ?? null,
        urgent: false,
      }));
      dispatch(showToast({ message: 'Задача возвращена в Inbox', variant: 'success' }));
      if (selectedTaskId === task.id) setSelectedTaskId(null);
      return;
    }

    if (!over || over.type !== 'slot') return;

    const hour       = over.hour as number;
    const targetDate = over.date as string | undefined;
    const slotStart  = hour * 60;
    const today      = new Date().toISOString().slice(0, 10);
    const effectiveDate = targetDate ?? today;

    if (active.type === 'inbox') {
      const item = active.item as InboxItem;

      const dateBusy = allTasks
        .filter(t => !t.isBreak && (t.date ?? today) === effectiveDate)
        .map(t => ({ start: t.start, end: t.end }));

      const placed = findFreeSlot(dateBusy, DEFAULT_DUR, slotStart, 23 * 60);
      const start  = placed ?? slotStart;

      dispatch(addTask({
        title: item.title,
        cat: item.cat,
        start,
        end: start + DEFAULT_DUR,
        source: 'user',
        ...(targetDate ? { date: targetDate } : {}),
      }));
      dispatch(removeInboxItem(item.id));
      dispatch(showToast({
        message: placed === null || placed === slotStart
          ? `Добавлено в ${fmt(start)}`
          : `Слот был занят — добавлено в ${fmt(start)}`,
        variant: 'success',
      }));
      return;
    }

    if (active.type === 'task') {
      const task = active.task as Task;
      if (task.locked) return;

      const dur = task.end - task.start;
      const taskDate = task.date ?? today;

      // Busy slots on target date, excluding the dragged task itself
      const dateBusy = allTasks
        .filter(t => !t.isBreak && t.id !== task.id && (t.date ?? today) === effectiveDate)
        .map(t => ({ start: t.start, end: t.end }));

      const slotTasks = dateBusy.filter(t => t.start < slotStart + 60 && t.end > slotStart);
      const slotOccupied = slotTasks.length > 0;

      if (!slotOccupied) {
        // Пустой слот — snap to slot start, сохраняем длительность
        if (effectiveDate !== taskDate) {
          dispatch(moveTaskToDate({ id: task.id, date: effectiveDate, newStart: slotStart }));
        } else {
          dispatch(reorderTask({ id: task.id, newStart: slotStart }));
        }
        dispatch(showToast({ message: `Перенесено на ${fmt(slotStart)}`, variant: 'success' }));
      } else {
        // Слот занят — ищем свободный промежуток ≥ 15 мин внутри слота
        const slotEnd = slotStart + 60;
        const slotGaps: { start: number; end: number }[] = [];
        const boundaries = [slotStart, ...slotTasks.flatMap(t => [t.start, t.end]), slotEnd].sort((a, b) => a - b);
        for (let i = 0; i < boundaries.length - 1; i++) {
          const gapStart = boundaries[i];
          const gapEnd   = boundaries[i + 1];
          if (gapEnd - gapStart >= 15 && gapStart >= slotStart && gapEnd <= slotEnd) {
            slotGaps.push({ start: gapStart, end: gapEnd });
          }
        }

        if (slotGaps.length > 0) {
          const newStart = slotGaps[0].start;
          if (effectiveDate !== taskDate) {
            dispatch(moveTaskToDate({ id: task.id, date: effectiveDate, newStart }));
          } else {
            dispatch(reorderTask({ id: task.id, newStart }));
          }
          dispatch(showToast({ message: `Перенесено на ${fmt(newStart)}`, variant: 'success' }));
        } else {
          // Нет свободного места — ищем ближайший свободный слот
          const nearest = findFreeSlot(dateBusy, dur, slotStart, 23 * 60);
          if (nearest !== null) {
            dispatch(showToast({
              message: `Слот занят. Ближайшее свободное: ${fmt(nearest)}`,
              variant: 'default',
            }));
          } else {
            dispatch(showToast({ message: 'Нет свободного места в этот день', variant: 'info' }));
          }
        }
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className="t-h2">Планировщик</h1>
          <div className={styles.headerActions}>
            <button
              className={styles.btnGenerate}
              aria-label="Сгенерировать план с помощью ИИ"
              onClick={() => setShowGenerate(true)}
            >
              <Icon icon={SparklesIcon} size={14} />
              Сгенерировать
            </button>
            <button
              className={styles.btnNewTask}
              aria-label="Новая задача"
              onClick={() => setShowNewTask(true)}
            >
              <Icon icon={PlusSignIcon} size={14} strokeWidth={2} />
              Новая задача
            </button>
          </div>
        </div>

        <OverdueBanner />

        <div className={`${styles.layout} ${viewMode === 'week' ? styles.layoutWeek : ''}`}>
          <div className={styles.main}>
            <PlannerTimeline
              selectedTaskId={selectedTaskId}
              onTaskSelect={id => setSelectedTaskId(prev => prev === id ? null : id)}
              onModeChange={setViewMode}
            />
          </div>
          {viewMode === 'day' && (
            <TaskSidePanel />
          )}
        </div>

        {selectedTask && (
          <TaskModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />
        )}

        {showNewTask && (
          <QuickAddModal onClose={() => setShowNewTask(false)} />
        )}

        {showGenerate && (
          <GenerateModal onClose={() => setShowGenerate(false)} />
        )}
      </div>

      <DragOverlay>
        {draggingItem && (
          <div className={styles.dragPreview} style={catStyle(draggingItem.cat)}>
            <span className="t-body-md">{draggingItem.title}</span>
            <span className="t-xs muted">→ {DEFAULT_DUR} мин</span>
          </div>
        )}
        {draggingTask && (
          <div className={styles.dragPreview} style={catStyle(draggingTask.cat)}>
            <span className="t-body-md">{draggingTask.title}</span>
            <span className="t-xs muted">{draggingTask.end - draggingTask.start} мин</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
