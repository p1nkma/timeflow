import type { IconSvgElement } from '@hugeicons/react';
import { useNavigate, useLocation } from 'react-router';
import { StreakBadge, Icon,
  Clock01Icon, Calendar03Icon, BarChartIcon, Setting06Icon } from '../../shared/ui';
import styles from './Sidebar.module.css';

interface SidebarProps {
  darkMode?: boolean;
  onDarkToggle?: () => void;
}

const NAV: { path: string; label: string; icon: IconSvgElement }[] = [
  { path: '/today',     label: 'Сегодня',     icon: Clock01Icon },
  { path: '/planner',   label: 'Планировщик', icon: Calendar03Icon },
  { path: '/analytics', label: 'Аналитика',   icon: BarChartIcon },
  { path: '/settings',  label: 'Настройки',   icon: Setting06Icon },
];

const STREAK = 7;

export function Sidebar(_props: SidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>TF</div>
        <span className={styles.brandName}>TimeFlow</span>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ path, label, icon }) => (
          <button
            key={path}
            className={`${styles.navItem} ${pathname === path ? styles.active : ''}`}
            onClick={() => navigate(path)}
            aria-current={pathname === path ? 'page' : undefined}
          >
            <Icon icon={icon} size={18} aria-hidden style={path === '/analytics' ? { transform: 'scaleY(-1)' } : undefined} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        {STREAK > 0 && <StreakBadge n={STREAK} />}

        <button
          className={styles.userChip}
          onClick={() => navigate('/settings')}
          aria-label="Открыть настройки профиля"
        >
          <div className={styles.avatar}>М</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>Михаил П.</div>
            <div className={styles.userRole}>Студент · МГТУ</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
