import type { IconSvgElement } from '@hugeicons/react';
import { useNavigate, useLocation } from 'react-router';
import { Icon,
  Clock01Icon, Calendar03Icon, Analytics01Icon, Setting06Icon } from '../../shared/ui';
import { MOCK_USER } from '../../mocks/user';
import styles from './Sidebar.module.css';

interface SidebarProps {
  darkMode?: boolean;
  onDarkToggle?: () => void;
}

const NAV: { path: string; label: string; icon: IconSvgElement }[] = [
  { path: '/today',     label: 'Сегодня',     icon: Clock01Icon },
  { path: '/planner',   label: 'Планировщик', icon: Calendar03Icon },
  { path: '/analytics', label: 'Аналитика',   icon: Analytics01Icon },
  { path: '/settings',  label: 'Настройки',   icon: Setting06Icon },
];

export function Sidebar(_props: SidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className={styles.sidebar} aria-label="Навигация">
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
            <Icon icon={icon} size={16} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <button
          className={styles.userChip}
          onClick={() => navigate('/settings')}
          aria-label="Открыть настройки профиля"
        >
          <div className={styles.avatar}>{MOCK_USER.avatarMono}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{MOCK_USER.shortName}</div>
            <div className={styles.userRole}>{MOCK_USER.role} · {MOCK_USER.university}</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
