import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { CategoryKey, EnergyLevel } from '../../types';
import { DateSheet, TimeSheet, DurationSheet, CategorySheet } from '../DateTimeSheet/DateTimeSheet';
import type { TaskFormValues } from './useTaskForm';
import styles from './TaskModal.module.css';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fmt } from '../../utils/time';
import { useGetCategoriesQuery } from '../../../features/categories/categoriesApi';

interface Props {
  values: TaskFormValues;
  update: <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => void;
  autoFocusTitle?: boolean;
  titlePlaceholder?: string;
  notesLabel?: string;
  onSubmitOnEnter?: () => void;
}

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'low',    label: 'Лёгкая'  },
  { value: 'medium', label: 'Средняя' },
  { value: 'high',   label: 'Тяжёлая' },
];

function fmtDuration(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? '1 час' : `${h} ч`;
  return `${h} ч ${m} мин`;
}

function fmtDateRu(iso: string): string {
  try { return format(parseISO(iso), 'd MMM yyyy', { locale: ru }); }
  catch { return iso; }
}

function useCatLabel(key: CategoryKey): string {
  const { data: cats = [] } = useGetCategoriesQuery();
  if (!key) return 'Выберите категорию';
  const cat = cats.find(c => c.key === key);
  return cat?.name ?? key;
}

export function TaskForm({
  values, update, autoFocusTitle, titlePlaceholder, notesLabel = 'Заметки', onSubmitOnEnter,
}: Props) {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<null | 'date' | 'time' | 'duration' | 'cat'>(null);
  const catLabel = useCatLabel(values.cat);

  const isSchedule = values.destination === 'schedule';
  const isInbox    = values.destination === 'inbox';
  const [extraOpen, setExtraOpen] = useState(false);

  return (
    <>
      <input
        className={styles.titleInput}
        placeholder={titlePlaceholder ?? 'Что нужно сделать?'}
        value={values.title}
        onChange={e => update('title', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onSubmitOnEnter) onSubmitOnEnter(); }}
        autoFocus={autoFocusTitle}
      />

      {isSchedule && (
        <div className={styles.fieldGroup}>
          <div className={styles.row2}>
            <div className={styles.fieldInline}>
              <span className={styles.fieldLabel}>Дата</span>
              <button type="button" className={styles.fieldControl} onClick={() => setSheet('date')}>
                {fmtDateRu(values.date)}
              </button>
            </div>
            <div className={styles.fieldInline}>
              <span className={styles.fieldLabel}>Начало</span>
              <button type="button" className={styles.fieldControl} onClick={() => setSheet('time')}>
                {fmt(values.start)}
              </button>
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.fieldInline}>
              <span className={styles.fieldLabel}>Длительность</span>
              <button type="button" className={styles.fieldControl} onClick={() => setSheet('duration')}>
                {fmtDuration(values.duration)}
              </button>
            </div>
            <div className={styles.fieldInline}>
              <span className={styles.fieldLabel}>Категория</span>
              <button
                type="button"
                className={`${styles.fieldControl} ${!values.cat ? styles.fieldControlPlaceholder : ''}`}
                onClick={() => setSheet('cat')}
              >
                {catLabel}
              </button>
              <button
                type="button"
                className={styles.newCatBtn}
                onClick={() => navigate('/settings')}
              >
                + Новая категория
              </button>
            </div>
          </div>

          <div className={styles.fieldInlineFull}>
            <span className={styles.fieldLabel}>Сложность</span>
            <div className={styles.energyGroup}>
              {ENERGY_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.energyChip} ${values.energy === o.value ? styles.energyChipActive : ''} ${styles[`energy_${o.value}`]}`}
                  onClick={() => update('energy', values.energy === o.value ? null : o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isInbox && (
        <div className={styles.fieldGroup}>
          <button
            type="button"
            className={styles.extraToggle}
            onClick={() => setExtraOpen(p => !p)}
          >
            <span>{extraOpen ? '− Скрыть' : '+ Дополнительно'}</span>
            <span className={styles.extraHint}>категория, заметки</span>
          </button>

          {extraOpen && (
            <div className={styles.extraFields}>
              <div className={styles.fieldInline}>
                <span className={styles.fieldLabel}>Категория</span>
                <button
                  type="button"
                  className={`${styles.fieldControl} ${!values.cat ? styles.fieldControlPlaceholder : ''}`}
                  onClick={() => setSheet('cat')}
                >
                  {catLabel}
                </button>
              </div>
              <div className={styles.fieldInlineFull}>
                <span className={styles.fieldLabel}>{notesLabel}</span>
                <textarea
                  className={styles.textarea}
                  placeholder="Доп. информация..."
                  value={values.notes}
                  onChange={e => update('notes', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {isSchedule && (
        <div className={styles.fieldInlineFull}>
          <span className={styles.fieldLabel}>{notesLabel}</span>
          <textarea
            className={styles.textarea}
            placeholder="Доп. информация..."
            value={values.notes}
            onChange={e => update('notes', e.target.value)}
          />
        </div>
      )}

      {sheet === 'date' && (
        <DateSheet
          value={values.date}
          onChange={v => { update('date', v); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'time' && (
        <TimeSheet
          value={values.start}
          onChange={v => { update('start', v); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'duration' && (
        <DurationSheet
          value={values.duration}
          onChange={v => { update('duration', v); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'cat' && (
        <CategorySheet
          value={values.cat as CategoryKey}
          onChange={v => { update('cat', v); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
