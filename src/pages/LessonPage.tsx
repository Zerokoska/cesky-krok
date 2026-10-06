import { Link, useParams } from 'react-router-dom';
import { Bi } from '../components/Bi';
import { Icon } from '../components/Icon';
import { ErrorBox, Loading, Progress, ScoreBadge, TeacherPanel, plural } from '../components/ui';
import type { Exercise, Lesson, Step } from '../content/schema';
import { useApp } from '../data/context';
import { useAsync } from '../lib/useAsync';
import { bestByExercise, useProgress } from '../lib/useProgress';

export const stepExercises = (s: Step): Exercise[] =>
  s.blocks.flatMap((b) => (b.kind === 'exercise' ? [b.exercise] : []));

export function useLesson(id: string | undefined) {
  const { getLesson } = useApp();
  return useAsync<Lesson>(() => (id ? getLesson(id) : Promise.reject(new Error('Немає уроку'))), [id]);
}

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const { isTeacherView, store } = useApp();
  const lesson = useLesson(lessonId);
  const progress = useProgress(lessonId);
  const homework = useAsync(() => store.listHomework(lessonId), [store, lessonId]);

  if (lesson.loading) return <Loading />;
  if (lesson.error || !lesson.data) return <main className="page"><ErrorBox error={lesson.error ?? 'Урок не знайдено'} /></main>;

  const L = lesson.data;
  const done = new Set(progress.data?.steps.map((s) => s.stepId));
  const best = bestByExercise(progress.data?.attempts ?? []);
  const known = progress.data?.vocab.filter((v) => v.known).length ?? 0;
  const testBest = L.test.exercises.map((e) => best.get(e.id)).filter(Boolean);

  return (
    <main className="page">
      <div className="crumbs">
        <Link to="/">Уроки</Link> <span>›</span> <span>Lekce {L.number}</span>
      </div>
      <section className="lesson-hero">
        <div className="small" style={{ opacity: 0.85, fontWeight: 700 }}>
          Lekce {L.number} · Učebnice s. {L.pages[0]}–{L.pages[1]}
        </div>
        <Bi text={L.title} as="h1" />
        <Progress value={L.steps.length ? done.size / L.steps.length : 0} />
      </section>

      <div className="grid-2">
        <div className="stack">
          <div className="steps">
            {L.steps.map((s, i) => {
              const exs = stepExercises(s);
              const tried = exs.filter((e) => best.has(e.id));
              const sc = tried.reduce((a, e) => a + best.get(e.id)!.score, 0);
              const mx = tried.reduce((a, e) => a + best.get(e.id)!.max, 0);
              return (
                <Link key={s.id} to={`/lekce/${L.id}/krok/${s.id}`} className="card card-link step-card">
                  <div className={`step-num${done.has(s.id) ? ' done' : ''}`}>{done.has(s.id) ? <Icon name="check" /> : i + 1}</div>
                  <div>
                    <Bi text={s.title} as="div" className="step-title" />
                    <div className="row small muted" style={{ marginTop: 4 }}>
                      <span className="chip book">
                        <Icon name="book" size={13} /> s. {s.book.page}
                        {s.book.exercises ? `, ${s.book.exercises}` : ''}
                      </span>
                      <span>
                        {plural(exs.length, ['вправа', 'вправи', 'вправ'])}
                        {s.audio.length ? ` · ${s.audio.length} аудіо` : ''}
                      </span>
                    </div>
                  </div>
                  <div>{tried.length > 0 && <ScoreBadge score={sc} max={mx} />}</div>
                </Link>
              );
            })}
            <Link to={`/lekce/${L.id}/slovicka`} className="card card-link step-card">
              <div className="step-num">Aa</div>
              <div>
                <div className="step-title">Slovíčka lekce {L.number}</div>
                <div className="small muted">
                  {L.vocabulary.length} слів · знаю {known}
                </div>
              </div>
              <div />
            </Link>
            <Link to={`/lekce/${L.id}/test`} className="card card-link step-card">
              <div className="step-num">✓</div>
              <div>
                <Bi text={L.test.title} as="div" className="step-title" />
                <div className="small muted">Підсумковий тест уроку</div>
              </div>
              <div>
                {testBest.length > 0 && (
                  <ScoreBadge score={testBest.reduce((a, b) => a + b!.score, 0)} max={testBest.reduce((a, b) => a + b!.max, 0)} />
                )}
              </div>
            </Link>
          </div>
        </div>

        <aside className="stack">
          <section className="card">
            <h3>Цілі уроку</h3>
            <p className="small">
              <b>Комунікація:</b> {L.goals.communicative}
            </p>
            <p className="small" style={{ margin: 0 }}>
              <b>Граматика:</b> {L.goals.grammar}
            </p>
          </section>
          {isTeacherView && L.teacherIntro.length > 0 && (
            <TeacherPanel title="Як почати урок">
              <ul>
                {L.teacherIntro.map((t, i) => (
                  <li key={i} className="small">
                    {t}
                  </li>
                ))}
              </ul>
            </TeacherPanel>
          )}
          <section className="card">
            <div className="row">
              <h3 style={{ margin: 0 }}>Домашка</h3>
              <span className="spacer" />
              <Link to="/ukoly" className="btn small">
                Усі
              </Link>
            </div>
            {homework.data?.length ? (
              <div className="list">
                {homework.data.map((h) => (
                  <Link to={`/ukoly#${h.id}`} key={h.id} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <b>{h.title}</b>
                    {h.dueDate && <span className="muted small">до {new Date(h.dueDate).toLocaleDateString('uk-UA')}</span>}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted small" style={{ margin: '8px 0 0' }}>
                {isTeacherView ? 'Ще не задано. Задайте в розділі «Домашка».' : 'Поки немає завдань.'}
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
