import styles from './Toggle.module.css';

interface ToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ on, onChange }: ToggleProps) {
  return (
    <div
      className={`${styles.toggle} ${on ? styles.on : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(!on)}
    />
  );
}
