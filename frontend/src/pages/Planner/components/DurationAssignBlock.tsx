import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, SparklesIcon, AlertCircleIcon, ArrowRight01Icon } from '../../../shared/ui';
import { Sheet } from '../../../shared/ui/DateTimeSheet/DateTimeSheet';
import { useEstimateDurationsMutation, type DurationEstimate } from '../../../features/ai/aiApi';
import type { InboxItem } from '../../../shared/types';
import { catStyle } from '../../../shared/utils/categories';
import styles from './GenerateModal.module.css';

const PRESETS = [
  { value: 15,  label: '15 мин' },
  { value: 30,  label: '30 мин' },
  { value: 60,  label: '1 час'  },
  { value: 120, label: '2 часа' },
] as const;

interface Props {
  items: InboxItem[];
  picked: Map<string, number>;
  onPick: (taskId: string, minutes: number | null) => void;
}

export function DurationAssignBlock({ items, picked, onPick }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (items.length === 0) return null;

  const remaining = items.filter(i => !picked.has(i.id)).length;
  const allDone = remaining === 0;

  return (
    <>
      <button
        type="button"
        className={`${styles.durTrigger} ${allDone ? styles.durTriggerDone : ''}`}
        onClick={() => setSheetOpen(true)}
      >
        <span className={styles.durTriggerLeft}>
          <Icon icon={allDone ? SparklesIcon : AlertCircleIcon} size={14} />
          <span>
            {allDone
              ? `Длительности заданы для ${items.length} ${noun(items.length, 'задачи', 'задач', 'задач')}`
              : `${remaining} ${noun(remaining, 'задача', 'задачи', 'задач')} без длительности`}
          </span>
        </span>
        <span className={styles.durTriggerAction}>
          {allDone ? 'Изменить' : 'Указать'}
          <Icon icon={ArrowRight01Icon} size={12} />
        </span>
      </button>

      {sheetOpen && (
        <BulkDurationSheet
          items={items}
          picked={picked}
          onPick={onPick}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

interface SheetProps {
  items: InboxItem[];
  picked: Map<string, number>;
  onPick: (taskId: string, minutes: number | null) => void;
  onClose: () => void;
}

function BulkDurationSheet({ items, picked, onPick, onClose }: SheetProps) {
  // Selected for batch-assign — по умолчанию все БЕЗ длительности
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.filter(i => !picked.has(i.id)).map(i => i.id)),
  );

  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const customInputRef = useRef<HTMLInputElement | null>(null);

  // AI estimates
  const [estimates, setEstimates] = useState<Map<string, DurationEstimate>>(new Map());
  const [estimateApi, { isLoading: aiLoading }] = useEstimateDurationsMutation();

  useEffect(() => {
    if (items.length === 0) return;
    estimateApi({ task_ids: items.map(i => i.id) })
      .unwrap()
      .then(res => {
        const next = new Map<string, DurationEstimate>();
        res.estimates.forEach(e => next.set(e.task_id, e));
        setEstimates(next);
      })
      .catch(() => { /* silent */ });
  }, [items, estimateApi]);

  useEffect(() => {
    if (customMode) customInputRef.current?.focus();
  }, [customMode]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(items.map(i => i.id)));
  }
  function clearAll() {
    setSelected(new Set());
  }

  function applyToSelected(mins: number) {
    selected.forEach(id => onPick(id, mins));
    // После применения переключаемся на оставшиеся
    setSelected(prev => {
      const remaining = items.filter(i => !prev.has(i.id) && !picked.has(i.id)).map(i => i.id);
      return new Set(remaining);
    });
  }

  function applyAiToSelected() {
    selected.forEach(id => {
      const ai = estimates.get(id);
      if (ai) onPick(id, ai.minutes);
    });
    setSelected(prev => {
      const remaining = items.filter(i => !prev.has(i.id) && !picked.has(i.id)).map(i => i.id);
      return new Set(remaining);
    });
  }

  function applyCustom() {
    const n = parseInt(customDraft, 10);
    if (!isNaN(n) && n >= 1 && n <= 720) {
      applyToSelected(n);
    }
    setCustomMode(false);
    setCustomDraft('');
  }

  const noneSelected = selected.size === 0;
  const allSelected = selected.size === items.length;

  // Какой пресет считается "активным" (если все выделенные задачи имеют одно и то же значение)
  const activePreset = useMemo(() => {
    if (selected.size === 0) return null;
    const vals = Array.from(selected).map(id => picked.get(id));
    const first = vals[0];
    if (first === undefined) return null;
    return vals.every(v => v === first) ? first : null;
  }, [selected, picked]);

  // AI-предложение для bulk: если все выделенные имеют одинаковое предложение AI
  const bulkAi = useMemo(() => {
    if (selected.size === 0 || aiLoading) return null;
    const sels = Array.from(selected);
    const aiMins = sels.map(id => estimates.get(id)?.minutes);
    if (aiMins.some(v => v === undefined)) return null;
    const first = aiMins[0];
    if (aiMins.every(v => v === first)) return first ?? null;
    return null;
  }, [selected, estimates, aiLoading]);

  return (
    <Sheet title="Длительности задач" onClose={onClose}>
      {/* Toolbar: select all / clear */}
      <div className={styles.bulkToolbar}>
        <span className={styles.bulkCount}>
          {selected.size}/{items.length} выбрано
        </span>
        <div className={styles.bulkToolbarActions}>
          {!allSelected && (
            <button type="button" className={styles.bulkLink} onClick={selectAll}>
              Все
            </button>
          )}
          {!allSelected && !noneSelected && <span className={styles.bulkLinkSep} aria-hidden />}
          {!noneSelected && (
            <button type="button" className={styles.bulkLink} onClick={clearAll}>
              Снять
            </button>
          )}
        </div>
      </div>

      {/* Tasks list */}
      <div className={styles.bulkList}>
        {items.map(item => {
          const isSelected = selected.has(item.id);
          const pickedMins = picked.get(item.id);
          const aiMins = estimates.get(item.id)?.minutes;
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.bulkRow} ${isSelected ? styles.bulkRowSelected : ''}`}
              onClick={() => toggle(item.id)}
            >
              <span className={`${styles.bulkCheck} ${isSelected ? styles.bulkCheckOn : ''}`} aria-hidden>
                {isSelected && <CheckSvg />}
              </span>
              <span className={styles.bulkRowMain}>
                <span className={styles.bulkRowTitle}>{item.title}</span>
                {(item.deadline || item.urgent) && (
                  <span className={styles.bulkRowMeta}>
                    <span
                      className={styles.bulkRowCatDot}
                      style={{ ...catStyle(item.cat) }}
                      aria-hidden
                    />
                    {item.urgent && <span className={styles.bulkRowUrgent}>срочно</span>}
                    {item.deadline && (
                      <span className={styles.bulkRowDeadline}>до {fmtDeadline(item.deadline)}</span>
                    )}
                  </span>
                )}
              </span>
              {pickedMins !== undefined ? (
                <span className={styles.bulkRowMins}>{fmtMins(pickedMins)}</span>
              ) : aiMins !== undefined ? (
                <span className={styles.bulkRowAi} title="Предложение ИИ">
                  <Icon icon={SparklesIcon} size={10} />
                  {fmtMins(aiMins)}
                </span>
              ) : aiLoading ? (
                <span className={styles.bulkRowAi} style={{ opacity: 0.4 }}>
                  <Icon icon={SparklesIcon} size={10} />…
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Presets row */}
      <div className={styles.bulkPresets}>
        {PRESETS.map(p => {
          const active = activePreset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              className={`${styles.durPresetBtn} ${active ? styles.durPresetActive : ''}`}
              onClick={() => applyToSelected(p.value)}
              disabled={noneSelected}
            >
              {p.label}
            </button>
          );
        })}

        {customMode ? (
          <span className={`${styles.durPresetBtn} ${styles.durPresetCustom} ${styles.durPresetActive}`}>
            <span className={styles.durCustomWrap}>
              <input
                ref={customInputRef}
                type="number"
                className={styles.durCustomInput}
                value={customDraft}
                min={1}
                max={720}
                onChange={e => setCustomDraft(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => {
                  if (e.key === 'Enter') applyCustom();
                  if (e.key === 'Escape') { setCustomMode(false); setCustomDraft(''); }
                }}
                onBlur={() => { if (customDraft) applyCustom(); else setCustomMode(false); }}
                aria-label="Своя длительность в минутах"
              />
              <span className={styles.durCustomUnit}>мин</span>
            </span>
          </span>
        ) : (
          <button
            type="button"
            className={`${styles.durPresetBtn} ${styles.durPresetCustom}`}
            onClick={() => { setCustomMode(true); setCustomDraft(''); }}
            disabled={noneSelected}
            aria-label="Своя длительность"
            title="Указать своё число минут"
          >
            <PenIcon />
            <span className={styles.durPresetCustomLabel}>своё</span>
          </button>
        )}
      </div>

      {/* Hint строчкой: если у выделенных разные значения — намекнуть */}
      {!noneSelected && activePreset === null && selected.size > 1 && (
        <p className={styles.bulkHint}>
          У выделенных задач разные длительности — выбери пресет, чтобы применить ко всем
        </p>
      )}

      {/* AI bulk action */}
      {bulkAi !== null && (
        <button
          type="button"
          className={styles.bulkAiAction}
          onClick={applyAiToSelected}
          disabled={noneSelected}
        >
          <Icon icon={SparklesIcon} size={12} />
          Применить ИИ: {fmtMins(bulkAi)}
        </button>
      )}
    </Sheet>
  );
}

function CheckSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function fmtMins(n: number): string {
  if (n >= 60 && n % 60 === 0) return `${n / 60}ч`;
  if (n > 60) return `${Math.floor(n / 60)}ч ${n % 60}м`;
  return `${n}м`;
}

function fmtDeadline(iso: string): string {
  // iso = "YYYY-MM-DD"
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  if (diff === -1) return 'вчера';
  if (diff > 0 && diff < 7) return `через ${diff} ${noun(diff, 'день', 'дня', 'дней')}`;
  // fallback: DD.MM
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

function noun(n: number, one: string, few: string, many: string): string {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
