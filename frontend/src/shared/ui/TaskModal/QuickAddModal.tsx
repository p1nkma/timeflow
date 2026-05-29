import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { selectAllTasks, selectNowMin } from '../../../features/tasks';
import { useTaskApi } from '../../../features/tasks/useTaskApi';
import { showToast } from '../../../features/ui';
import { findFreeSlot } from '../../utils/time';
import { CATEGORIES } from '../../utils/categories';
import { parseQuickAdd } from '../../utils/parseQuickAdd';
import type { CategoryKey, EnergyLevel } from '../../types';
import { Icon, Cancel01Icon } from '../Icon/Icon';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { ModalShell } from '../ModalShell/ModalShell';
import { DateSheet, TimeSheet, CategorySheet, DurationSheet, EnergySheet } from '../DateTimeSheet/DateTimeSheet';
import { TODAY_ISO } from './constants';
import styles from './QuickAddModal.module.css';


interface Props {
  onClose: () => void;
  defaultDate?: string;
  defaultStart?: number;
}

type Override<T> = { value: T | undefined; explicit: boolean };

interface Overrides {
  date:     Override<string>;
  start:    Override<number>;
  duration: Override<number>;
  cat:      Override<CategoryKey>;
  energy:   Override<EnergyLevel>;
}

const initOverride = <T,>(): Override<T> => ({ value: undefined, explicit: false });

function fmtDate(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d))    return 'Сегодня';
  if (isTomorrow(d)) return 'Завтра';
  return format(d, 'd MMM', { locale: ru });
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function fmtDuration(min: number): string {
  // Гибрид: короткое — в минутах, ровные часы — в часах, остальное — в минутах
  if (min < 60) return `${min}м`;
  if (min % 60 === 0) return `${min / 60}ч`;
  return `${min}м`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const MARK_CLASS: Record<string, string> = {
  date:     styles.markDate,
  time:     styles.markTime,
  duration: styles.markDuration,
  category: styles.markCategory,
  energy:   styles.markEnergy,
};

export function QuickAddModal({ onClose, defaultDate, defaultStart: defaultStartProp }: Props) {
  const dispatch = useAppDispatch();
  const taskApi  = useTaskApi();
  const allTasks = useAppSelector(selectAllTasks);
  const nowMin   = useAppSelector(selectNowMin);
  const planner  = useAppSelector(s => s.planner);

  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [sheet, setSheet] = useState<null | 'date' | 'time' | 'cat' | 'duration' | 'energy'>(null);

  const [overrides, setOverrides] = useState<Overrides>({
    date:     defaultDate     ? { value: defaultDate,      explicit: true } : initOverride(),
    start:    defaultStartProp !== undefined ? { value: defaultStartProp, explicit: true } : initOverride(),
    duration: initOverride(),
    cat:      initOverride(),
    energy:   initOverride(),
  });

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  // Финальные значения: override > parsed > дефолт
  const finalCat: CategoryKey = overrides.cat.value ?? parsed.cat ?? (planner.enabledCategories[0] ?? 'study');
  const finalDate: string | undefined =
    overrides.date.explicit ? overrides.date.value : parsed.date;
  const finalDuration: number = overrides.duration.value ?? parsed.duration ?? 60;
  const finalEnergy: EnergyLevel | undefined =
    overrides.energy.explicit ? overrides.energy.value : (overrides.energy.value ?? parsed.energy);

  // Явно заданное время (пользователем или из текста) — без авто-вычисления
  const explicitStart: number | undefined =
    overrides.start.explicit ? overrides.start.value
    : parsed.start !== undefined ? parsed.start
    : undefined;

  // Авто-слот считается только в момент сабмита
  function resolveStart(): number {
    if (explicitStart !== undefined) return explicitStart;
    const dateISO = finalDate ?? TODAY_ISO();
    const busy = allTasks.filter(t => (t.date ?? TODAY_ISO()) === dateISO);
    const minStart = dateISO === TODAY_ISO() ? Math.max(nowMin, planner.workStart) : planner.workStart;
    return findFreeSlot(busy, finalDuration, minStart, planner.workEnd);
  }

  // Для отображения в чипе — только явное время
  const finalStart = explicitStart;

  const goesToInbox = !finalDate && explicitStart === undefined;

  // Подсветка: строим HTML с <mark> поверх токенов
  const highlightedHtml = useMemo(() => {
    if (!text) return '';
    let html = '';
    let cursor = 0;
    for (const t of parsed.tokens) {
      html += escapeHtml(text.slice(cursor, t.start));
      html += `<mark class="${styles.mark} ${MARK_CLASS[t.type] ?? ''}">${escapeHtml(text.slice(t.start, t.end))}</mark>`;
      cursor = t.end;
    }
    html += escapeHtml(text.slice(cursor));
    // sync trailing newline — textarea рендерит '\n' но не показывает, добавим пробел чтобы высота совпала
    if (html.endsWith('\n')) html += ' ';
    return html;
  }, [text, parsed.tokens]);

  function syncScroll() {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function handleSubmit() {
    const titleSource = parsed.title || text.trim();
    if (!titleSource) return;

    if (goesToInbox) {
      taskApi.addInboxItem({ title: titleSource, cat: finalCat });
      dispatch(showToast({ message: 'Добавлено в Inbox', variant: 'default' }));
    } else {
      const start = resolveStart();
      taskApi.addTask({
        title:  titleSource,
        date:   finalDate ?? TODAY_ISO(),
        start,
        end:    start + finalDuration,
        cat:    finalCat,
        source: 'user',
        energy: finalEnergy,
        notes:  notes.trim() || undefined,
      });
      dispatch(showToast({ message: 'Задача создана', variant: 'success' }));
    }
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && sheet === null) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function setOverride<K extends keyof Overrides>(key: K, value: Overrides[K]['value']) {
    setOverrides(p => ({ ...p, [key]: { value, explicit: true } }));
  }

  function clearOverride<K extends keyof Overrides>(key: K) {
    setOverrides(p => ({ ...p, [key]: { value: undefined, explicit: true } }));
  }

  const canSubmit = (parsed.title || text.trim()).length > 0;

  return (
    <>
    <ModalShell
      onClose={onClose}
      backdropClassName={styles.backdrop}
      className={styles.modal}
      ariaLabel="Быстрое добавление задачи"
    >
      <div onKeyDown={onKeyDown} style={{ display: 'contents' }}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Новая задача</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.inputWrap}>
            {/* спейсер — растягивает контейнер */}
            <div
              className={styles.highlight}
              aria-hidden
            >{text || ' '}</div>
            {/* видимый overlay с подсветкой */}
            <div
              ref={highlightRef}
              className={styles.highlightOverlay}
              aria-hidden
              dangerouslySetInnerHTML={{ __html: highlightedHtml || '' }}
            />
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={text}
              onChange={e => setText(e.target.value)}
              onScroll={syncScroll}
              placeholder="Что нужно сделать?"
              rows={1}
              spellCheck={false}
            />
          </div>

          <div className={styles.syntaxHint}>
            Подсказка: <code>завтра</code> · <code>10:00</code> · <code>90м</code> · <code>#учёба</code> · <code>!!</code>
          </div>

          <div className={styles.chips}>
            {/* Дата */}
            <div className={`${styles.whenGroup} ${(sheet === 'date' || sheet === 'time') ? styles.whenGroupActive : ''}`}>
              <button
                type="button"
                className={`${styles.chip} ${finalDate ? styles.chipFilled : styles.chipEmpty}`}
                onClick={() => setSheet('date')}
              >
                <span>{finalDate ? fmtDate(finalDate) : '+ Дата'}</span>
              </button>
              <span className={styles.whenDivider} aria-hidden />
              <button
                type="button"
                className={`${styles.chip} ${finalStart !== undefined ? styles.chipFilled : styles.chipEmpty}`}
                onClick={() => setSheet('time')}
              >
                <span>{finalStart !== undefined ? fmtTime(finalStart) : '+ Время'}</span>
              </button>
            </div>

            {/* Длительность — открывает sheet */}
            <button
              type="button"
              className={`${styles.chip} ${styles.chipFilled} ${sheet === 'duration' ? styles.chipOpen : ''}`}
              onClick={() => setSheet('duration')}
            >
              <span>{fmtDuration(finalDuration)}</span>
            </button>

            {/* Категория */}
            <button
              type="button"
              className={`${styles.chip} ${styles.chipFilled}`}
              onClick={() => setSheet('cat')}
            >
              <CategoryChip cat={finalCat} size="sm" iconOnly aria-hidden />
              <span>{CATEGORIES[finalCat].label}</span>
            </button>

            {/* Нагрузка */}
            <button
              type="button"
              className={`${styles.chip} ${finalEnergy ? styles.chipFilled : styles.chipEmpty} ${sheet === 'energy' ? styles.chipOpen : ''}`}
              onClick={() => setSheet('energy')}
            >
              <span>{finalEnergy ? `Сложность: ${energyLabel(finalEnergy)}` : '+ Сложность'}</span>
            </button>
          </div>

          {notesOpen ? (
            <textarea
              className={styles.notes}
              placeholder="Заметки…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              autoFocus
            />
          ) : (
            <button
              className={styles.disclosureBtn}
              onClick={() => setNotesOpen(true)}
              type="button"
            >
              + Заметки
            </button>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelLink} onClick={onClose} type="button">
            Отмена
            <span className={styles.cancelKbd}>Esc</span>
          </button>
          <button
            className={`${styles.submit} ${goesToInbox ? styles.submitInbox : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
            type="button"
          >
            {goesToInbox ? 'Добавить в Inbox' : 'Добавить в расписание'}
            <span className={styles.submitKbd}>↵</span>
          </button>
        </div>
      </div>
    </ModalShell>

      {sheet === 'date' && (
        <DateSheet
          value={finalDate ?? TODAY_ISO()}
          onChange={iso => { setOverride('date', iso); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'time' && (
        <TimeSheet
          value={finalStart ?? Math.max(nowMin, planner.workStart)}
          onChange={v => { setOverride('start', v); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'cat' && (
        <CategorySheet
          value={finalCat}
          onChange={v => setOverride('cat', v)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'duration' && (
        <DurationSheet
          value={finalDuration}
          onChange={v => { setOverride('duration', v); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'energy' && (
        <EnergySheet
          value={finalEnergy}
          onChange={v => { setOverride('energy', v); setSheet(null); }}
          onClear={() => { clearOverride('energy'); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

function energyLabel(e: EnergyLevel): string {
  return e === 'low' ? 'лёгкая' : e === 'medium' ? 'средняя' : 'тяжёлая';
}
