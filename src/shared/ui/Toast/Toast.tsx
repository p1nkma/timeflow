import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { clearToast } from '../../../features/ui';
import { Icon, Tick01Icon } from '../Icon/Icon';
import styles from './Toast.module.css';

export function Toast() {
  const dispatch = useAppDispatch();
  const toast = useAppSelector(s => s.ui.toast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch(clearToast()), 2800);
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div
      className={`${styles.toast} ${styles[toast.variant]}`}
      key={toast.id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon icon={Tick01Icon} size={14} strokeWidth={2} />
      {toast.message}
    </div>
  );
}
