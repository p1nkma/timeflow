import {
  GraduationScrollIcon,
  CodeIcon,
  Briefcase01Icon,
  Dumbbell01Icon,
  Book01Icon,
  Building03Icon,
} from '@hugeicons/core-free-icons';
import type { Category, CategoryKey } from '../types';

export const CATEGORIES: Record<CategoryKey, Category> = {
  study:     { key: 'study',     label: 'Учёба',    varPrefix: 'cat-study',     cls: 'cat-study',     icon: GraduationScrollIcon },
  code:      { key: 'code',      label: 'Кодинг',   varPrefix: 'cat-code',      cls: 'cat-code',      icon: CodeIcon },
  freelance: { key: 'freelance', label: 'Фриланс',  varPrefix: 'cat-freelance', cls: 'cat-freelance', icon: Briefcase01Icon },
  sport:     { key: 'sport',     label: 'Спорт',    varPrefix: 'cat-sport',     cls: 'cat-sport',     icon: Dumbbell01Icon },
  reading:   { key: 'reading',   label: 'Чтение',   varPrefix: 'cat-reading',   cls: 'cat-reading',   icon: Book01Icon },
  fixed:     { key: 'fixed',     label: 'Вуз',      varPrefix: 'cat-fixed',     cls: 'cat-fixed',     icon: Building03Icon },
};

// Slate mono scale on hue 250 — for Recharts (SVG не поддерживает CSS-переменные внутри fill)
export const CAT_COLORS: Record<CategoryKey, string> = {
  study:    '#8E96A6',
  reading:  '#7A839A',
  code:     '#69728B',
  freelance:'#59627C',
  sport:    '#49526D',
  fixed:    '#434B60',
};

export const catStyle = (key: CategoryKey): React.CSSProperties => ({
  '--cat-border': `var(--${CATEGORIES[key].varPrefix}-border)`,
  '--cat-bg':     `var(--${CATEGORIES[key].varPrefix}-bg)`,
  '--cat-text':   `var(--${CATEGORIES[key].varPrefix}-text)`,
} as React.CSSProperties);
