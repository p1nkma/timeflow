import { useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { Routes, Route, Navigate } from 'react-router'
import { useAppDispatch } from '../app/hooks'
import { setNowMin } from '../features/tasks'
import { getToken, setToken } from '../features/auth'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { Toast, Fab, QuickAddModal } from '../shared/ui'
import { TodayPage } from '../pages/Today/TodayPage'
import { PlannerPage } from '../pages/Planner/PlannerPage'
import { AnalyticsPage } from '../pages/Analytics/AnalyticsPage'
import { SettingsPage } from '../pages/Settings/SettingsPage'
import styles from './TmaApp.module.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export function TmaApp() {
  const dispatch = useAppDispatch()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)

  // Telegram auth → JWT в общем хранилище tf.token
  useEffect(() => {
    WebApp.ready()
    WebApp.expand()

    if (getToken()) {
      setReady(true)
      return
    }

    const initData = WebApp.initData
    if (!initData) {
      // Dev mode — нет initData, просто показываем приложение без авторизации
      setReady(true)
      return
    }

    fetch(`${API_BASE}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data: initData }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.access_token) {
          setToken(data.access_token)
          setReady(true)
        } else {
          setError('Ошибка авторизации')
        }
      })
      .catch(() => setError('Нет соединения с сервером'))
  }, [])

  // Тик таймера (как в App.tsx)
  useEffect(() => {
    function tick() {
      const d = new Date()
      dispatch(setNowMin(d.getHours() * 60 + d.getMinutes()))
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [dispatch])

  if (error) {
    return (
      <div className={styles.center}>
        <p className="t-body muted">{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className={styles.center}>
        <p className="t-body muted">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className={styles.app}>
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
  )
}
