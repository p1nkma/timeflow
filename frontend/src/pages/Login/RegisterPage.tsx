import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { useLoginMutation, useRegisterMutation } from '../../features/auth';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../features/ui';
import styles from './AuthPage.module.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const [login,    { isLoading: isLoggingIn   }] = useLoginMutation();

  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLoading = isRegistering || isLoggingIn;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await register({ email, password, full_name: fullName }).unwrap();
    } catch (err: unknown) {
      setErrorMsg(extractError(err) ?? 'Не удалось создать аккаунт');
      return;
    }
    try {
      await login({ email, password }).unwrap();
      dispatch(showToast({ message: 'Аккаунт создан', variant: 'success' }));
      navigate('/today', { replace: true });
    } catch {
      setErrorMsg('Аккаунт создан, но войти не удалось — попробуйте войти вручную');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className="t-h2">TimeFlow</h1>
        <p className={`t-body muted ${styles.subtitle}`}>Создание аккаунта</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className="t-small muted">Имя</span>
            <input
              type="text"
              className={styles.input}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              minLength={1}
              maxLength={255}
              autoComplete="name"
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className="t-small muted">Email</span>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
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
              autoComplete="new-password"
            />
          </label>

          {errorMsg && <p className={styles.error}>{errorMsg}</p>}

          <button type="submit" className={styles.submit} disabled={isLoading}>
            {isLoading ? 'Создаём…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className={`t-small muted ${styles.altRow}`}>
          Уже есть аккаунт? <Link to="/login" className={styles.link}>Войти</Link>
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
