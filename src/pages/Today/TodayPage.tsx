import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Segmented, Icon, SparklesIcon } from '../../shared/ui';
import { HeroFocus }    from './components/HeroFocus';
import { TaskList }     from './components/TaskList';
import { DailyTip }     from './components/DailyTip';
import { SegmentsView } from './components/SegmentsView';
import styles from './TodayPage.module.css';

const TABS = ['Фокус', 'Сегменты'] as const;
type Tab = typeof TABS[number];

export function TodayPage() {
  const [tab, setTab]           = useState<Tab>('Фокус');
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [generating, setGenerating]   = useState(false);
  const today  = format(new Date(), 'd MMMM, EEE', { locale: ru });

  const btnLabel = generating ? 'Перепланирую…' : 'Перепланировать';

  function handleGenerate() {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2000);
  }

  function handleFocusTask(id: string) {
    setFocusTaskId(id);
    setTab('Фокус');
  }

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className="t-h2">Сегодня</h1>
          <span className="t-small t-num muted">{today}</span>
        </div>
        <div className={styles.headerRight}>
          <Segmented
            options={TABS.map(t => ({ value: t, label: t }))}
            value={tab}
            onChange={v => setTab(v as Tab)}
          />
          <button
            className={styles.btnGenerate}
            aria-label={btnLabel}
            onClick={handleGenerate}
            disabled={generating}
          >
            <Icon icon={SparklesIcon} size={15} />
            {btnLabel}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {tab === 'Фокус' && (
          <>
            <HeroFocus />
            <DailyTip />
            <TaskList focusTaskId={focusTaskId} onFocusConsumed={() => setFocusTaskId(null)} />
          </>
        )}
        {tab === 'Сегменты' && (
          <SegmentsView isLoading={generating} onFocusTask={handleFocusTask} />
        )}
      </div>
    </div>
  );
}
