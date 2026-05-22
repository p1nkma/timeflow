import { Icon, PlusSignIcon } from '../Icon/Icon';
import styles from './Fab.module.css';

interface FabProps {
  onClick: () => void;
  ariaLabel?: string;
}

export function Fab({ onClick, ariaLabel = 'Новая задача' }: FabProps) {
  return (
    <button
      type="button"
      className={styles.fab}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Icon icon={PlusSignIcon} size={24} strokeWidth={2} />
    </button>
  );
}
