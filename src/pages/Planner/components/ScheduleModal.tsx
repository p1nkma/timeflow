import { useState, useRef, useEffect } from 'react';
import { format, addDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { addTask } from '../../../features/tasks';
import { removeInboxItem } from '../../../features/inbox';
import { showToast } from '../../../features/ui';
import { selectAllTasks, selectNowMin } from '../../../features/tasks';
import { catStyle } from '../../../shared/utils/categories';
import { findFreeSlot, fmt } from '../../../shared/utils/time';
import { Icon, SparklesIcon, Cancel01Icon, AlertCircleIcon, TimePicker, DatePicker, CategoryChip, ModalShell } from '../../../shared/ui';
import type { InboxItem } from '../../../shared/types';
import styles from './ScheduleModal.module.css';

// ── constants ─────────────────────────────────────────────────────────────────

const DURATION_PRESETS = [
  { value: 30,  label: '30 мин' },
  { value: 60,  label: '1 час' },
  { value: 120, label: '2 часа' },
] as const;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? '1 час' : `${h} ч`;
  return `${h} ч ${m} мин`;
}

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function fmtDeadline(iso: string): string {
  try { return format(parseISO(iso), 'd MMM', { locale: ru }); }
  catch { return iso; }
}

function isOverdue(deadline: string): boolean {
  try { return isBefore(startOfDay(parseISO(deadline)), startOfDay(new Date())); }
  catch { return false; }
}

function buildDateOptions(): { value: string; label: string; sub: string }[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, 'yyyy-MM-dd'),
      label: i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : format(d, 'EEEE', { locale: ru }),
      sub: format(d, 'd MMMM', { locale: ru }),
    };
  });
}

const DATE_OPTIONS = buildDateOptions();

// ── inline icons ──────────────────────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

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

// ── Sheet modal (portal) ──────────────────────────────────────────────────────

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <ModalShell
      onClose={onClose}
      backdropClassName={styles.sheetBackdrop}
      className={styles.sheet}
      ariaLabel={title}
    >
        <div className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        </div>
        <div className={styles.sheetBody}>
          {children}
        </div>
    </ModalShell>
  );
}

// ── DateSheet ─────────────────────────────────────────────────────────────────

function DateSheet({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Sheet title="Выбрать дату" onClose={onClose}>
      <DatePicker value={draft} onChange={setDraft} minDate={today} />
      <button
        className={styles.sheetConfirmBtn}
        onClick={() => { onChange(draft); onClose(); }}
      >
        Готово
      </button>
    </Sheet>
  );
}

// ── TimeSheet ─────────────────────────────────────────────────────────────────

function TimeSheet({
  value,
  onChange,
  onClose,
}: {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <Sheet title="Время начала" onClose={onClose}>
      <TimePicker value={draft} onChange={setDraft} step={5} />
      <button
        className={styles.sheetConfirmBtn}
        onClick={() => { onChange(draft); onClose(); }}
      >
        Готово
      </button>
    </Sheet>
  );
}

// ── mode type ─────────────────────────────────────────────────────────────────

type SelectedMode = 'today' | 'tomorrow' | 'custom' | null;
type SheetOpen = 'date' | 'time' | null;

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  item: InboxItem;
  onClose: () => void;
}

export function ScheduleModal({ item, onClose }: Props) {
  const dispatch  = useAppDispatch();
  const allTasks  = useAppSelector(selectAllTasks);
  const nowMin    = useAppSelector(selectNowMin);
  const planner   = useAppSelector(s => s.planner);

  const [duration, setDuration]           = useState<number>(60);
  const [showCustomDur, setShowCustomDur] = useState(false);
  const customDurInputRef                 = useRef<HTMLInputElement>(null);

  const [mode, setMode]         = useState<SelectedMode>('today');
  const [sheetOpen, setSheetOpen] = useState<SheetOpen>(null);

  const [customDate, setCustomDate] = useState(todayIso());
  const [customTime, setCustomTime] = useState<number>(nowMin);

  // ── Suggested slots ──
  const today     = todayIso();
  const todayBusy = allTasks.filter(t => !t.date || t.date === today);
  const suggested = findFreeSlot(
    todayBusy, duration,
    Math.max(nowMin, planner.workStart),
    planner.workEnd,
  );
  const dayOver = suggested >= planner.workEnd - duration;

  const tomorrowIso   = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowBusy  = allTasks.filter(t => t.date === tomorrowIso);
  const tomorrowStart = findFreeSlot(tomorrowBusy, duration, planner.workStart, planner.workEnd);

  useEffect(() => {
    if (mode !== 'custom') setCustomTime(suggested);
  }, [suggested, mode]);

  useEffect(() => {
    if (showCustomDur) customDurInputRef.current?.focus();
  }, [showCustomDur]);

  const deadlineOverdue = item.deadline ? isOverdue(item.deadline) : false;

  // ── Actions ──
  function scheduleTask(dateStr: string, startMin: number) {
    const s = Math.max(0, Math.min(startMin, 23 * 60));
    dispatch(addTask({
      title: item.title, cat: item.cat,
      date: dateStr, start: s, end: s + duration,
      source: 'user',
    }));
    dispatch(removeInboxItem(item.id));

    const label =
      dateStr === today       ? 'сегодня' :
      dateStr === tomorrowIso ? 'завтра' :
      format(parseISO(dateStr), 'd MMM', { locale: ru });

    dispatch(showToast({ message: `Добавлено ${label} в ${fmt(s)}`, variant: 'success' }));
    onClose();
  }

  function handlePickDuration(value: number) {
    setDuration(value);
    setShowCustomDur(false);
  }

  function handleCustomDurInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    if (v > 0 && v <= 720) setDuration(v);
  }

  function handleSelectMode(m: SelectedMode) {
    setMode(prev => (m === 'custom' && prev === 'custom') ? null : m);
  }

  function handleConfirm() {
    if (mode === 'today')    scheduleTask(today, suggested);
    if (mode === 'tomorrow') scheduleTask(tomorrowIso, tomorrowStart);
    if (mode === 'custom')   scheduleTask(customDate, customTime);
  }

  const isPresetActive    = (v: number) => duration === v && !showCustomDur;
  const isCustomDurActive = showCustomDur || !DURATION_PRESETS.some(p => p.value === duration);

  const dateLabel   = DATE_OPTIONS.find(o => o.value === customDate)?.label ?? customDate;

  return (
    <>
      <ModalShell
        onClose={onClose}
        backdropClassName={styles.backdrop}
        className={styles.modal}
        ariaLabel="Добавить в расписание"
      >
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.title}>В расписание</span>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
              <Icon icon={Cancel01Icon} size={14} />
            </button>
          </div>

          <div className={styles.body}>
            {/* Task card */}
            <div className={styles.taskCard} style={catStyle(item.cat)}>
              <span className={styles.taskCardTitle}>{item.title}</span>
              <div className={styles.taskCardMeta}>
                <CategoryChip cat={item.cat} size="xs" variant="pill" />
                {item.urgent && <span className={styles.urgentBadge}>Срочно</span>}
                {item.deadline && (
                  <span className={`${styles.deadlineMeta} ${deadlineOverdue ? styles.deadlineOverdue : ''}`}>
                    {deadlineOverdue && <Icon icon={AlertCircleIcon} size={12} className={styles.overdueIcon} />}
                    {deadlineOverdue ? 'Просрочено · ' : 'до '}
                    {fmtDeadline(item.deadline)}
                  </span>
                )}
              </div>
            </div>

            {/* Duration chips */}
            <div className={styles.durationRow}>
              <span className={styles.durationRowLabel}>Длительность:</span>
              <div className={styles.durationChips}>
                {DURATION_PRESETS.map(d => (
                  <button
                    key={d.value}
                    className={`${styles.durationChip} ${isPresetActive(d.value) ? styles.durationChipActive : ''}`}
                    onClick={() => handlePickDuration(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
                <span className={`${styles.durationChip} ${styles.durationChipCustom} ${isCustomDurActive ? styles.durationChipActive : ''}`}>
                  {showCustomDur ? (
                    <span className={styles.customDurInputWrap}>
                      <input
                        ref={customDurInputRef}
                        type="number"
                        className={styles.customDurInput}
                        value={duration}
                        min={5}
                        max={720}
                        onChange={handleCustomDurInput}
                        onBlur={() => setShowCustomDur(false)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setShowCustomDur(false); }}
                        aria-label="Длительность в минутах"
                      />
                      <span className={styles.customDurUnit}>мин</span>
                    </span>
                  ) : (
                    <button
                      className={styles.customDurBtn}
                      onClick={() => setShowCustomDur(true)}
                      title="Ввести свою длительность"
                    >
                      {isCustomDurActive ? fmtDuration(duration) : <PenIcon />}
                    </button>
                  )}
                </span>
              </div>
            </div>

            {/* AI hint */}
            <div className={styles.aiHint}>
              <Icon icon={dayOver ? AlertCircleIcon : SparklesIcon} size={14} className={styles.aiIcon} />
              <span className={styles.aiText}>
                {dayOver
                  ? 'Рабочий день заканчивается — слот добавится в конец дня.'
                  : <>Свободный слот сегодня — <span className={styles.aiSlot}>{fmt(suggested)}</span></>
                }
              </span>
            </div>
          </div>

          {/* Option list */}
          <div className={styles.optionList}>
            <button
              className={`${styles.optionItem} ${mode === 'today' ? styles.optionItemSelected : ''}`}
              onClick={() => handleSelectMode('today')}
            >
              <div className={styles.optionLeft}>
                <span className={`${styles.selIndicator} ${mode === 'today' ? styles.selIndicatorActive : ''}`} />
                <div className={styles.optionText}>
                  <span className={styles.optionLabel}>Сегодня</span>
                  <span className={styles.optionSub}>{format(new Date(), 'd MMMM', { locale: ru })}</span>
                </div>
              </div>
              <span className={styles.optionTime}>{fmt(suggested)}</span>
            </button>

            <button
              className={`${styles.optionItem} ${mode === 'tomorrow' ? styles.optionItemSelected : ''}`}
              onClick={() => handleSelectMode('tomorrow')}
            >
              <div className={styles.optionLeft}>
                <span className={`${styles.selIndicator} ${mode === 'tomorrow' ? styles.selIndicatorActive : ''}`} />
                <div className={styles.optionText}>
                  <span className={styles.optionLabel}>Завтра</span>
                  <span className={styles.optionSub}>{format(addDays(new Date(), 1), 'd MMMM', { locale: ru })}</span>
                </div>
              </div>
              <span className={styles.optionTime}>{fmt(tomorrowStart)}</span>
            </button>

            {/* Custom row — opens sub-rows, not inline picker */}
            <button
              className={`${styles.optionItem} ${styles.optionItemCustom} ${mode === 'custom' ? styles.optionItemCustomOpen : ''}`}
              onClick={() => handleSelectMode('custom')}
              aria-expanded={mode === 'custom'}
            >
              <div className={styles.optionLeft}>
                <span className={`${styles.selIndicator} ${mode === 'custom' ? styles.selIndicatorActive : ''}`} />
                <div className={styles.optionText}>
                  <span className={styles.optionLabel}>Выбрать дату и время</span>
                  {mode === 'custom' && (
                    <span className={styles.optionSub}>{dateLabel}, {fmt(customTime)}</span>
                  )}
                </div>
              </div>
              {mode === 'custom'
                ? <span className={styles.optionTime}>{fmt(customTime)}</span>
                : <span className={styles.chevronWrap}><ChevronRight /></span>
              }
            </button>

            {/* Sub-rows for date & time — inline, no expansion */}
            {mode === 'custom' && (
              <div className={styles.customSubRows}>
                <button className={styles.subRow} onClick={() => setSheetOpen('date')}>
                  <span className={styles.subRowLabel}>Дата</span>
                  <span className={styles.subRowValue}>
                    {dateLabel}
                    <span className={styles.subRowChevron}><ChevronRight /></span>
                  </span>
                </button>
                <button className={styles.subRow} onClick={() => setSheetOpen('time')}>
                  <span className={styles.subRowLabel}>Время</span>
                  <span className={styles.subRowValue}>
                    {fmt(customTime)}
                    <span className={styles.subRowChevron}><ChevronRight /></span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className={styles.footer}>
            <button className={styles.ctaBtn} onClick={handleConfirm}>
              Поставить в расписание
            </button>
          </div>
      </ModalShell>

      {/* Sheets — rendered via portal above everything */}
      {sheetOpen === 'date' && (
        <DateSheet
          value={customDate}
          onChange={setCustomDate}
          onClose={() => setSheetOpen(null)}
        />
      )}
      {sheetOpen === 'time' && (
        <TimeSheet
          value={customTime}
          onChange={setCustomTime}
          onClose={() => setSheetOpen(null)}
        />
      )}
    </>
  );
}
