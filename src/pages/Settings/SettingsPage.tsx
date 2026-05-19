import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { toggleDarkMode } from '../../features/ui';
import { Toggle } from '../../shared/ui';
import styles from './SettingsPage.module.css';

const UNI_SCHEDULE = [
  { day: 'Пн', pairs: 'Матан 8:30, Физра 10:15' },
  { day: 'Вт', pairs: 'Программирование 11:45' },
  { day: 'Ср', pairs: 'Линал 10:00, Программирование 11:45' },
  { day: 'Чт', pairs: 'Физика 8:30' },
  { day: 'Пт', pairs: 'Матан 10:00, Теормех 13:30' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={`t-xs ${styles.sectionTitle}`}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector(s => s.ui.darkMode);

  const [compact,   setCompact]   = useState(false);
  const [animations, setAnimations] = useState(true);
  const [notifOn,   setNotifOn]   = useState(false);
  const [autoplan,  setAutoplan]  = useState(true);
  const [energy,    setEnergy]    = useState(true);
  const [deepWork,  setDeepWork]  = useState(true);
  const [notifTask, setNotifTask] = useState(true);
  const [notifBreak,setNotifBreak]= useState(true);
  const [notifDaily,setNotifDaily]= useState(false);
  const [notifWeek, setNotifWeek] = useState(true);

  return (
    <div className={styles.page}>
      <div className={styles.stickyTop}>
        <h2 className="t-h2">Настройки</h2>
      </div>

      <div className={styles.content}>

        {/* ── Профиль ── */}
        <section className={styles.section}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>МП</div>
            <div className={styles.profileInfo}>
              <span className="t-body" style={{ fontWeight: 500 }}>Михаил Полунин</span>
              <span className="t-small muted">poluninmisa140@gmail.com</span>
              <span className="t-small muted">МГТУ · Программная инженерия</span>
            </div>
            <button className={styles.btnOutline} style={{ marginLeft: 'auto' }}>
              Редактировать
            </button>
          </div>
        </section>

        {/* ── Внешний вид ── */}
        <Section title="Внешний вид">
          <Row label="Тёмная тема">
            <Toggle on={darkMode} onChange={() => dispatch(toggleDarkMode())} />
          </Row>
          <Row label="Компактный режим" hint="Уменьшает отступы и размер карточек">
            <Toggle on={compact} onChange={() => setCompact(v => !v)} />
          </Row>
          <Row label="Анимации">
            <Toggle on={animations} onChange={() => setAnimations(v => !v)} />
          </Row>
          <Row label="Язык">
            <span className={styles.valueChevron}>
              <span className={`t-small ${styles.valueText}`}>Русский</span>
              <span className={styles.chevron}>›</span>
            </span>
          </Row>
        </Section>

        {/* ── ИИ Планировщик ── */}
        <Section title="ИИ Планировщик">
          <Row label="Авто-планирование" hint="ИИ расставляет задачи по слотам с учётом хронотипа">
            <Toggle on={autoplan} onChange={() => setAutoplan(v => !v)} />
          </Row>
          <Row label="Учёт энергии" hint="Тяжёлые задачи — в пик, лёгкие — в спад">
            <Toggle on={energy} onChange={() => setEnergy(v => !v)} />
          </Row>
          <Row label="Блоки глубокой работы" hint="Резервировать 2-часовые окна без прерываний">
            <Toggle on={deepWork} onChange={() => setDeepWork(v => !v)} />
          </Row>
          <Row label="Тональность советов" hint="Насколько настойчиво ИИ напоминает о задачах">
            <span className={styles.valueChevron}>
              <span className={`t-small ${styles.valueText}`}>Мягкая</span>
              <span className={styles.chevron}>›</span>
            </span>
          </Row>
          <Row label="Пик концентрации" hint="Самые важные задачи ставятся в этот интервал">
            <span className={styles.valueChevron}>
              <span className={`t-small ${styles.valueText}`}>09:00 — 13:00</span>
              <span className={styles.chevron}>›</span>
            </span>
          </Row>
          <Row label="Модель ИИ">
            <span className={styles.valueChevron}>
              <span className={`t-small ${styles.valueText}`}>Claude Sonnet</span>
              <span className={styles.chevron}>›</span>
            </span>
          </Row>
        </Section>

        {/* ── Уведомления ── */}
        <Section title="Уведомления">
          <Row label="Включить уведомления">
            <Toggle on={notifOn} onChange={() => setNotifOn(v => !v)} />
          </Row>
          <Row label="Перед задачей" hint="За 5 минут до начала">
            <Toggle on={notifTask} onChange={() => setNotifTask(v => !v)} />
          </Row>
          <Row label="Напоминание о перерыве" hint="Каждые 50 минут активной работы">
            <Toggle on={notifBreak} onChange={() => setNotifBreak(v => !v)} />
          </Row>
          <Row label="Дневной отчёт" hint="В 21:00 — сводка по выполненным задачам">
            <Toggle on={notifDaily} onChange={() => setNotifDaily(v => !v)} />
          </Row>
          <Row label="Еженедельный дайджест" hint="По воскресеньям — анализ недели">
            <Toggle on={notifWeek} onChange={() => setNotifWeek(v => !v)} />
          </Row>
        </Section>

        {/* ── Расписание вуза ── */}
        <Section title="Расписание вуза">
          <div className={styles.schedule}>
            {UNI_SCHEDULE.map(s => (
              <div key={s.day} className={styles.scheduleRow}>
                <span className={`t-xs ${styles.scheduleDay}`}>{s.day}</span>
                <span className="t-small muted">{s.pairs}</span>
              </div>
            ))}
          </div>
          <div className={styles.scheduleActions}>
            <button className={styles.btnOutline}>+ Добавить пару</button>
          </div>
        </Section>

        {/* ── Данные ── */}
        <Section title="Данные и конфиденциальность">
          <Row label="Хранение данных">
            <span className="t-small tertiary">Локально</span>
          </Row>
          <Row label="Синхронизация">
            <span className="t-small tertiary">Выключена</span>
          </Row>
          <Row label="Резервные копии">
            <span className="t-small tertiary">Еженедельно</span>
          </Row>
          <div className={styles.dangerZone}>
            <button className={styles.btnOutline}>Экспортировать данные</button>
            <button className={styles.btnDanger}>Очистить все данные</button>
          </div>
        </Section>

      </div>
    </div>
  );
}
