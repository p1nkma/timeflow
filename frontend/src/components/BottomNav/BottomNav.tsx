import { useNavigate, useLocation } from 'react-router';
import { Icon, Clock01Icon, Calendar03Icon, Analytics01Icon, Setting06Icon } from '../../shared/ui';
import type { IconSvgElement } from '@hugeicons/react';
import styles from './BottomNav.module.css';

const NAV: { path: string; label: string; icon: IconSvgElement }[] = [
  { path: '/today',     label: 'Сегодня',     icon: Clock01Icon },
  { path: '/planner',   label: 'Планировщик', icon: Calendar03Icon },
  { path: '/analytics', label: 'Аналитика',   icon: Analytics01Icon },
  { path: '/settings',  label: 'Настройки',   icon: Setting06Icon },
];

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav} aria-label="Основная навигация">
      {NAV.map(({ path, label, icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => navigate(path)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon icon={icon} size={28} aria-hidden />
            <span className={styles.label}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
