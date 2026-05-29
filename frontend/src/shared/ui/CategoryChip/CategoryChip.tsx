import type { HTMLAttributes } from 'react';
import { useGetCategoriesQuery } from '../../../features/categories/categoriesApi';
import type { CategoryKey } from '../../types';
import { CATEGORIES, catStyle, getIcon } from '../../utils/categories';
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
  const { data: apiCats = [] } = useGetCategoriesQuery();
  const apiCat = apiCats.find(c => c.key === cat && !c.is_system);
  const custom = apiCat ? { key: apiCat.key, label: apiCat.name, iconName: '', color: apiCat.color } : undefined;
  const staticMeta = CATEGORIES[cat];

  const text = label ?? custom?.label ?? staticMeta?.label ?? cat;
  const icon = getIcon(cat, custom);
  const chipStyle = { ...catStyle(cat, custom), ...style };

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
      style={chipStyle}
      {...rest}
    >
      <Icon icon={icon as never} size={iconSizeMap[size]} strokeWidth={2} />
      {!iconOnly && <span className={styles.label}>{text}</span>}
    </span>
  );
}
