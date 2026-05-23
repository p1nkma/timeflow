import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { toggleDarkMode } from '../../features/ui';
import { setChronotype, setWorkHours, toggleCategory } from '../../features/planner';
import { Toggle } from '../../shared/ui';
import { CATEGORIES } from '../../shared/utils/categories';
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
      <h3 className={`t-xs ${styles.sectionTitle}`}>{title}</h3>
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
                  onClick={() => dispatch(setChronotype(o.value))}
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
                  onClick={() => dispatch(setWorkHours({ start: h * 60, end: planner.workEnd }))}
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
                  onClick={() => dispatch(setWorkHours({ start: planner.workStart, end: h * 60 }))}
                >
                  {fmt(h * 60)}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Активные категории" hint="Задачи этих категорий включаются в авто-план">
            <div className={styles.chipGroup}>
              {(Object.keys(CATEGORIES) as CategoryKey[]).filter(k => k !== 'fixed').map(k => (
                <button
                  key={k}
                  className={`${styles.chip} ${planner.enabledCategories.includes(k) ? styles.chipActive : ''}`}
                  onClick={() => dispatch(toggleCategory(k))}
                >
                  {CATEGORIES[k].label}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── Данные ── */}
        <Section title="Данные">
          <Row label="Хранение данных">
            <span className="t-small tertiary">Локально</span>
          </Row>
          <div className={styles.dangerZone}>
            <button className={styles.btnDanger}>Очистить все данные</button>
          </div>
        </Section>

      </div>
    </div>
  );
}
