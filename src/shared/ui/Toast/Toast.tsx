import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { clearToast } from '../../../features/ui';
import { deleteTask } from '../../../features/tasks';
import { Icon, Tick01Icon } from '../Icon/Icon';
import styles from './Toast.module.css';

export function Toast() {
  const dispatch = useAppDispatch();
  const toast = useAppSelector(s => s.ui.toast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch(clearToast()), 4000);
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  if (!toast) return null;

  function handleUndo() {
    if (toast?.undoId) dispatch(deleteTask(toast.undoId));
    dispatch(clearToast());
  }

  return (
    <div
      className={`${styles.toast} ${styles[toast.variant]}`}
      key={toast.id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon icon={Tick01Icon} size={14} strokeWidth={2} />
      <span>{toast.message}</span>
      {toast.undoId && (
        <button className={styles.undoBtn} onClick={handleUndo}>
          Отменить
        </button>
      )}
    </div>
  );
}
