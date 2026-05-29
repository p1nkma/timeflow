import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { toggleDarkMode, showToast } from '../../features/ui';
import { setChronotype, setWorkHours, toggleCategory } from '../../features/planner';
import { useGetMeQuery, useUpdateMeMutation, userInitials } from '../../features/user';
import { useGetCategoriesQuery } from '../../features/categories/categoriesApi';
import {
  useGetTelegramStatusQuery, useLazyGetTelegramAuthLinkQuery,
  useDisconnectTelegramMutation, useSetTelegramNotificationsMutation,
  useGetGoogleStatusQuery, useLazyGetGoogleAuthUrlQuery,
  useSyncGoogleCalendarMutation, useDisconnectGoogleMutation,
} from '../../features/integrations/integrationsApi';
import { clearToken } from '../../features/auth';
import { Toggle } from '../../shared/ui';
import { fmt } from '../../shared/utils/time';
import type { ChronoType, CategoryKey } from '../../shared/types';
import styles from './SettingsPage.module.css';

const CHRONOTYPE_OPTIONS: { value: ChronoType; label: string; hint: string }[] = [
  { value: 'lark',   label: 'Жаворонок', hint: 'Пик 6–12' },
  { value: 'pigeon', label: 'Голубь',    hint: 'Пик 9–15' },
  { value: 'owl',    label: 'Сова',      hint: 'Пик 12–20' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={`t-xs ${styles.sectionTitle}`}>{title}</h2>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>
        <span className="t-body">{label}</span>
        {hint && <span className={`t-xs ${styles.rowHint}`}>{hint}</span>}
      </div>
      <div className={styles.rowValue}>{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const dispatch  = useAppDispatch();
  const darkMode  = useAppSelector(s => s.ui.darkMode);
  const planner   = useAppSelector(s => s.planner);
  const { data: me } = useGetMeQuery();
  const [updateMe] = useUpdateMeMutation();
  const { data: apiCats = [] } = useGetCategoriesQuery();

  const { data: tgStatus }   = useGetTelegramStatusQuery();
  const { data: gcalStatus } = useGetGoogleStatusQuery();
  const [getTgLink]          = useLazyGetTelegramAuthLinkQuery();
  const [getGcalUrl]         = useLazyGetGoogleAuthUrlQuery();
  const [syncGcal, { isLoading: syncing }] = useSyncGoogleCalendarMutation();
  const [disconnectTg]       = useDisconnectTelegramMutation();
  const [disconnectGcal]     = useDisconnectGoogleMutation();
  const [setTgNotif]         = useSetTelegramNotificationsMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      dispatch(showToast({ message: 'Google Календарь подключён', variant: 'success' }));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [dispatch]);

  async function handleConnectTelegram() {
    const res = await getTgLink().unwrap().catch(() => null);
    if (res?.url) window.open(res.url, '_blank', 'noopener');
  }

  async function handleConnectGoogle() {
    const res = await getGcalUrl().unwrap().catch(() => null);
    if (res?.url) window.location.assign(res.url);
  }

  function handleLogout() {
    clearToken();
    window.location.assign('/login');
  }

  return (
    <div className={styles.page}>
      <div className={styles.stickyTop}>
        <h1 className="t-h2">Настройки</h1>
      </div>

      <div className={styles.content}>

        {/* ── Профиль ── */}
        <section className={styles.section}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>
              {me ? userInitials(me.full_name) : '…'}
            </div>
            <div className={styles.profileInfo}>
              <span className={`t-body ${styles.profileName}`}>
                {me?.full_name ?? 'Загрузка…'}
              </span>
              <span className="t-small muted">{me?.email ?? ''}</span>
              {me?.role === 'admin' && (
                <span className="t-small muted">Администратор</span>
              )}
            </div>
          </div>
        </section>

        {/* ── Внешний вид ── */}
        <Section title="Внешний вид">
          <Row label="Тёмная тема">
            <Toggle on={darkMode} onChange={() => dispatch(toggleDarkMode())} />
          </Row>
        </Section>

        {/* ── Планировщик ── */}
        <Section title="Планировщик">
          <Row label="Хронотип" hint="Влияет на расстановку задач по дню">
            <div className={styles.chipGroup}>
              {CHRONOTYPE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={`${styles.chip} ${planner.chronotype === o.value ? styles.chipActive : ''}`}
                  onClick={() => {
                    dispatch(setChronotype(o.value));
                    updateMe({ chronotype: o.value });
                  }}
                  title={o.hint}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Начало рабочего дня">
            <div className={styles.chipGroup}>
              {[6, 7, 8, 9, 10].map(h => (
                <button
                  key={h}
                  className={`${styles.chip} ${planner.workStart === h * 60 ? styles.chipActive : ''}`}
                  onClick={() => {
                    dispatch(setWorkHours({ start: h * 60, end: planner.workEnd }));
                    updateMe({ work_start: h * 60 });
                  }}
                >
                  {fmt(h * 60)}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Конец рабочего дня">
            <div className={styles.chipGroup}>
              {[18, 19, 20, 21, 22].map(h => (
                <button
                  key={h}
                  className={`${styles.chip} ${planner.workEnd === h * 60 ? styles.chipActive : ''}`}
                  onClick={() => {
                    dispatch(setWorkHours({ start: planner.workStart, end: h * 60 }));
                    updateMe({ work_end: h * 60 });
                  }}
                >
                  {fmt(h * 60)}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Активные категории" hint="Задачи этих категорий включаются в авто-план">
            <div className={styles.chipGroup}>
              {apiCats.filter(c => c.key !== 'fixed').map(c => (
                <button
                  key={c.key}
                  className={`${styles.chip} ${planner.enabledCategories.includes(c.key as CategoryKey) ? styles.chipActive : ''}`}
                  onClick={() => dispatch(toggleCategory(c.key as CategoryKey))}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── Интеграции ── */}
        <Section title="Интеграции">
          {/* Telegram */}
          <div className={styles.integration}>
            <div className={styles.integrationIcon} aria-hidden>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M21.2 4.2L2.8 11.5c-1 .4-1 1.5 0 1.9l4.7 1.6 1.8 5.7c.2.6 1 .8 1.5.3l2.6-2.4 4.8 3.5c.7.5 1.6.1 1.7-.7l2.9-15.6c.2-1-.7-1.7-1.6-1.3zM9.7 15.5l-.4 2.8-1-3.4 8.3-7.4-6.9 8z"/>
              </svg>
            </div>
            <div className={styles.integrationBody}>
              <span className={styles.integrationTitle}>Telegram</span>
              {tgStatus?.connected ? (
                <span className={styles.integrationDesc}>
                  Подключён
                  {tgStatus.notifications_enabled !== undefined && (
                    <> · уведомления {tgStatus.notifications_enabled ? 'вкл' : 'выкл'}</>
                  )}
                </span>
              ) : (
                <span className={styles.integrationDesc}>
                  Подключи бота, чтобы получать уведомления и добавлять дела через чат
                </span>
              )}
            </div>
            {tgStatus?.connected ? (
              <div className={styles.integrationActions}>
                <Toggle
                  on={tgStatus.notifications_enabled ?? true}
                  onChange={v => setTgNotif(v)}
                />
                <button className={styles.integrationBtnSecondary} onClick={() => disconnectTg()}>
                  Отключить
                </button>
              </div>
            ) : (
              <button className={styles.integrationBtn} onClick={handleConnectTelegram}>
                Подключить
              </button>
            )}
          </div>

          {/* Google Calendar */}
          <div className={styles.integration}>
            <div className={styles.integrationIcon} aria-hidden>
              <img src="/google-calendar.svg" width="24" height="24" alt="" />
            </div>
            <div className={styles.integrationBody}>
              <span className={styles.integrationTitle}>Google Календарь</span>
              {gcalStatus?.connected ? (
                <span className={styles.integrationDesc}>Подключён · события импортируются автоматически</span>
              ) : (
                <span className={styles.integrationDesc}>
                  Импортируй события из Google Calendar как заблокированные слоты
                </span>
              )}
            </div>
            {gcalStatus?.connected ? (
              <div className={styles.integrationActions}>
                <button
                  className={styles.integrationBtn}
                  onClick={() => syncGcal()}
                  disabled={syncing}
                >
                  {syncing ? 'Синхронизация…' : 'Синхронизировать'}
                </button>
                <button className={styles.integrationBtnSecondary} onClick={() => disconnectGcal()}>
                  Отключить
                </button>
              </div>
            ) : (
              <button className={styles.integrationBtn} onClick={handleConnectGoogle}>
                Подключить
              </button>
            )}
          </div>
        </Section>

        {/* ── Данные ── */}
        <Section title="Данные">
          <Row label="Хранение данных">
            <span className="t-small tertiary">На сервере</span>
          </Row>
          <div className={styles.dangerZone}>
            <button className={styles.btnDanger} onClick={handleLogout}>Выйти</button>
          </div>
        </Section>

      </div>
    </div>
  );
}
