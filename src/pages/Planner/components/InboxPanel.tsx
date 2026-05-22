import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useDraggable } from '@dnd-kit/core';
import { useAppSelector } from '../../../app/hooks';
import { catStyle } from '../../../shared/utils/categories';
import { Icon, SparklesIcon, FilterHorizontalIcon, DragDropVerticalIcon } from '../../../shared/ui';
import type { CategoryKey, InboxItem } from '../../../shared/types';
import { ScheduleModal } from './ScheduleModal';
import styles from './InboxPanel.module.css';

function DraggableInboxItem({
  item, onSchedule,
}: { item: InboxItem; onSchedule: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `inbox-${item.id}`,
    data: { type: 'inbox', item },
  });

  return (
    <li
      ref={setNodeRef}
      className={`${styles.item} ${isDragging ? styles.itemDragging : ''}`}
      style={catStyle(item.cat)}
    >
      <button
        className={styles.dragHandle}
        aria-label="Перетащить в расписание"
        {...listeners}
        {...attributes}
      >
        <Icon icon={DragDropVerticalIcon} size={14} />
      </button>
      <div className={styles.itemContent}>
        <div className={styles.itemBody}>
          <span className={`t-body-md ${styles.itemTitle} ${item.urgent ? styles.urgent : ''}`}>
            {item.title}
          </span>
          <span className="t-xs muted">
            {item.deadline
              ? item.urgent
                ? `${format(parseISO(item.deadline), 'd MMM', { locale: ru })} · Срочно`
                : format(parseISO(item.deadline), 'd MMM', { locale: ru })
              : 'без дедлайна'}
          </span>
        </div>
        <button className={styles.scheduleBtn} onClick={onSchedule}>
          + В расписание
        </button>
      </div>
    </li>
  );
}

type Filter = 'all' | 'urgent' | CategoryKey;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'Все' },
  { key: 'urgent',    label: 'Срочные' },
  { key: 'code',      label: 'Кодинг' },
  { key: 'freelance', label: 'Фриланс' },
  { key: 'study',     label: 'Учёба' },
];

export function InboxPanel() {
  const inbox = useAppSelector(s => s.inbox);
  const [filter, setFilter]       = useState<Filter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [schedulingItem, setSchedulingItem] = useState<InboxItem | null>(null);

  function handleReschedule() {
    setRescheduling(true);
    setTimeout(() => setRescheduling(false), 2000);
  }

  const filtered = inbox.filter(item => {
    if (filter === 'all')    return true;
    if (filter === 'urgent') return item.urgent;
    return item.cat === filter;
  });

  const activeLabel = FILTERS.find(f => f.key === filter)?.label;

  return (
    <div className={styles.inboxContent}>
      <div className={styles.head}>
        <span className="t-h3">Inbox</span>
        <div className={styles.headRight}>
          <span className="t-small muted">{inbox.length} задач</span>
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

      {filter !== 'all' && !filterOpen && (
        <div className={styles.activeFilter}>
          <span className={styles.activeFilterLabel}>{activeLabel}</span>
          <button className={styles.clearFilter} onClick={() => setFilter('all')} aria-label="Сбросить фильтр">×</button>
        </div>
      )}

      <ul className={styles.list}>
        {filtered.map(item => (
          <DraggableInboxItem
            key={item.id}
            item={item}
            onSchedule={() => setSchedulingItem(item)}
          />
        ))}
        {filtered.length === 0 && (
          <li className="t-small muted" style={{ padding: 'var(--space-3)' }}>Пусто</li>
        )}
      </ul>

      <div className={styles.footer}>
        <button
          className={styles.btnAi}
          aria-label="ИИ перепланирует задачи"
          onClick={handleReschedule}
          disabled={rescheduling}
        >
          <Icon icon={SparklesIcon} size={14} />
          {rescheduling ? 'Планирую…' : 'ИИ перепланирует'}
        </button>
      </div>

      {schedulingItem && (
        <ScheduleModal
          item={schedulingItem}
          onClose={() => setSchedulingItem(null)}
        />
      )}
    </div>
  );
}
