import type { CategoryKey } from '../../types';
import { CAT_OPTIONS, DURATION_OPTIONS, TIME_OPTIONS } from './constants';
import type { TaskFormValues } from './useTaskForm';
import styles from './TaskModal.module.css';

interface Props {
  values: TaskFormValues;
  update: <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => void;
  autoFocusTitle?: boolean;
  titlePlaceholder?: string;
  notesLabel?: string;
  onSubmitOnEnter?: () => void;
}

export function TaskForm({
  values, update, autoFocusTitle, titlePlaceholder, notesLabel = 'Заметки', onSubmitOnEnter,
}: Props) {
  return (
    <>
      <div className={styles.field}>
        <span className={styles.label}>Название</span>
        <input
          className={styles.input}
          placeholder={titlePlaceholder}
          value={values.title}
          onChange={e => update('title', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && onSubmitOnEnter) onSubmitOnEnter(); }}
          autoFocus={autoFocusTitle}
        />
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <span className={styles.label}>Категория</span>
          <select
            className={styles.select}
            value={values.cat}
            onChange={e => update('cat', e.target.value as CategoryKey)}
          >
            {CAT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Дата</span>
          <input
            className={styles.input}
            type="date"
            value={values.date}
            onChange={e => update('date', e.target.value)}
          />
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <span className={styles.label}>Начало</span>
          <select
            className={styles.select}
            value={values.start}
            onChange={e => update('start', Number(e.target.value))}
          >
            {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Длительность</span>
          <select
            className={styles.select}
            value={values.duration}
            onChange={e => update('duration', Number(e.target.value))}
          >
            {DURATION_OPTIONS.map(d => (
              <option key={d} value={d}>{d < 60 ? `${d} мин` : `${d / 60} ч`}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{notesLabel}</span>
        <textarea
          className={styles.textarea}
          placeholder="Доп. информация..."
          value={values.notes}
          onChange={e => update('notes', e.target.value)}
        />
      </div>
    </>
  );
}
