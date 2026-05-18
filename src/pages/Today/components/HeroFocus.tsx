import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { toggleTask, updateTask } from '../../../features/tasks';
import { selectCurrentTask, selectNextTask, selectNowMin } from '../../../features/tasks/tasksSelectors';
import { catStyle } from '../../../shared/utils/categories';
import { fmt, rangeFmt } from '../../../shared/utils/time';
import { Icon, Tick01Icon, ArrowRight01Icon, Coffee01Icon } from '../../../shared/ui';
import styles from './HeroFocus.module.css';

export function HeroFocus() {
  const dispatch   = useAppDispatch();
  const nowMin     = useAppSelector(selectNowMin);
  const current    = useAppSelector(selectCurrentTask);
  const next       = useAppSelector(selectNextTask);
  const task       = current ?? next;

  if (!task) {
    return (
      <div className={styles.hero}>
        <p className={`${styles.empty} muted t-body`}>На сегодня всё выполнено</p>
      </div>
    );
  }

  const isCurrent  = !!current;
  const label      = isCurrent ? `Сейчас · ${rangeFmt(task.start, task.end)}` : `Следующий блок · через ${fmt(task.start - nowMin)} мин`;

  function handleDone() {
    dispatch(toggleTask(task!.id));
  }

  function handleNext() {
    // пропускаем текущую — помечаем выполненной
    if (current) dispatch(toggleTask(current.id));
  }

  function handleDelay() {
    if (!current) return;
    dispatch(updateTask({ ...current, start: current.start + 15, end: current.end + 15 }));
  }

  return (
    <div className={styles.hero} style={catStyle(task.cat)}>
      <div className={styles.meta}>
        <span className={`t-small muted ${styles.label}`}>{label}</span>
        {task.cat && <span className={styles.catBadge}>{task.cat}</span>}
      </div>

      <h1 className={`t-h1 ${styles.title}`}>{task.title}</h1>

      {task.reason && (
        <p className={`t-body-md muted ${styles.reason}`}>{task.reason}</p>
      )}

      <div className={`hstack gap-2 ${styles.actions}`}>
        <button className={styles.btnPrimary} onClick={handleDone}>
          <Icon icon={Tick01Icon} size={15} />
          Выполнено
        </button>
        {isCurrent && (
          <>
            <button className={styles.btnSecondary} onClick={handleNext}>
              <Icon icon={ArrowRight01Icon} size={15} />
              Следующая
            </button>
            <button className={styles.btnGhost} onClick={handleDelay}>
              <Icon icon={Coffee01Icon} size={14} />
              Отложить 15 мин
            </button>
          </>
        )}
      </div>

      <div className={styles.meta2}>
        <span className="t-small muted">Длительность</span>
        <span className={`t-small ${styles.dur}`}>{task.end - task.start} мин</span>
        {next && isCurrent && (
          <>
            <span className="t-small muted">Затем</span>
            <span className="t-small">{next.title}</span>
          </>
        )}
      </div>
    </div>
  );
}
