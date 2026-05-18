import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  featured?: boolean;
  streakDays?: number;
  streakMax?: number;
}

export function StatCard({ label, value, sub, trend, trendUp, featured, streakDays, streakMax = 14 }: StatCardProps) {
  const cardClass = `${styles.card} ${featured ? styles.featured : ''}`;

  return (
    <div className={cardClass}>
      {featured && streakDays !== undefined && (
        <div className={styles.streakBar}>
          {Array.from({ length: streakMax }, (_, i) => (
            <div key={i} className={`${styles.streakDot} ${i < streakDays ? styles.filled : ''}`} />
          ))}
        </div>
      )}
      <span className={`t-small ${styles.label}`}>{label}</span>
      <span className={`${styles.value} ${featured ? '' : 't-h1'}`}>{value}</span>
      {sub   && <span className={`t-small ${styles.sub}`}>{sub}</span>}
      {trend && (
        <span className={`t-small ${styles.trend} ${!featured && trendUp ? styles.up : ''} ${!featured && trendUp === false ? styles.down : ''}`}>
          {trend}
        </span>
      )}
    </div>
  );
}
