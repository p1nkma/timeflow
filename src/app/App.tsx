import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { toggleDarkMode, setPage } from '../features/ui';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { Toast } from '../shared/ui';
import { TodayPage } from '../pages/Today/TodayPage';
import { PlannerPage } from '../pages/Planner/PlannerPage';
import { AnalyticsPage } from '../pages/Analytics/AnalyticsPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import styles from './App.module.css';

export function App() {
  const dispatch = useAppDispatch();
  const { page, darkMode } = useAppSelector(s => s.ui);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className={styles.app}>
      <Sidebar
        page={page}
        onNavigate={(p) => dispatch(setPage(p))}
        darkMode={darkMode}
        onDarkToggle={() => dispatch(toggleDarkMode())}
      />

      <main className={styles.main}>
        {page === 'today'     && <TodayPage />}
        {page === 'planner'   && <PlannerPage />}
        {page === 'analytics' && <AnalyticsPage />}
        {page === 'settings'  && <SettingsPage />}
      </main>

      <Toast />
    </div>
  );
}
