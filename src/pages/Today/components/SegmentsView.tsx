import { useState } from 'react';
import { useAppSelector } from '../../../app/hooks';
import { selectAllTasks, selectNowMin } from '../../../features/tasks/tasksSelectors';
import { catStyle, CATEGORIES } from '../../../shared/utils/categories';
import { Icon, Tick01Icon } from '../../../shared/ui';
import type { Task } from '../../../shared/types';
import { TaskList } from './TaskList';
import styles from './SegmentsView.module.css';

const SEGMENTS = [
  { key: 'morning', label: 'Утро',  sub: 'до 12:00', from: 0,    to: 720  },
  { key: 'day',     label: 'День',  sub: '12—17',     from: 720,  to: 1020 },
  { key: 'evening', label: 'Вечер', sub: 'после 17',  from: 1020, to: 1440 },
];

function pluralTasks(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'задача';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'задачи';
  return 'задач';
}

function SegmentCard({ label, sub, tasks, isNow, isSelected, onClick }: {
  label: string; sub: string; tasks: Task[];
  isNow: boolean; isSelected: boolean; onClick: () => void;
}) {
  const real   = tasks.filter(t => !t.isBreak);
  const done   = real.filter(t => t.done).length;
  const active = real.find(t => !t.done);
  const cats   = [...new Set(real.map(t => t.cat))].slice(0, 5);
  const isClosed = real.length > 0 && !active; // все задачи выполнены или время прошло

  const isDark = isNow;

  return (
    <button
      className={[styles.card, isDark ? styles.cardDark : '', isSelected && !isDark ? styles.cardSelected : ''].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className={styles.cardHead}>
        <span className={styles.cardSub}>{label} · {sub}</span>
        <span className={styles.count}>{done}/{real.length}</span>
      </div>

      <div className={styles.cardBody}>
        {active ? (
          <>
            <div className={styles.currentTitle}>{active.title}</div>
            {active.reason && <div className={styles.currentReason}>{active.reason}</div>}
          </>
        ) : isClosed ? (
          <div className={styles.closedSummary}>
            <Icon icon={Tick01Icon} size={13} aria-hidden />
            <span>{done} {pluralTasks(done)} выполнено</span>
          </div>
        ) : (
          <div className={styles.closed}>нет задач</div>
        )}
      </div>

      {cats.length > 0 && (
        <div className={styles.dots}>
          {cats.map(cat => (
            <span
              key={cat}
              className={`${styles.dot} ${!isDark && !isSelected ? styles.dotMuted : ''}`}
              style={catStyle(cat)}
              title={CATEGORIES[cat].label}
            />
          ))}
        </div>
      )}
    </button>
  );
}

/* Скелетон одной карточки сегмента */
function SegmentSkeleton() {
  return <div className={styles.skeleton} aria-hidden />;
}

interface SegmentsViewProps {
  isLoading?: boolean;
  onFocusTask?: (id: string) => void;
}

export function SegmentsView({ isLoading = false, onFocusTask }: SegmentsViewProps) {
  const tasks  = useAppSelector(selectAllTasks);
  const nowMin = useAppSelector(selectNowMin);

  const nowSegIdx = SEGMENTS.findIndex(s => nowMin >= s.from && nowMin < s.to);
  const [selectedIdx, setSelectedIdx] = useState<number>(nowSegIdx >= 0 ? nowSegIdx : 0);

  const selected = SEGMENTS[selectedIdx];

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {isLoading
          ? SEGMENTS.map(s => <SegmentSkeleton key={s.key} />)
          : SEGMENTS.map((seg, idx) => {
              const segTasks = tasks.filter(t => t.start >= seg.from && t.start < seg.to);
              const isNow    = nowMin >= seg.from && nowMin < seg.to;
              return (
                <SegmentCard
                  key={seg.key}
                  label={seg.label}
                  sub={seg.sub}
                  tasks={segTasks}
                  isNow={isNow}
                  isSelected={selectedIdx === idx}
                  onClick={() => setSelectedIdx(idx)}
                />
              );
            })
        }
      </div>

      {!isLoading && (
        <TaskList
          filterRange={{ from: selected.from, to: selected.to, label: `${selected.label} · ${selected.sub}` }}
          onTaskClick={onFocusTask}
        />
      )}
    </div>
  );
}
