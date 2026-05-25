import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO, addDays, isToday, isTomorrow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { addTask, selectAllTasks, selectNowMin } from '../../../features/tasks';
import { addInboxItem } from '../../../features/inbox';
import { showToast } from '../../../features/ui';
import { findFreeSlot } from '../../utils/time';
import { CATEGORIES } from '../../utils/categories';
import { parseQuickAdd } from '../../utils/parseQuickAdd';
import type { CategoryKey, EnergyLevel } from '../../types';
import { Icon, Cancel01Icon } from '../Icon/Icon';
import { DatePicker } from '../TimePicker/DatePicker';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { ModalShell } from '../ModalShell/ModalShell';
import { TODAY_ISO } from './constants';
import styles from './QuickAddModal.module.css';

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

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180];

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
  const [popover, setPopover] = useState<null | 'date' | 'time' | 'duration' | 'cat' | 'energy'>(null);

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

  // Авто-рост textarea
  function autoresize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }
  useEffect(autoresize, [text]);

  // Синхронизация скролла оверлея с textarea
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
      dispatch(showToast({ message: 'Задача создана', variant: 'success', undoId: id }));
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
            <div
              ref={highlightRef}
              className={styles.highlight}
              aria-hidden
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
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
            {/* Группа «когда»: дата + время */}
            <div className={`${styles.whenGroup} ${(popover === 'date' || popover === 'time') ? styles.whenGroupActive : ''}`}>
              <ChipWithPopover
                state={finalDate ? 'filled' : 'empty'}
                open={popover === 'date'}
                label={finalDate ? fmtDate(finalDate) : '+ Дата'}
                onToggle={() => setPopover(p => p === 'date' ? null : 'date')}
              >
                {popover === 'date' && (
                  <DatePopover
                    value={finalDate ?? TODAY_ISO()}
                    hasDate={Boolean(finalDate)}
                    onPick={iso => setOverride('date', iso)}
                    onClear={() => clearOverride('date')}
                  />
                )}
              </ChipWithPopover>
              <span className={styles.whenDivider} aria-hidden />
              <ChipWithPopover
                state={goesToInbox ? 'empty' : 'filled'}
                open={popover === 'time'}
                label={goesToInbox ? '+ Время' : fmtTime(finalStart)}
                onToggle={() => setPopover(p => p === 'time' ? null : 'time')}
              >
                {popover === 'time' && (
                  <TimePopover value={finalStart} onPick={v => setOverride('start', v)} />
                )}
              </ChipWithPopover>
            </div>

            {/* Длительность */}
            <ChipWithPopover
              state="filled"
              open={popover === 'duration'}
              label={fmtDuration(finalDuration)}
              onToggle={() => setPopover(p => p === 'duration' ? null : 'duration')}
            >
              {popover === 'duration' && (
                <DurationPopover value={finalDuration} onPick={v => setOverride('duration', v)} />
              )}
            </ChipWithPopover>

            {/* Категория */}
            <ChipWithPopover
              state="filled"
              open={popover === 'cat'}
              label={CATEGORIES[finalCat].label}
              onToggle={() => setPopover(p => p === 'cat' ? null : 'cat')}
              prefix={<CategoryChip cat={finalCat} size="sm" iconOnly aria-hidden />}
            >
              {popover === 'cat' && (
                <CatPopover value={finalCat} onPick={v => setOverride('cat', v)} />
              )}
            </ChipWithPopover>

            {/* Нагрузка */}
            <ChipWithPopover
              state={finalEnergy ? 'filled' : 'empty'}
              open={popover === 'energy'}
              label={finalEnergy ? `Нагрузка: ${energyLabel(finalEnergy)}` : '+ Нагрузка'}
              onToggle={() => setPopover(p => p === 'energy' ? null : 'energy')}
            >
              {popover === 'energy' && (
                <EnergyPopover
                  value={finalEnergy}
                  onPick={v => setOverride('energy', v)}
                  onClear={() => clearOverride('energy')}
                />
              )}
            </ChipWithPopover>
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

/* ── Popovers ── */
function DatePopover({
  value, hasDate, onPick, onClear,
}: { value: string; hasDate: boolean; onPick: (iso: string) => void; onClear: () => void }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmtIso = (d: Date) => format(d, 'yyyy-MM-dd');
  return (
    <div className={styles.popover}>
      <button className={styles.popoverItem} onClick={() => onPick(fmtIso(today))}>Сегодня</button>
      <button className={styles.popoverItem} onClick={() => onPick(fmtIso(addDays(today, 1)))}>Завтра</button>
      <button className={styles.popoverItem} onClick={() => onPick(fmtIso(addDays(today, 2)))}>Послезавтра</button>
      {hasDate && (
        <>
          <div className={styles.popoverDivider} />
          <button className={styles.popoverItem} onClick={onClear}>Без даты → Inbox</button>
        </>
      )}
      <div className={styles.popoverDivider} />
      <div className={styles.popoverDateInner}>
        <DatePicker value={value} onChange={onPick} minDate={today} />
      </div>
    </div>
  );
}

function TimePopover({ value, onPick }: { value: number; onPick: (m: number) => void }) {
  const slots: number[] = [];
  for (let h = 6; h < 24; h++) for (const m of [0, 30]) slots.push(h * 60 + m);
  return (
    <div className={styles.popover}>
      {slots.map(s => (
        <button
          key={s}
          className={`${styles.popoverItem} ${s === value ? styles.popoverItemActive : ''}`}
          onClick={() => onPick(s)}
        >
          {fmtTime(s)}
        </button>
      ))}
    </div>
  );
}

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
    <div className={styles.popover}>
      {(Object.keys(CATEGORIES) as CategoryKey[]).map(key => (
        <button
          key={key}
          className={`${styles.popoverItem} ${key === value ? styles.popoverItemActive : ''}`}
          onClick={() => onPick(key)}
        >
          <CategoryChip cat={key} size="sm" iconOnly aria-hidden />
          {CATEGORIES[key].label}
        </button>
      ))}
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
