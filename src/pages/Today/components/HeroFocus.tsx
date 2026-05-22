import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  toggleTask, updateTask, addTask, startTaskNow,
  selectCurrentTask, selectNextTask, selectNowMin,
} from '../../../features/tasks';
import { catStyle, CATEGORIES } from '../../../shared/utils/categories';
import { rangeFmt, fmtCountdown, fmtRemaining } from '../../../shared/utils/time';
import { Icon, Tick01Icon, ArrowRight01Icon, Coffee01Icon, SparklesIcon, PlusSignIcon } from '../../../shared/ui';
import styles from './HeroFocus.module.css';

const MOCK_TIP = { text: 'У тебя ещё 2 глубоких блока сегодня. После 17:00 — только лёгкое.', taskHint: 'Разбор почты' };

export function HeroFocus() {
  const dispatch = useAppDispatch();
  const nowMin   = useAppSelector(selectNowMin);
  const current  = useAppSelector(selectCurrentTask);
  const next     = useAppSelector(selectNextTask);
  const task     = current ?? next;

  if (!task) {
    return (
      <div className={styles.hero}>
        <p className={`${styles.empty} muted t-body`}>На сегодня всё выполнено</p>
      </div>
    );
  }

  const isCurrent = !!current;
  const catLabel  = CATEGORIES[task.cat]?.label ?? task.cat;

  // Метка: «Сейчас · осталось X мин» vs «Следующий блок · через X ч Y мин»
  const label = isCurrent
    ? `Сейчас · ${rangeFmt(task.start, task.end)} · осталось ${fmtRemaining(task.end, nowMin)}`
    : `Следующий блок · через ${fmtCountdown(task.start - nowMin)}`;

  function handleDone()  { dispatch(toggleTask(task!.id)); }
  function handleSkip()  { dispatch(toggleTask(task!.id)); }
  function handleStart() { dispatch(startTaskNow({ id: task!.id, nowMin })); }
  function handleDelay() {
    if (!current) return;
    dispatch(updateTask({ ...current, start: current.start + 15, end: current.end + 15 }));
  }

  const dur = task.end - task.start;

  return (
    <div className={styles.hero} style={catStyle(task.cat)}>
      <div className={styles.meta}>
        <span className={`t-small muted ${styles.label}`}>{label}</span>
        <span className="t-small muted">{dur} мин</span>
        {task.cat && <span className={styles.catBadge}>{catLabel}</span>}
      </div>

      <h1 className={`t-h1 ${styles.title}`}>{task.title}</h1>

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

      <div className={styles.tip}>
        <div className={styles.tipHead}>
          <Icon icon={SparklesIcon} size={13} />
          <span className={styles.tipLabel}>Совет дня</span>
        </div>
        <p className={styles.tipText}>{MOCK_TIP.text}</p>
        {MOCK_TIP.taskHint && (
          <button
            className={styles.tipAction}
            onClick={() => dispatch(addTask({
              title: MOCK_TIP.taskHint,
              cat: 'study',
              start: nowMin,
              end: nowMin + 30,
              source: 'ai',
            }))}
          >
            <Icon icon={PlusSignIcon} size={12} />
            {MOCK_TIP.taskHint} — добавить в расписание
          </button>
        )}
      </div>
    </div>
  );
}
