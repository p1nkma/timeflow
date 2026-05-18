import { OverdueBanner }    from './components/OverdueBanner';
import { PlannerTimeline }  from './components/PlannerTimeline';
import { InboxPanel }       from './components/InboxPanel';
import { Icon, SparklesIcon } from '../../shared/ui';
import styles from './PlannerPage.module.css';

export function PlannerPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className="t-h2">Планировщик</h2>
        <button className={styles.btnGenerate} aria-label="Сгенерировать план с помощью ИИ">
          <Icon icon={SparklesIcon} size={15} />
          Сгенерировать
        </button>
      </div>

      <OverdueBanner />

      <div className={styles.layout}>
        <div className={styles.main}>
          <PlannerTimeline />
        </div>
        <InboxPanel />
      </div>
    </div>
  );
}
