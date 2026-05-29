import { useEffect, useRef, useState } from 'react';
import { Icon, Cancel01Icon, PlusSignIcon } from '../Icon/Icon';
import { TimePicker } from '../TimePicker/TimePicker';
import { DatePicker } from '../TimePicker/DatePicker';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { ModalShell } from '../ModalShell/ModalShell';
import { HugeiconsIcon } from '@hugeicons/react';
import { useGetCategoriesQuery, useCreateCategoryMutation } from '../../../features/categories/categoriesApi';
import { CATEGORIES, catStyle, ICON_OPTIONS, COLOR_OPTIONS, ICON_MAP } from '../../utils/categories';
import type { CategoryKey } from '../../types';
import styles from './DateTimeSheet.module.css';

export function Sheet({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <ModalShell
      onClose={onClose}
      backdropClassName={styles.backdrop}
      className={styles.sheet}
      ariaLabel={title}
    >
      <div className={styles.handle} />
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
          <Icon icon={Cancel01Icon} size={14} />
        </button>
      </div>
      <div className={styles.body}>
        {children}
      </div>
    </ModalShell>
  );
}

export function DateSheet({ value, onChange, onClose }: {
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
      <button className={styles.confirmBtn} onClick={() => { onChange(draft); onClose(); }}>
        Готово
      </button>
    </Sheet>
  );
}

export function TimeSheet({ value, onChange, onClose }: {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <Sheet title="Время начала" onClose={onClose}>
      <TimePicker value={draft} onChange={setDraft} step={5} />
      <button className={styles.confirmBtn} onClick={() => { onChange(draft); onClose(); }}>
        Готово
      </button>
    </Sheet>
  );
}

const DUR_PRESETS = [
  { value: 15,  label: '15 мин' },
  { value: 30,  label: '30 мин' },
  { value: 60,  label: '1 час' },
  { value: 120, label: '2 часа' },
] as const;

export function DurationSheet({ value, onChange, onClose }: {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (custom) inputRef.current?.focus(); }, [custom]);

  const isPreset = DUR_PRESETS.some(p => p.value === value);
  const draftNum = parseInt(draft, 10);
  const draftValid = !isNaN(draftNum) && draftNum >= 1 && draftNum <= 720;

  function confirmCustom() {
    if (draftValid) { onChange(draftNum); onClose(); }
  }

  return (
    <Sheet title="Длительность" onClose={onClose}>
      <div className={styles.durPresets}>
        {DUR_PRESETS.map(p => (
          <button
            key={p.value}
            className={`${styles.durPresetBtn} ${p.value === value && !custom ? styles.durPresetActive : ''}`}
            onClick={() => { onChange(p.value); onClose(); }}
          >
            {p.label}
          </button>
        ))}
        <span className={`${styles.durPresetBtn} ${styles.durPresetCustom} ${custom || !isPreset ? styles.durPresetActive : ''}`}>
          {custom ? (
            <span className={styles.durCustomWrap}>
              <input
                ref={inputRef}
                type="number"
                className={styles.durCustomInput}
                value={draft}
                min={1}
                max={720}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmCustom();
                  if (e.key === 'Escape') setCustom(false);
                }}
                aria-label="Длительность в минутах"
              />
              <span className={styles.durCustomUnit}>мин</span>
            </span>
          ) : (
            <button className={styles.durCustomBtn} onClick={() => { setDraft(String(value)); setCustom(true); }}>
              {isPreset ? <PenIconSmall /> : `${value} мин`}
            </button>
          )}
        </span>
      </div>
      {custom && (
        <button className={styles.confirmBtn} onClick={confirmCustom} disabled={!draftValid}>
          Готово
        </button>
      )}
    </Sheet>
  );
}

function PenIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

const ENERGY_ITEMS = [
  { v: 'low',    label: 'Лёгкая',  dots: '●○○' },
  { v: 'medium', label: 'Средняя', dots: '●●○' },
  { v: 'high',   label: 'Тяжёлая', dots: '●●●' },
] as const;

export function EnergySheet({ value, onChange, onClear, onClose }: {
  value?: 'low' | 'medium' | 'high';
  onChange: (v: 'low' | 'medium' | 'high') => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Сложность" onClose={onClose}>
      <div className={styles.energyList}>
        {ENERGY_ITEMS.map(it => (
          <button
            key={it.v}
            className={`${styles.energyItem} ${it.v === value ? styles.energyItemActive : ''}`}
            onClick={() => { onChange(it.v); onClose(); }}
          >
            <span className={styles.energyDots}>{it.dots}</span>
            <span>{it.label}</span>
          </button>
        ))}
        {value && (
          <>
            <div className={styles.whenDivider} />
            <button
              className={`${styles.energyItem} ${styles.energyItemClear}`}
              onClick={() => { onClear(); onClose(); }}
            >
              Не задано
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

export function WhenSheet({
  finalDate, finalStart, tomorrowISO, todayISO,
  onToday, onTomorrow, onPickDate, onPickTime, onClear, onClose,
}: {
  finalDate?: string;
  finalStart: number;
  tomorrowISO: string;
  todayISO: string;
  onToday: () => void;
  onTomorrow: () => void;
  onPickDate: () => void;
  onPickTime: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  function fmt(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  const isToday_ = finalDate === todayISO;
  const isTomorrow_ = finalDate === tomorrowISO;

  return (
    <Sheet title="Когда" onClose={onClose}>
      <div className={styles.whenList}>
        <button
          className={`${styles.whenItem} ${isToday_ ? styles.whenItemActive : ''}`}
          onClick={onToday}
        >
          <span className={styles.whenItemLabel}>Сегодня</span>
          <span className={styles.whenItemTime}>{fmt(finalStart)}</span>
        </button>
        <button
          className={`${styles.whenItem} ${isTomorrow_ ? styles.whenItemActive : ''}`}
          onClick={onTomorrow}
        >
          <span className={styles.whenItemLabel}>Завтра</span>
        </button>
        <div className={styles.whenDivider} />
        <button className={styles.whenItem} onClick={onPickDate}>
          Выбрать дату…
        </button>
        <button className={styles.whenItem} onClick={onPickTime}>
          Выбрать время…
        </button>
        {finalDate && (
          <>
            <div className={styles.whenDivider} />
            <button className={`${styles.whenItem} ${styles.whenItemClear}`} onClick={onClear}>
              Убрать дату
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

export function CategorySheet({ value, onChange, onClose }: {
  value: CategoryKey;
  onChange: (v: CategoryKey) => void;
  onClose: () => void;
}) {
  const { data: apiCats = [] } = useGetCategoriesQuery();
  const [createCategoryMutation] = useCreateCategoryMutation();
  const customCats = apiCats.filter(c => !c.is_system);
  const [creating, setCreating] = useState(false);

  // form state
  const [newLabel, setNewLabel]   = useState('');
  const [newIcon,  setNewIcon]    = useState(ICON_OPTIONS[0].name);
  const [newColor, setNewColor]   = useState(COLOR_OPTIONS[0]);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (creating) labelRef.current?.focus(); }, [creating]);

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label) return;
    const key = `custom_${Date.now()}`;
    try {
      await createCategoryMutation({ key, name: label, color: newColor }).unwrap();
      onChange(key);
      onClose();
    } catch {
      // ignore — user stays on form
    }
  }

  if (creating) {
    return (
      <Sheet title="Новая категория" onClose={() => setCreating(false)}>
        <div className={styles.newCatForm}>
          {/* Preview */}
          <div className={styles.newCatPreview} style={catStyle('__preview', { key: '__preview', label: newLabel || 'Название', iconName: newIcon, color: newColor })}>
            <HugeiconsIcon icon={ICON_MAP[newIcon] as never} size={28} strokeWidth={1.5} color="currentColor" />
            <span className={styles.newCatPreviewLabel}>{newLabel || 'Название'}</span>
          </div>

          {/* Name */}
          <input
            ref={labelRef}
            className={styles.newCatInput}
            placeholder="Название категории"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            maxLength={24}
          />

          {/* Icon picker */}
          <p className={styles.newCatSectionLabel}>Иконка</p>
          <div className={styles.iconGrid}>
            {ICON_OPTIONS.map(opt => (
              <button
                key={opt.name}
                type="button"
                className={`${styles.iconBtn} ${newIcon === opt.name ? styles.iconBtnActive : ''}`}
                onClick={() => setNewIcon(opt.name)}
                title={opt.label}
                style={newIcon === opt.name ? { borderColor: newColor, background: `color-mix(in oklch, ${newColor} 15%, transparent)` } : undefined}
              >
                <HugeiconsIcon icon={opt.icon as never} size={20} strokeWidth={1.5} color={newIcon === opt.name ? newColor : 'currentColor'} />
              </button>
            ))}
          </div>

          {/* Color picker */}
          <p className={styles.newCatSectionLabel}>Цвет</p>
          <div className={styles.colorGrid}>
            {COLOR_OPTIONS.map(hex => (
              <button
                key={hex}
                type="button"
                className={`${styles.colorBtn} ${newColor === hex ? styles.colorBtnActive : ''}`}
                style={{ background: hex }}
                onClick={() => setNewColor(hex)}
                aria-label={hex}
              />
            ))}
          </div>

          <button
            className={styles.confirmBtn}
            onClick={handleCreate}
            disabled={!newLabel.trim()}
          >
            Создать категорию
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Категория" onClose={onClose}>
      <div className={styles.catGrid}>
        {Object.keys(CATEGORIES).map(key => {
          const active = key === value;
          return (
            <button
              key={key}
              className={`${styles.catGridItem} ${active ? styles.catGridItemActive : ''}`}
              style={catStyle(key)}
              onClick={() => { onChange(key); onClose(); }}
            >
              <CategoryChip cat={key} size="md" iconOnly aria-hidden />
              <span className={styles.catGridLabel}>{CATEGORIES[key].label}</span>
            </button>
          );
        })}
        {customCats.map(c => {
          const active = c.key === value;
          const customShape = { key: c.key, label: c.name, iconName: '', color: c.color };
          return (
            <button
              key={c.key}
              className={`${styles.catGridItem} ${active ? styles.catGridItemActive : ''}`}
              style={catStyle(c.key, customShape)}
              onClick={() => { onChange(c.key); onClose(); }}
            >
              <CategoryChip cat={c.key} size="md" iconOnly aria-hidden />
              <span className={styles.catGridLabel}>{c.name}</span>
            </button>
          );
        })}
        {/* Кнопка создания */}
        <button
          className={`${styles.catGridItem} ${styles.catGridItemNew}`}
          onClick={() => setCreating(true)}
        >
          <span className={styles.catGridNewIcon}><Icon icon={PlusSignIcon} size={18} /></span>
          <span className={styles.catGridLabel}>Новая</span>
        </button>
      </div>
    </Sheet>
  );
}
