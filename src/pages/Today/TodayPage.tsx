import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Segmented, Icon, SparklesIcon, StreakBadge } from '../../shared/ui';
import { HeroFocus }    from './components/HeroFocus';
import { DailyTip }     from './components/DailyTip';
import { TimelineView } from './components/TimelineView';
import { ProgressRing } from './components/ProgressRing';
import { UpcomingList } from './components/UpcomingList';
import { QuickAdd }     from './components/QuickAdd';
import { SegmentsView } from './components/SegmentsView';
import styles from './TodayPage.module.css';

const TABS = ['Фокус', 'Сегменты'] as const;
type Tab = typeof TABS[number];

const STREAK = 7;

export function TodayPage() {
  const [tab, setTab] = useState<Tab>('Фокус');
  const [generating, setGenerating] = useState(false);
  const today = format(new Date(), 'd MMMM, EEE', { locale: ru });

  function handleGenerate() {
    setGenerating(true);
    // placeholder — будет заменено на RTK Query мутацию при подключении бэка
    setTimeout(() => setGenerating(false), 2000);
  }

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className="t-h2">Сегодня</h2>
          <div className="hstack gap-2">
            <span className="t-small muted">{today}</span>
            {STREAK > 0 && <StreakBadge n={STREAK} />}
          </div>
        </div>
        <div className={styles.headerRight}>
          <Segmented
            options={TABS.map(t => ({ value: t, label: t }))}
            value={tab}
            onChange={v => setTab(v as Tab)}
          />
          <button
            className={styles.btnGenerate}
            aria-label="Сгенерировать план с помощью ИИ"
            onClick={handleGenerate}
            disabled={generating}
          >
            <Icon icon={SparklesIcon} size={15} />
            {generating ? 'Генерирую…' : 'Сгенерировать план'}
          </button>
        </div>
      </div>

      {tab === 'Фокус' && (
        <div className={styles.focusLayout}>
          <div className={styles.focusLeft}>
            <HeroFocus />
            <DailyTip />
            <TimelineView />
          </div>
          <div className={styles.focusRight}>
            <ProgressRing />
            <QuickAdd />
            <UpcomingList />
          </div>
        </div>
      )}

      {tab === 'Сегменты' && (
        <>
          <SegmentsView />
          <DailyTip />
          <TimelineView />
        </>
      )}

    </div>
  );
}
