import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Logo } from '../components/Icon';
import { ErrorBox } from '../components/ui';
import { useApp } from '../data/context';
import { LocalDataStore } from '../data/local';

export function Login() {
  const { store, profile, ready } = useApp();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && profile) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') await store.signIn(email.trim(), password);
      else await store.signUp(email.trim(), password, name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login stack">
        <div className="row">
          <span className="logo" style={{ fontSize: '1.3rem' }}>
            <Logo /> Krok za krokem
          </span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Česky krok za krokem 1 — уроки, аудіо, вправи й домашка.
        </p>

        {store instanceof LocalDataStore ? (
          <div className="stack">
            <div className="note small">Локальний режим (без сервера): дані зберігаються лише в цьому браузері.</div>
            <button type="button" className="btn primary" onClick={() => store.loginAs('teacher')}>
              Увійти як вчитель
            </button>
            <button type="button" className="btn" onClick={() => store.loginAs('student')}>
              Увійти як учень
            </button>
          </div>
        ) : (
          <form className="stack" onSubmit={submit}>
            <div className="seg" style={{ alignSelf: 'flex-start' }}>
              <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>
                Вхід
              </button>
              <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>
                Перша реєстрація
              </button>
            </div>
            {mode === 'up' && (
              <label className="field">
                Ім'я
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </label>
            )}
            <label className="field">
              Email
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="field">
              Пароль
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              />
            </label>
            {mode === 'up' && <p className="muted small" style={{ margin: 0 }}>Реєстрація відкрита лише для запрошених email.</p>}
            {error && <ErrorBox error={error} />}
            <button className="btn primary" disabled={busy}>
              {busy ? 'Зачекайте…' : mode === 'in' ? 'Увійти' : 'Зареєструватися'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
