import type { HTMLAttributes } from 'react';
import type { CategoryKey } from '../../types';
import { CATEGORIES, catStyle } from '../../utils/categories';
import { Icon } from '../Icon/Icon';
import styles from './CategoryChip.module.css';

type Size = 'xs' | 'sm' | 'md';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  cat: CategoryKey;
  size?: Size;
  variant?: 'pill' | 'badge';
  iconOnly?: boolean;
  uppercase?: boolean;
  label?: string;
}

const iconSizeMap: Record<Size, number> = { xs: 12, sm: 12, md: 14 };

export function CategoryChip({
  cat,
  size = 'sm',
  variant = 'badge',
  iconOnly = false,
  uppercase = false,
  label,
  className,
  style,
  ...rest
}: Props) {
  const meta = CATEGORIES[cat];
  const text = label ?? meta.label;

  return (
    <span
      className={[
        styles.chip,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        iconOnly ? styles.iconOnly : '',
        uppercase ? styles.uppercase : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      style={{ ...catStyle(cat), ...style }}
      {...rest}
    >
      <Icon icon={meta.icon as never} size={iconSizeMap[size]} strokeWidth={2} />
      {!iconOnly && <span className={styles.label}>{text}</span>}
    </span>
  );
}
