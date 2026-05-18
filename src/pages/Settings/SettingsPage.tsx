import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { toggleDarkMode } from '../../features/ui';
import { Toggle } from '../../shared/ui';
import styles from './SettingsPage.module.css';

const UNI_SCHEDULE = [
  { day: 'Понедельник', pairs: 'Матан 8:30, Физра 10:15' },
  { day: 'Вторник',     pairs: 'Программирование 11:45' },
  { day: 'Среда',       pairs: 'Линейная алгебра 10:00, Программирование 11:45' },
  { day: 'Четверг',     pairs: 'Физика 8:30' },
  { day: 'Пятница',     pairs: 'Матан 10:00, Теормех 13:30' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={`t-h3 ${styles.sectionTitle}`}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className="t-body">{label}</span>
      <div className={styles.rowValue}>{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector(s => s.ui.darkMode);

  return (
    <div className={styles.page}>
      <h2 className="t-h2">Настройки</h2>

      <div className={styles.grid}>
        {/* Левая колонка */}
        <div className={styles.col}>

          <Section title="Профиль">
            <div className={styles.profile}>
              <div className={styles.avatar}>МП</div>
              <div className={styles.profileInfo}>
                <span className="t-body" style={{ fontWeight: 500 }}>Михаил Полунин</span>
                <span className="t-small muted">poluninmisa140@gmail.com</span>
                <button className={styles.btnOutline}>Редактировать</button>
              </div>
            </div>
            <Row label="Институт"><span className="t-body muted">МГТУ им. Баумана</span></Row>
            <Row label="Специальность"><span className="t-body muted">Программная инженерия</span></Row>
          </Section>

          <Section title="Интерфейс">
            <Row label="Тёмная тема">
              <Toggle on={darkMode} onChange={() => dispatch(toggleDarkMode())} />
            </Row>
            <Row label="Компактный режим"><Toggle on={true}  onChange={() => {}} /></Row>
            <Row label="Анимации">        <Toggle on={true}  onChange={() => {}} /></Row>
            <Row label="Уведомления">     <Toggle on={false} onChange={() => {}} /></Row>
            <Row label="Язык">            <span className="t-small muted">Русский</span></Row>
          </Section>

          <Section title="Уведомления">
            <Row label="Перед задачей (5 мин)">    <Toggle on={true}  onChange={() => {}} /></Row>
            <Row label="Напоминание о перерыве">   <Toggle on={true}  onChange={() => {}} /></Row>
            <Row label="Дневной отчёт">            <Toggle on={false} onChange={() => {}} /></Row>
            <Row label="Еженедельный дайджест">    <Toggle on={true}  onChange={() => {}} /></Row>
          </Section>

        </div>

        {/* Правая колонка */}
        <div className={styles.col}>

          <Section title="Расписание вуза">
            {UNI_SCHEDULE.map(s => (
              <Row key={s.day} label={s.day}>
                <span className="t-small muted">{s.pairs}</span>
              </Row>
            ))}
            <button className={styles.btnOutline} style={{ marginTop: 'var(--space-2)' }}>
              + Добавить пару
            </button>
          </Section>

          <Section title="ИИ Планировщик">
            <Row label="Авто-планирование">        <Toggle on={true} onChange={() => {}} /></Row>
            <Row label="Учёт энергии по времени">  <Toggle on={true} onChange={() => {}} /></Row>
            <Row label="Блоки глубокой работы">    <Toggle on={true} onChange={() => {}} /></Row>
            <Row label="Пик концентрации">         <span className="t-small muted">9:00 — 13:00</span></Row>
            <Row label="Модель ИИ">                <span className="t-small muted">Claude Sonnet</span></Row>
          </Section>

          <Section title="Данные и конфиденциальность">
            <Row label="Хранение данных">  <span className="t-small muted">Локально</span></Row>
            <Row label="Синхронизация">    <span className="t-small muted">Выключена</span></Row>
            <Row label="Резервные копии">  <span className="t-small muted">Еженедельно</span></Row>
            <div className={styles.dangerZone}>
              <button className={styles.btnOutline}>Экспортировать данные</button>
              <button className={styles.btnDanger}>Очистить все данные</button>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
