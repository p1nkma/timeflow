import { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { OverdueBanner }   from './components/OverdueBanner';
import { PlannerTimeline } from './components/PlannerTimeline';
import { TaskSidePanel }   from './components/TaskSidePanel';
import { Icon, SparklesIcon, PlusSignIcon, TaskModal, QuickAddModal } from '../../shared/ui';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectAllTasks, addTask } from '../../features/tasks';
import { removeInboxItem } from '../../features/inbox';
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
  const [draggingItem, setDraggingItem]      = useState<InboxItem | null>(null);
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
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingItem(null);
    const active = e.active.data.current;
    const over   = e.over?.data.current;
    if (!active || active.type !== 'inbox') return;
    if (!over || over.type !== 'slot') return;

    const item = active.item as InboxItem;
    const hour = over.hour as number;
    const slotStart = hour * 60;

    const todayBusy = allTasks
      .filter(t => !t.isBreak)
      .map(t => ({ start: t.start, end: t.end }));

    const placed = findFreeSlot(todayBusy, DEFAULT_DUR, slotStart, 23 * 60);
    const start  = placed ?? slotStart;

    dispatch(addTask({
      title: item.title,
      cat: item.cat,
      start,
      end: start + DEFAULT_DUR,
      source: 'user',
    }));
    dispatch(removeInboxItem(item.id));
    dispatch(showToast({
      message: placed === null || placed === slotStart
        ? `Добавлено в ${fmt(start)}`
        : `Слот был занят — добавлено в ${fmt(start)}`,
      variant: 'success',
    }));
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className="t-h2">Планировщик</h1>
          <div className={styles.headerActions}>
            <button className={styles.btnGenerate} aria-label="Сгенерировать план с помощью ИИ">
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

        <div className={styles.layout}>
          <div className={styles.main}>
            <PlannerTimeline
              selectedTaskId={selectedTaskId}
              onTaskSelect={id => setSelectedTaskId(prev => prev === id ? null : id)}
            />
          </div>
          <TaskSidePanel onNewTask={() => setShowNewTask(true)} />
        </div>

        {selectedTask && (
          <TaskModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />
        )}

        {showNewTask && (
          <QuickAddModal onClose={() => setShowNewTask(false)} />
        )}
      </div>

      <DragOverlay>
        {draggingItem && (
          <div className={styles.dragPreview} style={catStyle(draggingItem.cat)}>
            <span className="t-body-md">{draggingItem.title}</span>
            <span className="t-xs muted">→ {DEFAULT_DUR} мин</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
