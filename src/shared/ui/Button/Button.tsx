import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'ghost', size = 'md', className = '', children, ...props }: ButtonProps) {
  const cls = [styles.btn, styles[variant], styles[size], className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
