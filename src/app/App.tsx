import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { useAppDispatch, useAppSelector } from './hooks';
import { toggleDarkMode } from '../features/ui';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { BottomNav } from '../components/BottomNav/BottomNav';
import { Toast } from '../shared/ui';
import { TodayPage } from '../pages/Today/TodayPage';
import { PlannerPage } from '../pages/Planner/PlannerPage';
import { AnalyticsPage } from '../pages/Analytics/AnalyticsPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import styles from './App.module.css';

export function App() {
  const dispatch = useAppDispatch();
  const { darkMode } = useAppSelector(s => s.ui);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className={styles.app}>
      <div className={styles.sidebar}>
        <Sidebar
          darkMode={darkMode}
          onDarkToggle={() => dispatch(toggleDarkMode())}
        />
      </div>

      <main className={styles.main}>
        <Routes>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="/today"     element={<TodayPage />} />
          <Route path="/planner"   element={<PlannerPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings"  element={<SettingsPage />} />
          <Route path="*"          element={<Navigate to="/today" replace />} />
        </Routes>
      </main>

      <BottomNav />
      <Toast />
    </div>
  );
}
