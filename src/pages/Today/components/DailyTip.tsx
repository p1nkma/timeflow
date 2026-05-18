import styles from './DailyTip.module.css';

const MOCK_TIP = 'У тебя ещё 2 глубоких блока сегодня. После 17:00 — только лёгкое.';

export function DailyTip() {
  return (
    <div className={styles.tip}>
      <span className={styles.icon}>✦</span>
      <div>
        <div className={`t-small ${styles.label}`}>Совет дня</div>
        <p className="t-body-md">{MOCK_TIP}</p>
      </div>
    </div>
  );
}
