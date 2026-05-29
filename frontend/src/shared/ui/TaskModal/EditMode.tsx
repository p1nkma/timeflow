import { useTaskApi } from '../../../features/tasks/useTaskApi';
import { Icon, Delete01Icon } from '../Icon/Icon';
import type { Task } from '../../types';
import { TaskForm } from './TaskForm';
import { formValuesToTaskPatch, taskToFormValues, useTaskForm } from './useTaskForm';
import styles from './TaskModal.module.css';

interface Props {
  task: Task;
  onSaved: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}

export function EditMode({ task, onSaved, onDiscard, onDelete }: Props) {
  const taskApi = useTaskApi();
  const form    = useTaskForm(taskToFormValues(task), task.id);

  function handleSave() {
    if (!form.isValid) return;
    taskApi.updateTask({ ...task, ...formValuesToTaskPatch(form.values) });
    onSaved();
  }

  function handleDiscard() {
    if (form.isDirty && !window.confirm('Отменить изменения?')) return;
    onDiscard();
  }

  return (
    <div className={styles.body}>
      <TaskForm values={form.values} update={form.update} autoFocusTitle />

      <div className={styles.footer}>
        <button
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={!form.isValid}
        >
          Сохранить
        </button>
        <button className={styles.btnSecondary} onClick={handleDiscard}>Отмена</button>
        <button className={`${styles.closeBtn} ${styles.closeBtnDanger}`} onClick={onDelete} aria-label="Удалить задачу" title="Удалить">
          <Icon icon={Delete01Icon} size={14} />
        </button>
      </div>
    </div>
  );
}
