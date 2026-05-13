import type { Page } from '../../shared/types';
import type { IconSvgElement } from '@hugeicons/react';
import { Toggle, StreakBadge, Icon,
  Clock01Icon, Calendar03Icon, BarChartIcon, Setting06Icon,
  Moon01Icon, Sun01Icon } from '../../shared/ui';
import styles from './Sidebar.module.css';

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  darkMode: boolean;
  onDarkToggle: () => void;
}

const NAV: { key: Page; label: string; icon: IconSvgElement }[] = [
  { key: 'today',     label: 'Сегодня',     icon: Clock01Icon },
  { key: 'planner',   label: 'Планировщик', icon: Calendar03Icon },
  { key: 'analytics', label: 'Аналитика',   icon: BarChartIcon },
  { key: 'settings',  label: 'Настройки',   icon: Setting06Icon },
];

const STREAK = 7;

export function Sidebar({ page, onNavigate, darkMode, onDarkToggle }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>TF</div>
        <span className={styles.brandName}>TimeFlow</span>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`${styles.navItem} ${page === key ? styles.active : ''}`}
            onClick={() => onNavigate(key)}
          >
            <Icon icon={icon} size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <button
          className={`${styles.navItem} ${styles.darkToggle}`}
          onClick={onDarkToggle}
        >
          <span className={styles.darkLabel}>
            <Icon icon={darkMode ? Sun01Icon : Moon01Icon} size={16} />
            <span>{darkMode ? 'Светлая' : 'Тёмная'}</span>
          </span>
          <Toggle on={darkMode} onChange={onDarkToggle} />
        </button>

        {STREAK > 0 && <StreakBadge n={STREAK} />}

        <div className={styles.userChip}>
          <div className={styles.avatar}>М</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>Михаил П.</div>
            <div className={styles.userRole}>Студент · МГТУ</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
