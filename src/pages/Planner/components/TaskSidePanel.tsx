import { useState } from 'react';
import { Icon, FilterHorizontalIcon } from '../../../shared/ui';
import { useAppSelector } from '../../../app/hooks';
import { InboxPanel, FILTERS, type Filter } from './InboxPanel';
import styles from './TaskSidePanel.module.css';

export function TaskSidePanel() {
  const count = useAppSelector(s => s.inbox.length);
  const [filter, setFilter]         = useState<Filter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <aside className={styles.panel}>
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

      <InboxPanel filter={filter} onFilterChange={setFilter} />
    </aside>
  );
}
