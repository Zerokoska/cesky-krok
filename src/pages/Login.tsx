import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Icon, Logo } from '../components/Icon';
import { ErrorBox } from '../components/ui';
import { ROLE_LOGIN } from '../config';
import { useApp } from '../data/context';
import { LocalDataStore } from '../data/local';
import type { Role } from '../data/types';

const ROLES: { role: Role; label: string; hint: string }[] = [
  { role: 'teacher', label: 'Вчитель', hint: 'методичка, ключі, результати' },
  { role: 'student', label: 'Учениця', hint: 'уроки, вправи, домашка' },
];

export function Login() {
  const { store, profile, ready } = useApp();
  const [role, setRole] = useState<Role | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && profile) return <Navigate to="/" replace />;

  const local = store instanceof LocalDataStore ? store : null;

  const pick = (r: Role) => {
    if (local) {
      local.loginAs(r);
      return;
    }
    setRole(r);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setBusy(true);
    setError(null);
    try {
      await store.signIn(ROLE_LOGIN[role], password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login stack">
        <span className="logo" style={{ fontSize: '1.3rem' }}>
          <Logo /> Krok za krokem
        </span>
        <p className="muted" style={{ margin: 0 }}>
          Česky krok za krokem 1 — уроки, аудіо, вправи й домашка.
        </p>
        {local && <div className="note small">Локальний режим: дані зберігаються лише в цьому браузері.</div>}

        {!role ? (
          <div className="stack" style={{ gap: 10 }}>
            <b>Хто ви?</b>
            {ROLES.map((r) => (
              <button key={r.role} type="button" className="btn role-btn" onClick={() => pick(r.role)}>
                <span>
                  <span className="role-name">{r.label}</span>
                  <span className="muted small">{r.hint}</span>
                </span>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
        ) : (
          <form className="stack" onSubmit={submit}>
            <div className="row">
              <b>{ROLES.find((r) => r.role === role)?.label}</b>
              <span className="spacer" />
              <button type="button" className="btn small ghost" onClick={() => setRole(null)}>
                <Icon name="back" size={14} /> Інша роль
              </button>
            </div>
            {/* Hidden username lets password managers remember the right password per role. */}
            <input type="text" name="username" autoComplete="username" value={ROLE_LOGIN[role]} readOnly hidden />
            <label className="field">
              Пароль
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="current-password"
              />
            </label>
            {error && <ErrorBox error={error} />}
            <button className="btn primary" disabled={busy || !password}>
              {busy ? 'Зачекайте…' : 'Увійти'}
            </button>
            <p className="muted small" style={{ margin: 0 }}>
              Вхід потрібен один раз на кожному пристрої — далі застосунок пам’ятає.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
