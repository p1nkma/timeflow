import type { IconSvgElement } from '@hugeicons/react';
import { useNavigate, useLocation } from 'react-router';
import { Icon,
  Clock01Icon, Calendar03Icon, Analytics01Icon, Setting06Icon } from '../../shared/ui';
import { MOCK_USER } from '../../mocks/user';
import styles from './Sidebar.module.css';

interface SidebarProps {
  darkMode?: boolean;
  onDarkToggle?: () => void;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
}

const NAV: { path: string; label: string; icon: IconSvgElement }[] = [
  { path: '/today',     label: 'Сегодня',     icon: Clock01Icon },
  { path: '/planner',   label: 'Планировщик', icon: Calendar03Icon },
  { path: '/analytics', label: 'Аналитика',   icon: Analytics01Icon },
  { path: '/settings',  label: 'Настройки',   icon: Setting06Icon },
];

export function Sidebar({ collapsed = false, onCollapseToggle }: SidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
      aria-label="Навигация"
    >
      <div className={styles.brand}>
        <button
          className={styles.brandMark}
          onClick={onCollapseToggle}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          TF
        </button>
        {!collapsed && <span className={styles.brandName}>TimeFlow</span>}
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ path, label, icon }) => (
          <button
            key={path}
            className={`${styles.navItem} ${pathname === path ? styles.active : ''}`}
            onClick={() => navigate(path)}
            aria-current={pathname === path ? 'page' : undefined}
            title={collapsed ? label : undefined}
          >
            <Icon icon={icon} size={16} aria-hidden />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <button
          className={styles.userChip}
          onClick={() => navigate('/settings')}
          aria-label="Открыть настройки профиля"
          title={collapsed ? `${MOCK_USER.shortName} — настройки` : undefined}
        >
          <div className={styles.avatar}>{MOCK_USER.avatarMono}</div>
          {!collapsed && (
            <div className={styles.userInfo}>
              <div className={styles.userName}>{MOCK_USER.shortName}</div>
              <div className={styles.userRole}>{MOCK_USER.role} · {MOCK_USER.university}</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
