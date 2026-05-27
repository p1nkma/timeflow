import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalShellProps {
  onClose: () => void;
  /** Используется для aria-labelledby. Если задан — модалка ищет элемент по id внутри и линкует. */
  labelledBy?: string;
  /** Альтернатива labelledBy — задать aria-label напрямую. */
  ariaLabel?: string;
  /** Класс на backdrop. Стили остаются у каждой модалки. */
  backdropClassName: string;
  /** Класс на сам диалог. */
  className?: string;
  /** Инлайн-стиль на сам диалог (например, transform). */
  style?: React.CSSProperties;
  /** Клик по фону закрывает (по умолчанию true). */
  closeOnBackdrop?: boolean;
  /** Esc закрывает (по умолчанию true). */
  closeOnEsc?: boolean;
  children: ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function ModalShell({
  onClose,
  labelledBy,
  ariaLabel,
  backdropClassName,
  className,
  style,
  closeOnBackdrop = true,
  closeOnEsc = true,
  children,
}: ModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    (first ?? dialog).focus();

    function onKey(e: KeyboardEvent) {
      if (closeOnEsc && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === firstEl) {
        lastEl.focus();
        e.preventDefault();
      } else if (!e.shiftKey && active === lastEl) {
        firstEl.focus();
        e.preventDefault();
      }
    }

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose, closeOnEsc]);

  return createPortal(
    <div
      className={backdropClassName}
      onClick={closeOnBackdrop ? e => { if (e.target === e.currentTarget) onClose(); } : undefined}
    >
      <div
        ref={dialogRef}
        className={className}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
