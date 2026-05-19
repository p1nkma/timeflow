import type { Category, CategoryKey } from '../types';

export const CATEGORIES: Record<CategoryKey, Category> = {
  study:     { key: 'study',     label: 'Учёба',    varPrefix: 'cat-study',     cls: 'cat-study' },
  code:      { key: 'code',      label: 'Кодинг',   varPrefix: 'cat-code',      cls: 'cat-code' },
  freelance: { key: 'freelance', label: 'Фриланс',  varPrefix: 'cat-freelance', cls: 'cat-freelance' },
  sport:     { key: 'sport',     label: 'Спорт',    varPrefix: 'cat-sport',     cls: 'cat-sport' },
  reading:   { key: 'reading',   label: 'Чтение',   varPrefix: 'cat-reading',   cls: 'cat-reading' },
  fixed:     { key: 'fixed',     label: 'Вуз',      varPrefix: 'cat-fixed',     cls: 'cat-fixed' },
};

// Hex-цвета для Recharts (SVG не поддерживает CSS-переменные внутри fill)
export const CAT_COLORS: Record<CategoryKey, string> = {
  study:    '#6E67B8',
  code:     '#4A9B7A',
  freelance:'#A87D3A',
  sport:    '#B05A40',
  reading:  '#4A72AA',
  fixed:    '#88877E',
};

export const catStyle = (key: CategoryKey): React.CSSProperties => ({
  '--cat-border': `var(--${CATEGORIES[key].varPrefix}-border)`,
  '--cat-bg':     `var(--${CATEGORIES[key].varPrefix}-bg)`,
  '--cat-text':   `var(--${CATEGORIES[key].varPrefix}-text)`,
} as React.CSSProperties);
