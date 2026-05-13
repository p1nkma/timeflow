import { Icon, Fire02Icon } from '../Icon/Icon';
import styles from './Badge.module.css';

interface BadgeProps {
  n: number;
  pulse?: boolean;
}

export function StreakBadge({ n, pulse }: BadgeProps) {
  if (n === 0) return null;

  const cls = [
    styles.streak,
    n >= 30 ? styles.epic : n >= 7 ? styles.big : '',
    pulse ? styles.pulse : '',
  ].filter(Boolean).join(' ');

  const label = n === 1 ? 'день подряд' : n < 5 ? 'дня подряд' : 'дней подряд';

  return (
    <div className={cls}>
      <span className={styles.icon}><Icon icon={Fire02Icon} size={14} strokeWidth={1.8} /></span>
      <span className={styles.num}>{n}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
