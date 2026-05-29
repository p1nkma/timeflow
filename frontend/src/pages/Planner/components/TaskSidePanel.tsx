import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { Icon, FilterHorizontalIcon } from '../../../shared/ui';
import { useAppSelector } from '../../../app/hooks';
import { InboxPanel, FILTERS, type Filter } from './InboxPanel';
import styles from './TaskSidePanel.module.css';

interface TaskSidePanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function TaskSidePanel({ isOpen = false, onClose }: TaskSidePanelProps) {
  const count = useAppSelector(s => s.inbox.length);
  const [filter, setFilter]     = useState<Filter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: 'inbox-drop-zone',
    data: { type: 'inbox' },
  });

  const isMobile = typeof window !== 'undefined'
    && (window.innerWidth <= 768 || 'ontouchstart' in window);

  // ── Desktop — обычная sticky панель ──────────────────────────────────────────
  if (!isMobile) {
    return (
      <aside ref={setNodeRef} className={`${styles.panel} ${isOver ? styles.panelDropOver : ''}`}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <span className={styles.panelTitle}>Inbox</span>
            {count > 0 && <span className={styles.panelCount}>· {count}</span>}
          </div>
          <div className={styles.panelActions}>
            <button
              className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnOpen : ''}`}
              onClick={() => setFilterOpen(o => !o)}
              aria-expanded={filterOpen}
              aria-label="Фильтр задач"
            >
              <Icon icon={FilterHorizontalIcon} size={14} aria-hidden />
              {filter !== 'all' && <span className={styles.filterDot} />}
            </button>
          </div>
        </div>
        {filterOpen && (
          <div className={styles.filters}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`${styles.chip} ${filter === f.key ? styles.chipActive : ''}`}
                onClick={() => { setFilter(f.key); setFilterOpen(false); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div className={styles.panelBody}>
          <InboxPanel filter={filter} onFilterChange={setFilter} />
        </div>
      </aside>
    );
  }

  // ── Mobile — bottom sheet через портал ───────────────────────────────────────
  return createPortal(
    <>
      {isOpen && (
        <div className={styles.overlay} onClick={onClose} />
      )}
      <aside
        ref={setNodeRef}
        className={`${styles.panel} ${styles.mobileSheet} ${isOpen ? styles.mobileSheetOpen : ''} ${isOver ? styles.panelDropOver : ''}`}
      >
        {/* Handle + заголовок */}
        <div className={styles.sheetHeader} onClick={onClose}>
          <div className={styles.handleBar} />
          <div className={styles.panelTitleGroup}>
            <span className={styles.panelTitle}>Inbox</span>
            {count > 0 && <span className={styles.panelCount}>· {count}</span>}
          </div>
          <button
            className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnOpen : ''}`}
            onClick={e => { e.stopPropagation(); setFilterOpen(o => !o); }}
            aria-expanded={filterOpen}
            aria-label="Фильтр задач"
          >
            <Icon icon={FilterHorizontalIcon} size={14} aria-hidden />
            {filter !== 'all' && <span className={styles.filterDot} />}
          </button>
        </div>

        {/* Контент */}
        <div className={styles.panelBody}>
          {filterOpen && (
            <div className={styles.filters}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`${styles.chip} ${filter === f.key ? styles.chipActive : ''}`}
                  onClick={() => { setFilter(f.key); setFilterOpen(false); }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <InboxPanel filter={filter} onFilterChange={setFilter} />
        </div>
      </aside>
    </>,
    document.body,
  );
}
