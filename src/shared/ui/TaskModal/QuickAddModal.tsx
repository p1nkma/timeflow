import { useEffect, useMemo, useRef, useState } from 'react';
import { format, addDays, parseISO, isToday, isTomorrow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { addTask, selectAllTasks, selectNowMin } from '../../../features/tasks';
import { addInboxItem } from '../../../features/inbox';
import { showToast } from '../../../features/ui';
import { findFreeSlot } from '../../utils/time';
import { CATEGORIES, catStyle } from '../../utils/categories';
import { parseQuickAdd } from '../../utils/parseQuickAdd';
import type { CategoryKey, EnergyLevel } from '../../types';
import { Icon, Cancel01Icon } from '../Icon/Icon';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { ModalShell } from '../ModalShell/ModalShell';
import { DateSheet, TimeSheet, CategorySheet, DurationSheet, EnergySheet } from '../DateTimeSheet/DateTimeSheet';
import { TODAY_ISO } from './constants';
import styles from './QuickAddModal.module.css';

function PenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

interface Props {
  onClose: () => void;
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

const DURATION_PRESETS = [30, 60, 120];

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

export function QuickAddModal({ onClose }: Props) {
  const dispatch = useAppDispatch();
  const allTasks = useAppSelector(selectAllTasks);
  const nowMin   = useAppSelector(selectNowMin);
  const planner  = useAppSelector(s => s.planner);

  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [sheet, setSheet] = useState<null | 'date' | 'time' | 'cat' | 'duration' | 'energy'>(null);

  const tomorrowISO = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [overrides, setOverrides] = useState<Overrides>({
    date:     initOverride(),
    start:    initOverride(),
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

  const finalStart: number = (() => {
    if (overrides.start.value !== undefined) return overrides.start.value;
    if (parsed.start !== undefined) return parsed.start;
    const dateISO = finalDate ?? TODAY_ISO();
    const busy = allTasks.filter(t => (t.date ?? TODAY_ISO()) === dateISO);
    const minStart = dateISO === TODAY_ISO() ? Math.max(nowMin, planner.workStart) : planner.workStart;
    return findFreeSlot(busy, finalDuration, minStart, planner.workEnd);
  })();

  const goesToInbox = !finalDate && !overrides.start.value && parsed.start === undefined;

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
      dispatch(addInboxItem({ title: titleSource, cat: finalCat }));
      dispatch(showToast({ message: 'Добавлено в Inbox', variant: 'default' }));
    } else {
      const id = `t${Date.now()}`;
      dispatch(addTask({
        title:  titleSource,
        date:   finalDate ?? TODAY_ISO(),
        start:  finalStart,
        end:    finalStart + finalDuration,
        cat:    finalCat,
        source: 'user',
        energy: finalEnergy,
        notes:  notes.trim() || undefined,
        id,
      }));
      dispatch(showToast({ message: 'Задача создана', variant: 'success' }));
    }
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  function setOverride<K extends keyof Overrides>(key: K, value: Overrides[K]['value']) {
    setOverrides(p => ({ ...p, [key]: { value, explicit: true } }));
    setPopover(null);
  }

  function clearOverride<K extends keyof Overrides>(key: K) {
    setOverrides(p => ({ ...p, [key]: { value: undefined, explicit: true } }));
    setPopover(null);
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
                className={`${styles.chip} ${!goesToInbox ? styles.chipFilled : styles.chipEmpty}`}
                onClick={() => setSheet('time')}
              >
                <span>{goesToInbox ? '+ Время' : fmtTime(finalStart)}</span>
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
              <span>{finalEnergy ? `Нагрузка: ${energyLabel(finalEnergy)}` : '+ Нагрузка'}</span>
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
            <span className={styles.submitKbd}>⌘↵</span>
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
          value={finalStart}
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

/* ── Chip с поповером ── */
type ChipState = 'empty' | 'filled';

function ChipWithPopover({
  label, state, open, prefix, onToggle, children,
}: {
  label: string;
  state: ChipState;
  open: boolean;
  prefix?: React.ReactNode;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const stateClass = state === 'filled' ? styles.chipFilled : styles.chipEmpty;
  return (
    <div className={styles.chipWrap}>
      <button
        type="button"
        className={`${styles.chip} ${stateClass} ${open ? styles.chipOpen : ''}`}
        onClick={onToggle}
      >
        {prefix}
        <span>{label}</span>
      </button>
      {children}
    </div>
  );
}

/* ── When Popover ── */
function WhenPopover({
  finalDate, finalStart, tomorrowISO,
  onToday, onTomorrow, onPickDate, onPickTime, onClear,
}: {
  finalDate?: string;
  finalStart: number;
  tomorrowISO: string;
  onToday: () => void;
  onTomorrow: () => void;
  onPickDate: () => void;
  onPickTime: () => void;
  onClear: () => void;
}) {
  const todayISO = TODAY_ISO();
  const isToday_ = finalDate === todayISO;
  const isTomorrow_ = finalDate === tomorrowISO;

  return (
    <div className={styles.popover}>
      <button
        className={`${styles.popoverItem} ${isToday_ ? styles.popoverItemActive : ''}`}
        onClick={onToday}
      >
        Сегодня
        <span className={styles.whenOptTime}>{fmtTime(finalStart)}</span>
      </button>
      <button
        className={`${styles.popoverItem} ${isTomorrow_ ? styles.popoverItemActive : ''}`}
        onClick={onTomorrow}
      >
        Завтра
      </button>
      <div className={styles.popoverDivider} />
      <button className={styles.popoverItem} onClick={onPickDate}>
        Выбрать дату…
      </button>
      <button className={styles.popoverItem} onClick={onPickTime}>
        Выбрать время…
      </button>
      {finalDate && (
        <>
          <div className={styles.popoverDivider} />
          <button className={`${styles.popoverItem} ${styles.popoverItemClear}`} onClick={onClear}>
            Убрать дату
          </button>
        </>
      )}
    </div>
  );
}

/* ── Popovers ── */
function DurationPopover({ value, onPick }: { value: number; onPick: (m: number) => void }) {
  return (
    <div className={styles.popover}>
      {DURATION_PRESETS.map(d => (
        <button
          key={d}
          className={`${styles.popoverItem} ${d === value ? styles.popoverItemActive : ''}`}
          onClick={() => onPick(d)}
        >
          {fmtDuration(d)}
        </button>
      ))}
    </div>
  );
}

function CatPopover({ value, onPick }: { value: CategoryKey; onPick: (c: CategoryKey) => void }) {
  return (
    <div className={styles.catPopover}>
      {(Object.keys(CATEGORIES) as CategoryKey[]).map(key => {
        const active = key === value;
        return (
          <button
            key={key}
            className={`${styles.catItem} ${active ? styles.catItemActive : ''}`}
            style={catStyle(key)}
            onClick={() => onPick(key)}
          >
            <CategoryChip cat={key} size="md" iconOnly aria-hidden />
            {CATEGORIES[key].label}
          </button>
        );
      })}
    </div>
  );
}

function EnergyPopover({
  value, onPick, onClear,
}: { value?: EnergyLevel; onPick: (e: EnergyLevel) => void; onClear: () => void }) {
  const items: { v: EnergyLevel; label: string; dots: string }[] = [
    { v: 'low',    label: 'Лёгкая',  dots: '●○○' },
    { v: 'medium', label: 'Средняя', dots: '●●○' },
    { v: 'high',   label: 'Тяжёлая', dots: '●●●' },
  ];
  return (
    <div className={styles.popover}>
      {items.map(it => (
        <button
          key={it.v}
          className={`${styles.popoverItem} ${it.v === value ? styles.popoverItemActive : ''}`}
          onClick={() => onPick(it.v)}
        >
          <span className={styles.energyDots}>{it.dots}</span>
          {it.label}
        </button>
      ))}
      {value && (
        <>
          <div className={styles.popoverDivider} />
          <button className={styles.popoverItem} onClick={onClear}>Не задано</button>
        </>
      )}
    </div>
  );
}

function energyLabel(e: EnergyLevel): string {
  return e === 'low' ? 'лёгкая' : e === 'medium' ? 'средняя' : 'тяжёлая';
}
