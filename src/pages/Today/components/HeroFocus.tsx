import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  toggleTask, updateTask, startTaskNow, rescheduleTask,
  selectCurrentTask, selectNextTask, selectNowMin, selectRealTasks,
} from '../../../features/tasks';
import { showToast } from '../../../features/ui';
import { catStyle } from '../../../shared/utils/categories';
import { rangeFmt, fmtCountdown, fmtRemaining, findFreeSlot } from '../../../shared/utils/time';
import { Icon, Tick01Icon, ArrowRight01Icon, Coffee01Icon, CategoryChip } from '../../../shared/ui';
import type { EnergyLevel } from '../../../shared/types';
import styles from './HeroFocus.module.css';

const ENERGY_LABEL: Record<EnergyLevel, string> = {
  low:    'лёгкая',
  medium: 'средняя',
  high:   'тяжёлая',
};

function EnergyBadge({ level }: { level: EnergyLevel }) {
  return (
    <span className={styles.energyBadge} aria-label={`Нагрузка: ${ENERGY_LABEL[level]}`}>
      {ENERGY_LABEL[level]}
    </span>
  );
}

export function HeroFocus() {
  const dispatch = useAppDispatch();
  const nowMin   = useAppSelector(selectNowMin);
  const current  = useAppSelector(selectCurrentTask);
  const next     = useAppSelector(selectNextTask);
  const realTasks = useAppSelector(selectRealTasks);
  const planner  = useAppSelector(s => s.planner);
  const task     = current ?? next;

  if (!task) {
    const noPlan = realTasks.length === 0;
    return (
      <div className={styles.hero}>
        {noPlan ? (
          <div className={styles.emptyState}>
            <p className={`${styles.emptyTitle} t-h3`}>План на сегодня ещё не создан</p>
            <p className={`${styles.emptySub} muted t-body`}>
              Сгенерируй план или добавь задачи вручную через «+»
            </p>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={`${styles.emptyTitle} t-h3`}>Всё запланированное выполнено</p>
            <p className={`${styles.emptySub} muted t-body`}>Хороший день. Можно подвести итоги.</p>
          </div>
        )}
      </div>
    );
  }

  const isCurrent = !!current;

  // Метка: «Сейчас · осталось X мин» vs «Следующая задача · через X ч Y мин»
  const label = isCurrent
    ? `Сейчас · ${rangeFmt(task.start, task.end)} · осталось ${fmtRemaining(task.end, nowMin)}`
    : `Следующая задача · через ${fmtCountdown(task.start - nowMin)}`;

  function handleDone()  { dispatch(toggleTask(task!.id)); }
  function handleSkip()  {
    if (!current) return;
    dispatch(rescheduleTask({ id: current.id, nowMin }));
  }
  function handleStart() { dispatch(startTaskNow({ id: task!.id, nowMin })); }
  function handleDelay() {
    if (!current) return;
    const duration = current.end - current.start;
    const desiredStart = current.start + 15;
    const others = realTasks
      .filter(t => t.id !== current.id)
      .map(t => ({ start: t.start, end: t.end }));
    const slot = findFreeSlot(others, duration, desiredStart, planner.workEnd);
    if (slot + duration > planner.workEnd) {
      dispatch(showToast({ message: 'Нет свободного места до конца дня', variant: 'error' }));
      return;
    }
    dispatch(updateTask({ ...current, start: slot, end: slot + duration }));
  }

  const dur = task.end - task.start;

  return (
    <div className={styles.hero} style={catStyle(task.cat)}>
      <div className={styles.meta}>
        <span className={`t-small t-num muted ${styles.label}`}>{label}</span>
        <span className="t-small t-num muted">{dur} мин</span>
        {task.energy && <EnergyBadge level={task.energy} />}
        {task.cat && <CategoryChip cat={task.cat} size="sm" variant="pill" />}
      </div>

      <h2 className={`t-h2 ${styles.title}`}>{task.title}</h2>

      {task.reason && (
        <p className={`t-body-md muted ${styles.reason}`}>{task.reason}</p>
      )}

      {next && isCurrent && (
        <p className={`t-small muted ${styles.nextHint}`}>
          Затем — {next.title}
        </p>
      )}

      <div className={`hstack gap-2 ${styles.actions}`}>
        {isCurrent ? (
          <>
            <button className={styles.btnPrimary} onClick={handleDone}>
              <Icon icon={Tick01Icon} size={15} />
              Выполнено
            </button>
            <button className={styles.btnSecondary} onClick={handleSkip}>
              <Icon icon={ArrowRight01Icon} size={15} />
              Пропустить
            </button>
            <button className={styles.btnGhost} onClick={handleDelay}>
              <Icon icon={Coffee01Icon} size={14} />
              Отложить 15 мин
            </button>
          </>
        ) : (
          <>
            <button className={styles.btnPrimary} onClick={handleStart}>
              <Icon icon={ArrowRight01Icon} size={15} />
              Запустить сейчас
            </button>
            <button className={styles.btnGhost} onClick={handleSkip}>
              Пропустить
            </button>
          </>
        )}
      </div>

    </div>
  );
}
