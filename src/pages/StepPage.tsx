import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AudioPlayer } from '../components/Audio';
import { Bi } from '../components/Bi';
import { BlockView } from '../components/BlockView';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Icon } from '../components/Icon';
import { BookRef, ErrorBox, Loading, TeacherPanel } from '../components/ui';
import type { OnlineActivity } from '../content/schema';
import { useApp } from '../data/context';
import { useProgress } from '../lib/useProgress';
import { useScrollToExercise } from '../lib/useScrollToExercise';
import { useLesson } from './LessonPage';

const PROVIDER: Record<OnlineActivity['provider'], string> = {
  wordwall: 'Wordwall',
  learningapps: 'LearningApps',
  padlet: 'Padlet',
  kahoot: 'Kahoot',
  flippity: 'Flippity',
  drive: 'Google Drive',
  other: 'Онлайн',
};

export function OnlineList({ items }: { items: OnlineActivity[] }) {
  if (!items.length) return null;
  return (
    <section className="card">
      <h3>Онлайн-вправи видавця</h3>
      <div className="online-list">
        {items.map((o) => (
          <a key={o.url} className="online" href={o.url} target="_blank" rel="noreferrer">
            <div style={{ flex: 1 }}>
              <div className="online-prov">
                {PROVIDER[o.provider]}
                {o.sound ? ' · зі звуком' : ''}
              </div>
              <div style={{ fontWeight: 700 }}>{o.title}</div>
              {o.note && <div className="small muted">{o.note}</div>}
            </div>
            <Icon name="external" />
          </a>
        ))}
      </div>
    </section>
  );
}

export function StepPage() {
  const { lessonId = '', stepId = '' } = useParams();
  const { store, isTeacherView, profile } = useApp();
  const lesson = useLesson(lessonId);
  const progress = useProgress(lessonId);
  const [busy, setBusy] = useState(false);
  useScrollToExercise(!!lesson.data);

  if (lesson.loading) return <Loading />;
  if (lesson.error || !lesson.data) return <main className="page"><ErrorBox error={lesson.error ?? 'Урок не знайдено'} /></main>;

  const L = lesson.data;
  const idx = L.steps.findIndex((s) => s.id === stepId);
  const step = L.steps[idx];
  if (!step) return <main className="page"><ErrorBox error="Крок не знайдено" /></main>;
  const prev = L.steps[idx - 1];
  const next = L.steps[idx + 1];
  const done = !!progress.data?.steps.some((s) => s.stepId === step.id);
  const own = !isTeacherView && !!profile;

  const toggleDone = async () => {
    setBusy(true);
    try {
      await store.setStepDone(L.id, step.id, !done);
      progress.reload();
    } finally {
      setBusy(false);
    }
  };

  const ctx = { lessonId: L.id, stepId: step.id, attempts: progress.data?.attempts ?? [], onSaved: progress.reload };

  return (
    <main className="page">
      <div className="crumbs">
        <Link to="/">Уроки</Link> <span>›</span> <Link to={`/lekce/${L.id}`}>Lekce {L.number}</Link> <span>›</span>
        <span>
          Krok {idx + 1}/{L.steps.length}
        </span>
      </div>
      <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Bi text={step.title} as="h1" />
          <div className="row">
            <BookRef page={step.book.page} exercises={step.book.exercises} />
            {done && <span className="chip ok">пройдено</span>}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          {step.audio.length > 0 && (
            <section className="card stack" style={{ gap: 8 }}>
              <h3 style={{ margin: 0 }}>Nahrávky</h3>
              {step.audio.map((a, i) => (
                <AudioPlayer key={`${step.id}:${i}`} audio={a} />
              ))}
            </section>
          )}
          {step.blocks.map((b, i) => (
            <ErrorBoundary key={`${step.id}:${b.kind === 'exercise' ? b.exercise.id : i}`}>
              <BlockView block={b} ctx={ctx} />
            </ErrorBoundary>
          ))}

          <div className="row" style={{ marginTop: 8 }}>
            {prev ? (
              <Link className="btn" to={`/lekce/${L.id}/krok/${prev.id}`}>
                <Icon name="back" /> Krok {idx}
              </Link>
            ) : (
              <Link className="btn" to={`/lekce/${L.id}`}>
                <Icon name="back" /> Lekce
              </Link>
            )}
            <span className="spacer" />
            {own && (
              <button type="button" className={`btn${done ? '' : ' primary'}`} onClick={toggleDone} disabled={busy}>
                <Icon name="check" /> {done ? 'Пройдено' : 'Крок пройдено'}
              </button>
            )}
            {next ? (
              <Link className="btn" to={`/lekce/${L.id}/krok/${next.id}`}>
                Krok {idx + 2} <Icon name="chevron" />
              </Link>
            ) : (
              <Link className="btn" to={`/lekce/${L.id}/slovicka`}>
                Slovíčka <Icon name="chevron" />
              </Link>
            )}
          </div>
        </div>

        <aside className="stack">
          {isTeacherView && (step.teacher.notes.length > 0 || step.teacher.activities.length > 0) && (
            <TeacherPanel title="Методичка">
              {step.teacher.notes.length > 0 && (
                <ul>
                  {step.teacher.notes.map((n, i) => (
                    <li key={i} className="small">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
              {step.teacher.activities.length > 0 && (
                <>
                  <div className="small" style={{ fontWeight: 800, marginBottom: 4 }}>
                    Ігри та активності на уроці
                  </div>
                  <ul>
                    {step.teacher.activities.map((n, i) => (
                      <li key={i} className="small">
                        {n}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </TeacherPanel>
          )}
          <OnlineList items={step.online} />
        </aside>
      </div>
    </main>
  );
}
