import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../data/context';
import { stopAll } from '../lib/audio';
import { CzechKeyboard } from './CzechKeyboard';
import { ErrorBoundary } from './ErrorBoundary';
import { Icon, Logo } from './Icon';

export function Layout() {
  const { profile, store, view, setView, showTranslations, setShowTranslations, student } = useApp();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const teacher = profile?.role === 'teacher';

  // Leaving a page silences whatever it was playing.
  useEffect(() => stopAll, [pathname]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="logo">
            <Logo />
            Krok za krokem
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end>
              Уроки
            </NavLink>
            <NavLink to="/ukoly">Домашка</NavLink>
            {teacher && <NavLink to="/ucitel">Кабінет</NavLink>}
          </nav>
          <div className="topbar-right">
            <label className="toggle" title="Завжди показувати український переклад">
              <input type="checkbox" checked={showTranslations} onChange={(e) => setShowTranslations(e.target.checked)} />
              UA
            </label>
            {teacher && (
              <div className="seg" role="group" aria-label="Режим перегляду">
                <button type="button" className={view === 'teacher' ? 'on teacher' : ''} onClick={() => setView('teacher')}>
                  Вчитель
                </button>
                <button type="button" className={view === 'student' ? 'on' : ''} onClick={() => setView('student')}>
                  Як учень
                </button>
              </div>
            )}
            <span className="muted small" title={profile?.email}>
              {profile?.displayName}
              {teacher && student ? ` · учень: ${student.displayName}` : ''}
            </span>
            <button
              type="button"
              className="icon-btn"
              title="Вийти"
              onClick={async () => {
                await store.signOut();
                nav('/login');
              }}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>
      <ErrorBoundary key={pathname}>
        <Outlet />
      </ErrorBoundary>
      <CzechKeyboard />
    </>
  );
}
