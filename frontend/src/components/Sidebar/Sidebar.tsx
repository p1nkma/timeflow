import type { IconSvgElement } from '@hugeicons/react';
import { useNavigate, useLocation } from 'react-router';
import { Icon,
  Clock01Icon, Calendar03Icon, Analytics01Icon, Setting06Icon } from '../../shared/ui';
import { useGetMeQuery, userInitials } from '../../features/user';
import styles from './Sidebar.module.css';

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[1][0]}.`;
}

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
  const { data: me } = useGetMeQuery();

  const displayName  = me ? shortName(me.full_name) : '…';
  const displayInits = me ? userInitials(me.full_name).slice(0, 1) : '?';
  const displayRole  = me?.role === 'admin' ? 'Администратор' : 'Пользователь';

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
          title={collapsed ? `${displayName} — настройки` : undefined}
        >
          <div className={styles.avatar}>{displayInits}</div>
          {!collapsed && (
            <div className={styles.userInfo}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userRole}>{displayRole}</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
