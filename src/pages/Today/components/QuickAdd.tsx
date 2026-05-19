import { useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { addInboxItem } from '../../../features/inbox';
import styles from './QuickAdd.module.css';

export function QuickAdd() {
  const dispatch = useAppDispatch();
  const [value, setValue]       = useState('');
  const [confirmed, setConfirmed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    dispatch(addInboxItem({ title, cat: 'study' }));
    setValue('');
    // Кратковременный flash-фидбек: поле окрашивается в зелёный
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 800);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor="quick-add" className={styles.srOnly}>Записать задачу в Inbox</label>
      <input
        id="quick-add"
        className={`t-body ${styles.input} ${confirmed ? styles.inputConfirmed : ''}`}
        placeholder="+ Записать в Inbox…"
        value={value}
        onChange={e => setValue(e.target.value)}
        aria-label="Быстрая запись в Inbox"
      />
    </form>
  );
}
