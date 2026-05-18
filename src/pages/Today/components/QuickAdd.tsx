import { useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { addTask } from '../../../features/tasks';
import styles from './QuickAdd.module.css';

export function QuickAdd() {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    dispatch(addTask({ title }));
    setValue('');
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor="quick-add" className={styles.srOnly}>Быстрая запись задачи</label>
      <input
        id="quick-add"
        className={`t-body ${styles.input}`}
        placeholder="+ Быстрая запись…"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
    </form>
  );
}
