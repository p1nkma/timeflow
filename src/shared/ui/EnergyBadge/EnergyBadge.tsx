import type { EnergyLevel } from '../../types';
import styles from './EnergyBadge.module.css';

const ENERGY_LABEL: Record<EnergyLevel, string> = {
  low:    'лёгкая',
  medium: 'средняя',
  high:   'тяжёлая',
};

interface Props {
  level: EnergyLevel;
  className?: string;
}

export function EnergyBadge({ level, className }: Props) {
  return (
    <span
      className={`${styles.badge} ${className ?? ''}`}
      aria-label={`Нагрузка: ${ENERGY_LABEL[level]}`}
    >
      {ENERGY_LABEL[level]}
    </span>
  );
}
