import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { useAppDispatch, useAppSelector } from './hooks';
import { toggleDarkMode, showToast } from '../features/ui';
import { setNowMin, resetTasks } from '../features/tasks';
import { resetInbox } from '../features/inbox';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { BottomNav } from '../components/BottomNav/BottomNav';
import { Toast, Fab, QuickAddModal } from '../shared/ui';
import { TodayPage } from '../pages/Today/TodayPage';
import { PlannerPage } from '../pages/Planner/PlannerPage';
import { AnalyticsPage } from '../pages/Analytics/AnalyticsPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import styles from './App.module.css';

export function App() {
  const dispatch = useAppDispatch();
  const { darkMode } = useAppSelector(s => s.ui);
  const [showNewTask, setShowNewTask]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    function tick() {
      const d = new Date();
      dispatch(setNowMin(d.getHours() * 60 + d.getMinutes()));
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [dispatch]);

  // Demo reset: ⌘+Shift+R / Ctrl+Shift+R → restore initial mock data
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        dispatch(resetTasks());
        dispatch(resetInbox());
        dispatch(showToast({ message: 'Демо-данные сброшены', variant: 'success' }));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <div className={`${styles.app} ${sidebarCollapsed ? styles.appCollapsed : ''}`}>
      <div className={styles.sidebar}>
        <Sidebar
          darkMode={darkMode}
          onDarkToggle={() => dispatch(toggleDarkMode())}
          collapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed(c => !c)}
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
      <Fab onClick={() => setShowNewTask(true)} />
      {showNewTask && <QuickAddModal onClose={() => setShowNewTask(false)} />}
    </div>
  );
}
