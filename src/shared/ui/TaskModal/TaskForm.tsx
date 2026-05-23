import { useState } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router';
import type { CategoryKey, EnergyLevel } from '../../types';
import { DatePicker } from '../TimePicker/DatePicker';
import { Icon, Cancel01Icon } from '../Icon/Icon';
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

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'low',    label: 'Лёгкая'  },
  { value: 'medium', label: 'Средняя' },
  { value: 'high',   label: 'Тяжёлая' },
];

function fmtDateRu(iso: string): string {
  try { return format(parseISO(iso), 'd MMM yyyy', { locale: ru }); }
  catch { return iso; }
}

export function TaskForm({
  values, update, autoFocusTitle, titlePlaceholder, notesLabel = 'Заметки', onSubmitOnEnter,
}: Props) {
  const navigate = useNavigate();
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [dateDraft, setDateDraft]         = useState(values.date);
  const [extraOpen, setExtraOpen]         = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSchedule = values.destination === 'schedule';
  const isInbox    = values.destination === 'inbox';

  function openDateSheet() { setDateDraft(values.date); setDateSheetOpen(true); }
  function confirmDate()   { update('date', dateDraft); setDateSheetOpen(false); }

  return (
    <>
      {/* Title — always visible, big and airy */}
      <input
        className={styles.titleInput}
        placeholder={titlePlaceholder ?? 'Что нужно сделать?'}
        value={values.title}
        onChange={e => update('title', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onSubmitOnEnter) onSubmitOnEnter(); }}
        autoFocus={autoFocusTitle}
      />

      {/* Schedule fields */}
      {isSchedule && (
        <div className={styles.fieldGroup}>
          <div className={styles.row2}>
            <div className={styles.fieldInline}>
              <span className={styles.fieldLabel}>Дата</span>
              <button type="button" className={styles.fieldControl} onClick={openDateSheet}>
                {fmtDateRu(values.date)}
              </button>
            </div>
            <div className={styles.fieldInline}>
              <span className={styles.fieldLabel}>Начало</span>
              <select
                className={styles.fieldControl}
                value={values.start}
                onChange={e => update('start', Number(e.target.value))}
              >
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.fieldInline}>
              <span className={styles.fieldLabel}>Длительность</span>
              <select
                className={styles.fieldControl}
                value={values.duration}
                onChange={e => update('duration', Number(e.target.value))}
              >
                {DURATION_OPTIONS.map(d => (
                  <option key={d} value={d}>{d < 60 ? `${d} мин` : `${d / 60} ч`}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldInline}>
              <span className={styles.fieldLabel}>Категория</span>
              <select
                className={styles.fieldControl}
                value={values.cat}
                onChange={e => update('cat', e.target.value as CategoryKey)}
              >
                {CAT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <button
                type="button"
                className={styles.newCatBtn}
                onClick={() => navigate('/settings')}
              >
                + Новая категория
              </button>
            </div>
          </div>

          {/* Energy — full width segmented */}
          <div className={styles.fieldInlineFull}>
            <span className={styles.fieldLabel}>Нагрузка</span>
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

      {/* Inbox: extra fields behind disclosure */}
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
                <select
                  className={styles.fieldControl}
                  value={values.cat}
                  onChange={e => update('cat', e.target.value as CategoryKey)}
                >
                  {CAT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
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

      {/* Notes for schedule mode */}
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

      {dateSheetOpen && createPortal(
        <div
          className={styles.sheetBackdrop}
          onClick={e => { if (e.target === e.currentTarget) setDateSheetOpen(false); }}
        >
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Выбрать дату">
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>Выбрать дату</span>
              <button className={styles.closeBtn} onClick={() => setDateSheetOpen(false)} aria-label="Закрыть">
                <Icon icon={Cancel01Icon} size={14} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <DatePicker value={dateDraft} onChange={setDateDraft} minDate={today} />
              <button className={styles.sheetConfirmBtn} onClick={confirmDate}>
                Готово
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
