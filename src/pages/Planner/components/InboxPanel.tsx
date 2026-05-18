import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { removeInboxItem } from '../../../features/inbox';
import { addTask } from '../../../features/tasks';
import { catStyle } from '../../../shared/utils/categories';
import { Icon, SparklesIcon } from '../../../shared/ui';
import type { CategoryKey } from '../../../shared/types';
import styles from './InboxPanel.module.css';

type Filter = 'all' | 'urgent' | CategoryKey;

export function InboxPanel() {
  const dispatch = useAppDispatch();
  const inbox    = useAppSelector(s => s.inbox);
  const [filter, setFilter] = useState<Filter>('all');
  const [rescheduling, setRescheduling] = useState(false);

  function handleReschedule() {
    setRescheduling(true);
    setTimeout(() => setRescheduling(false), 2000);
  }

  const filtered = inbox.filter(item => {
    if (filter === 'all')    return true;
    if (filter === 'urgent') return item.urgent;
    return item.cat === filter;
  });

  function handleSchedule(id: string) {
    const item = inbox.find(i => i.id === id);
    if (!item) return;
    dispatch(addTask({ title: item.title }));
    dispatch(removeInboxItem(id));
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'Все' },
    { key: 'urgent',   label: 'Срочные' },
    { key: 'code',     label: 'Кодинг' },
    { key: 'freelance',label: 'Фриланс' },
    { key: 'study',    label: 'Учёба' },
  ];

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <span className="t-h3">Inbox</span>
        <span className="t-small muted">{inbox.length} задач</span>
      </div>

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.chip} ${filter === f.key ? styles.chipActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className={styles.list}>
        {filtered.map(item => (
          <li key={item.id} className={styles.item} style={catStyle(item.cat)}>
            <div className={styles.itemBody}>
              <span className={`t-body-md ${styles.itemTitle} ${item.urgent ? styles.urgent : ''}`}>
                {item.title}
              </span>
              <span className="t-xs muted">
                {item.deadline
                  ? item.urgent
                    ? `${item.deadline.slice(5).replace('-', ' апр')} · Срочно`
                    : item.deadline.slice(5).replace('-', ' апр')
                  : 'без дедлайна'}
              </span>
            </div>
            <button className={styles.scheduleBtn} onClick={() => handleSchedule(item.id)}>
              + В расписание
            </button>
          </li>
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
    </aside>
  );
}
