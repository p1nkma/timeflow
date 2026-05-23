import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useDraggable } from '@dnd-kit/core';
import { useAppSelector } from '../../../app/hooks';
import { catStyle, CATEGORIES } from '../../../shared/utils/categories';
import { Icon, SparklesIcon, CategoryChip } from '../../../shared/ui';
import type { CategoryKey, InboxItem } from '../../../shared/types';
import { ScheduleModal } from './ScheduleModal';
import styles from './InboxPanel.module.css';

export type Filter = 'all' | 'urgent' | CategoryKey;

export const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'Все' },
  { key: 'urgent',    label: 'Срочные' },
  { key: 'code',      label: 'Кодинг' },
  { key: 'freelance', label: 'Фриланс' },
  { key: 'study',     label: 'Учёба' },
];

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
      {...listeners}
      {...attributes}
    >
      <div className={styles.itemContent}>
        <span className={`${styles.itemTitle} ${item.urgent ? styles.urgent : ''}`}>
          {item.title}
        </span>
        <span className={styles.itemMeta}>
          {item.deadline
            ? item.urgent
              ? `${format(parseISO(item.deadline), 'd MMM', { locale: ru })} · Срочно`
              : format(parseISO(item.deadline), 'd MMM', { locale: ru })
            : 'без дедлайна'}
        </span>
        <button className={styles.scheduleBtn} onClick={e => { e.stopPropagation(); onSchedule(); }}>
          + В расписание
        </button>
      </div>
      <CategoryChip cat={item.cat} size="sm" iconOnly aria-label={CATEGORIES[item.cat]?.label ?? item.cat} />
    </li>
  );
}

interface InboxPanelProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
}

export function InboxPanel({ filter, onFilterChange }: InboxPanelProps) {
  const inbox = useAppSelector(s => s.inbox);
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
      {filter !== 'all' && (
        <div className={styles.activeFilter}>
          <span className={styles.activeFilterLabel}>{activeLabel}</span>
          <button
            className={styles.clearFilter}
            onClick={() => onFilterChange('all')}
            aria-label="Сбросить фильтр"
          >×</button>
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
