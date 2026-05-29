import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useLoginMutation } from '../../features/auth';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../features/ui';
import styles from './AuthPage.module.css';

export function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/today';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await login({ email, password }).unwrap();
      dispatch(showToast({ message: 'Добро пожаловать', variant: 'success' }));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = extractError(err) ?? 'Неверный email или пароль';
      setErrorMsg(message);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className="t-h2">TimeFlow</h1>
        <p className={`t-body muted ${styles.subtitle}`}>Вход в аккаунт</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className="t-small muted">Email</span>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className="t-small muted">Пароль</span>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </label>

          {errorMsg && <p className={styles.error}>{errorMsg}</p>}

          <button type="submit" className={styles.submit} disabled={isLoading}>
            {isLoading ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <p className={`t-small muted ${styles.altRow}`}>
          Нет аккаунта? <Link to="/register" className={styles.link}>Создать</Link>
        </p>
      </div>
    </div>
  );
}

function extractError(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const e = err as { data?: { detail?: unknown } };
  if (typeof e.data?.detail === 'string') return e.data.detail;
  return null;
}
