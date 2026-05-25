import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppSelector } from '../../app/hooks';
import { selectNowMin } from '../../features/tasks';
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
  const nowMin = useAppSelector(selectNowMin);
  const today  = format(new Date(), 'd MMMM, EEE', { locale: ru });

  const nowHour   = Math.floor(nowMin / 60);
  const isMorning = nowHour < 10;
  const isEvening = nowHour >= 20;

  const btnLabel = generating
    ? (isMorning ? 'Генерирую…' : 'Подвожу итоги…')
    : isMorning
      ? 'Сгенерировать план'
      : isEvening
        ? 'Подвести итоги дня'
        : 'Перепланировать';

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
          <span className="t-small muted">{today}</span>
        </div>
        <div className={styles.headerRight}>
          <Segmented
            options={TABS.map(t => ({ value: t, label: t }))}
            value={tab}
            onChange={v => setTab(v as Tab)}
          />
          <button
            className={`${styles.btnGenerate} ${isMorning ? styles.btnGenerateMorning : ''}`}
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
