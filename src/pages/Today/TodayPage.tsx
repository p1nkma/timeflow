import styles from './TodayPage.module.css';

export function TodayPage() {
  return (
    <div className={styles.content}>
      <div className={styles.head}>
        <h2 className={styles.title}>Сегодня</h2>
        <div className="tertiary t-small">13 мая, вт</div>
      </div>
      <div style={{ padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Today page — в разработке
      </div>
    </div>
  );
}
