import {
  GraduationScrollIcon,
  CodeIcon,
  Briefcase01Icon,
  Dumbbell01Icon,
  Book01Icon,
  Building03Icon,
  Coffee01Icon,
  Fire02Icon,
  Timer01Icon,
  Moon01Icon,
  Calendar03Icon,
  Clock01Icon,
  Notification01Icon,
  Search01Icon,
  FireIcon,
} from '@hugeicons/core-free-icons';
import type { Category, CategoryKey, CustomCategory } from '../types';

export const CATEGORIES: Record<string, Category> = {
  study:     { key: 'study',     label: 'Учёба',    varPrefix: 'cat-study',     cls: 'cat-study',     icon: GraduationScrollIcon },
  code:      { key: 'code',      label: 'Кодинг',   varPrefix: 'cat-code',      cls: 'cat-code',      icon: CodeIcon },
  freelance: { key: 'freelance', label: 'Фриланс',  varPrefix: 'cat-freelance', cls: 'cat-freelance', icon: Briefcase01Icon },
  sport:     { key: 'sport',     label: 'Спорт',    varPrefix: 'cat-sport',     cls: 'cat-sport',     icon: Dumbbell01Icon },
  reading:   { key: 'reading',   label: 'Чтение',   varPrefix: 'cat-reading',   cls: 'cat-reading',   icon: Book01Icon },
  fixed:     { key: 'fixed',     label: 'Вуз',      varPrefix: 'cat-fixed',     cls: 'cat-fixed',     icon: Building03Icon },
};

// Иконки доступные для пользовательских категорий
export const ICON_MAP: Record<string, unknown> = {
  GraduationScrollIcon,
  CodeIcon,
  Briefcase01Icon,
  Dumbbell01Icon,
  Book01Icon,
  Building03Icon,
  Coffee01Icon,
  Fire02Icon,
  Timer01Icon,
  Moon01Icon,
  Calendar03Icon,
  Clock01Icon,
  Notification01Icon,
  Search01Icon,
  FireIcon,
};

export const ICON_OPTIONS: { name: string; icon: unknown; label: string }[] = [
  { name: 'GraduationScrollIcon', icon: GraduationScrollIcon, label: 'Учёба' },
  { name: 'CodeIcon',             icon: CodeIcon,             label: 'Код' },
  { name: 'Briefcase01Icon',      icon: Briefcase01Icon,      label: 'Работа' },
  { name: 'Dumbbell01Icon',       icon: Dumbbell01Icon,       label: 'Спорт' },
  { name: 'Book01Icon',           icon: Book01Icon,           label: 'Книга' },
  { name: 'Building03Icon',       icon: Building03Icon,       label: 'Здание' },
  { name: 'Coffee01Icon',         icon: Coffee01Icon,         label: 'Отдых' },
  { name: 'Fire02Icon',           icon: Fire02Icon,           label: 'Огонь' },
  { name: 'Timer01Icon',          icon: Timer01Icon,          label: 'Таймер' },
  { name: 'Moon01Icon',           icon: Moon01Icon,           label: 'Ночь' },
  { name: 'Calendar03Icon',       icon: Calendar03Icon,       label: 'Календарь' },
  { name: 'Clock01Icon',          icon: Clock01Icon,          label: 'Часы' },
];

export const COLOR_OPTIONS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#84cc16', // lime
  '#a78bfa', // purple light
];

// Для статических категорий — CSS custom properties (varPrefix)
// Для динамических — инлайн hex → генерируем bg/border/text
export const catStyle = (key: CategoryKey, custom?: CustomCategory): React.CSSProperties => {
  if (custom) {
    const hex = custom.color;
    return {
      '--cat-border': hex,
      '--cat-bg':     `color-mix(in oklch, ${hex} 15%, transparent)`,
      '--cat-text':   `color-mix(in oklch, ${hex} 80%, #1a1a1a)`,
    } as React.CSSProperties;
  }
  const cat = CATEGORIES[key];
  if (!cat) return {};
  return {
    '--cat-border': `var(--${cat.varPrefix}-border)`,
    '--cat-bg':     `var(--${cat.varPrefix}-bg)`,
    '--cat-text':   `var(--${cat.varPrefix}-text)`,
  } as React.CSSProperties;
};

// Slate mono scale on hue 250 — for Recharts (SVG не поддерживает CSS-переменные внутри fill)
export const CAT_COLORS: Record<string, string> = {
  study:    '#8E96A6',
  reading:  '#7A839A',
  code:     '#69728B',
  freelance:'#59627C',
  sport:    '#49526D',
  fixed:    '#434B60',
};

export function getIcon(key: CategoryKey, custom?: CustomCategory): unknown {
  if (custom) return ICON_MAP[custom.iconName] ?? Briefcase01Icon;
  return CATEGORIES[key]?.icon ?? Briefcase01Icon;
}
