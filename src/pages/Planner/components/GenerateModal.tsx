import { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/ui';
import { selectPlannerSettings, setWorkHours, mockGenerate, type GeneratedTask } from '../../../features/planner';
import { addTask } from '../../../features/tasks';
import { removeInboxItem } from '../../../features/inbox';
import { ModalShell } from '../../../shared/ui/ModalShell/ModalShell';
import { Icon, SparklesIcon, Cancel01Icon, AlertCircleIcon, CheckmarkCircle02Icon } from '../../../shared/ui';
import { TimeSheet } from '../../../shared/ui/DateTimeSheet/DateTimeSheet';
import { CATEGORIES, catStyle } from '../../../shared/utils/categories';
import { fmt, rangeFmt } from '../../../shared/utils/time';
import type { CategoryKey } from '../../../shared/types';
import styles from './GenerateModal.module.css';

type DateRange = 'today' | 'tomorrow' | 'week';
type Phase     = 'form' | 'progress' | 'preview';

const DATE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: 'today',    label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'week',     label: 'Эта неделя' },
];

const MAX_CONTEXT = 200;

const STAGES = [
  { key: 'analyze',  label: 'Анализирую Inbox' },
  { key: 'schedule', label: 'Учитываю расписание ВУЗа' },
  { key: 'energy',   label: 'Расставляю по пику энергии' },
  { key: 'breaks',   label: 'Добавляю перерывы' },
] as const;

const STAGE_DURATION = 650; // ms per stage

interface Props {
  onClose: () => void;
}

export function GenerateModal({ onClose }: Props) {
  const dispatch  = useAppDispatch();
  const planner   = useAppSelector(selectPlannerSettings);
  const inbox     = useAppSelector(s => s.inbox);
  const allTasks  = useAppSelector(s => s.tasks.items);

  const [phase,      setPhase]      = useState<Phase>('form');
  const [stageIdx,   setStageIdx]   = useState(0);
  const [dateRange,  setDateRange]  = useState<DateRange>('today');
  const [categories, setCategories] = useState<CategoryKey[]>(planner.enabledCategories);
  const [context,    setContext]    = useState('');
  const [workSheet,  setWorkSheet]  = useState<'start' | 'end' | null>(null);
  const [preview,    setPreview]    = useState<GeneratedTask[]>([]);

  const today       = new Date();
  const todayISO    = format(today, 'yyyy-MM-dd');
  const tomorrowISO = format(addDays(today, 1), 'yyyy-MM-dd');

  const targetDates: string[] = dateRange === 'today'
    ? [todayISO]
    : dateRange === 'tomorrow'
      ? [tomorrowISO]
      : Array.from({ length: 7 }, (_, i) => format(addDays(today, i), 'yyyy-MM-dd'));

  const lockedCount = allTasks.filter(t => t.locked && targetDates.includes(t.date ?? todayISO)).length;
  const inboxCount  = inbox.length;
  const canGenerate = categories.length > 0 && inboxCount > 0;

  function toggleCat(key: CategoryKey) {
    setCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  }

  // Run progress stages
  useEffect(() => {
    if (phase !== 'progress') return;
    if (stageIdx >= STAGES.length) {
      // Compute preview once all stages displayed
      const targetDate = dateRange === 'tomorrow' ? tomorrowISO : todayISO;
      const result = mockGenerate(
        inbox.filter(i => categories.includes(i.cat)),
        allTasks,
        targetDate,
        {
          workStart: planner.workStart,
          workEnd:   planner.workEnd,
          enabledCategories: categories,
        },
      );
      setPreview(result);
      setPhase('preview');
      return;
    }
    const t = setTimeout(() => setStageIdx(i => i + 1), STAGE_DURATION);
    return () => clearTimeout(t);
  }, [phase, stageIdx, dateRange, todayISO, tomorrowISO, inbox, allTasks, categories, planner]);

  function startGeneration() {
    if (!canGenerate) return;
    setStageIdx(0);
    setPhase('progress');
  }

  function applyPlan() {
    const ids = new Set<string>();
    preview.forEach(t => {
      dispatch(addTask({
        title:  t.title,
        cat:    t.cat,
        start:  t.start,
        end:    t.end,
        date:   t.date,
        source: t.source,
        ...(t.isBreak ? { isBreak: true } : {}),
        ...(t.energy ? { energy: t.energy } : {}),
        ...(t.reason ? { reason: t.reason } : {}),
      }));
      if (t.inboxId) ids.add(t.inboxId);
    });
    ids.forEach(id => dispatch(removeInboxItem(id)));

    const taskCount  = preview.filter(p => !p.isBreak).length;
    const breakCount = preview.filter(p => p.isBreak).length;
    dispatch(showToast({
      message: breakCount > 0
        ? `Расставлено ${taskCount} задач, добавлено ${breakCount} ${breakCount === 1 ? 'перерыв' : 'перерыва'}`
        : `Расставлено ${taskCount} задач`,
      variant: 'success',
    }));
    onClose();
  }

  function backToForm() {
    setPhase('form');
    setStageIdx(0);
    setPreview([]);
  }

  // ── PROGRESS phase ──────────────────────────────────────────────
  if (phase === 'progress') {
    return (
      <ModalShell
        onClose={() => {}}
        backdropClassName={styles.backdrop}
        className={styles.modal}
        ariaLabel="Генерация плана"
      >
        <div className={styles.progressBody}>
          <div className={styles.progressTitle}>
            <Icon icon={SparklesIcon} size={18} className={styles.sparkIcon} />
            Генерирую план
          </div>
          <ul className={styles.stageList}>
            {STAGES.map((s, i) => {
              const isDone   = i < stageIdx;
              const isActive = i === stageIdx;
              return (
                <li key={s.key} className={`${styles.stage} ${isActive ? styles.stageActive : ''} ${isDone ? styles.stageDone : ''}`}>
                  <span className={styles.stageIcon}>
                    {isDone ? <Icon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} /> : isActive ? <span className={styles.spinner} /> : <span className={styles.stageDot} />}
                  </span>
                  <span className={styles.stageLabel}>{s.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </ModalShell>
    );
  }

  // ── PREVIEW phase ───────────────────────────────────────────────
  if (phase === 'preview') {
    const realTasks  = preview.filter(p => !p.isBreak);
    const breakCount = preview.filter(p => p.isBreak).length;

    return (
      <ModalShell
        onClose={onClose}
        backdropClassName={styles.backdrop}
        className={styles.modal}
        ariaLabel="Результат генерации"
      >
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerText}>
              <span className={styles.title}>
                <Icon icon={SparklesIcon} size={16} className={styles.sparkIcon} />
                План готов
              </span>
              <span className={styles.subtitle}>
                {realTasks.length} {noun(realTasks.length, 'задача', 'задачи', 'задач')}
                {breakCount > 0 && <> · {breakCount} {noun(breakCount, 'перерыв', 'перерыва', 'перерывов')}</>}
                {' · '}проверь и применяй
              </span>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
              <Icon icon={Cancel01Icon} size={14} />
            </button>
          </div>
        </div>

        <div className={styles.previewBody}>
          {preview.length === 0 && (
            <div className={styles.previewEmpty}>
              День уже плотно расписан — свободных слотов под Inbox не осталось. Расширь рабочее окно или освободи часть дня.
            </div>
          )}
          {preview.map((p, i) => (
            <div
              key={i}
              className={`${styles.previewItem} ${p.isBreak ? styles.previewItemBreak : ''}`}
              style={p.isBreak ? undefined : catStyle(p.cat)}
            >
              <span className={styles.previewTime}>{rangeFmt(p.start, p.end)}</span>
              <div className={styles.previewMain}>
                <span className={styles.previewTitle}>{p.title}</span>
                {p.reason && <span className={styles.previewReason}>{p.reason}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={backToForm}>Изменить</button>
          <button className={styles.generateBtn} onClick={applyPlan} disabled={preview.length === 0}>
            Применить
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── FORM phase ──────────────────────────────────────────────────
  return (
    <>
      <ModalShell
        onClose={onClose}
        backdropClassName={styles.backdrop}
        className={styles.modal}
        ariaLabel="Сгенерировать план"
      >
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerText}>
              <span className={styles.title}>
                <Icon icon={SparklesIcon} size={16} className={styles.sparkIcon} />
                Сгенерировать план
              </span>
              <span className={styles.subtitle}>ИИ расставит задачи из Inbox с учётом твоего ритма</span>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
              <Icon icon={Cancel01Icon} size={14} />
            </button>
          </div>
          <div className={styles.dateGroup}>
            {DATE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`${styles.dateBtn} ${dateRange === opt.key ? styles.dateBtnActive : ''}`}
                onClick={() => setDateRange(opt.key)}
                aria-pressed={dateRange === opt.key}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Рабочее окно</span>
            <div className={styles.workWindowRow}>
              <button
                className={styles.workWindowTimeBtn}
                onClick={() => setWorkSheet('start')}
                aria-label="Изменить начало рабочего дня"
              >
                {fmt(planner.workStart)}
              </button>
              <span className={styles.workWindowDash}>—</span>
              <button
                className={styles.workWindowTimeBtn}
                onClick={() => setWorkSheet('end')}
                aria-label="Изменить конец рабочего дня"
              >
                {fmt(planner.workEnd)}
              </button>
              <span className={styles.workWindowSep}>задачи ставятся внутри этого окна</span>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionLabel}>Включить категории</span>
            <div className={styles.catGroup}>
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const active = categories.includes(key);
                return (
                  <button
                    key={key}
                    className={`${styles.catChip} ${active ? styles.catChipActive : ''}`}
                    style={catStyle(key)}
                    onClick={() => toggleCat(key)}
                    aria-pressed={active}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionLabel}>Контекст для ИИ <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>— необязательно</span></span>
            <div className={styles.contextWrap}>
              <textarea
                className={styles.contextTextarea}
                placeholder="Что важно учесть? Например: «с 14 до 16 встреча» или «хочу лёгкий день»"
                value={context}
                maxLength={MAX_CONTEXT}
                onChange={e => setContext(e.target.value)}
                rows={3}
              />
              <span className={`${styles.contextCounter} ${context.length > MAX_CONTEXT * 0.85 ? styles.contextCounterWarn : ''}`}>
                {context.length}/{MAX_CONTEXT}
              </span>
            </div>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>
              <Icon icon={AlertCircleIcon} size={14} />
            </span>
            <span className={styles.infoText}>
              ИИ получит{' '}
              <span className={styles.infoHighlight}>{inboxCount} {noun(inboxCount, 'задачу', 'задачи', 'задач')} из Inbox</span>
              {lockedCount > 0 && (
                <> и учтёт <span className={styles.infoHighlight}>{lockedCount} зафиксированных</span></>
              )}.{' '}
              {inboxCount === 0
                ? <span className={styles.infoWarn}>Inbox пуст — добавь задачи.</span>
                : 'Остальные данные не передаются.'
              }
            </span>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Отмена</button>
          <button
            className={styles.generateBtn}
            onClick={startGeneration}
            disabled={!canGenerate}
          >
            <Icon icon={SparklesIcon} size={14} />
            Сгенерировать план
          </button>
        </div>
      </ModalShell>

      {workSheet === 'start' && (
        <TimeSheet
          value={planner.workStart}
          onChange={v => {
            dispatch(setWorkHours({ start: v, end: planner.workEnd }));
            setWorkSheet(null);
          }}
          onClose={() => setWorkSheet(null)}
        />
      )}
      {workSheet === 'end' && (
        <TimeSheet
          value={planner.workEnd}
          onChange={v => {
            dispatch(setWorkHours({ start: planner.workStart, end: v }));
            setWorkSheet(null);
          }}
          onClose={() => setWorkSheet(null)}
        />
      )}
    </>
  );
}

function noun(n: number, one: string, few: string, many: string): string {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
