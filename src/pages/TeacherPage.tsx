import { Link, Navigate } from 'react-router-dom';
import { ErrorBox, Loading, ScoreBadge, dateUk, percent } from '../components/ui';
import type { Lesson } from '../content/schema';
import { useApp } from '../data/context';
import type { Attempt } from '../data/types';
import { useAsync } from '../lib/useAsync';
import { bestByExercise, useProgress } from '../lib/useProgress';
import { stepExercises } from './LessonPage';

function LessonReport({ lesson, studentId }: { lesson: Lesson; studentId: string }) {
  const progress = useProgress(lesson.id, studentId);
  if (progress.loading) return <Loading />;
  if (progress.error) return <ErrorBox error={progress.error} />;
  const { attempts, steps, vocab } = progress.data!;
  const best = bestByExercise(attempts);
  const allEx = [...lesson.steps.flatMap(stepExercises), ...lesson.test.exercises];
  const tried = allEx.filter((e) => best.has(e.id));
  const avg = tried.length ? Math.round(tried.reduce((a, e) => a + percent(best.get(e.id)!.score, best.get(e.id)!.max), 0) / tried.length) : 0;
  const minutes = Math.round(attempts.reduce((a, x) => a + x.durationSec, 0) / 60);
  const lastAt = attempts.length ? attempts[attempts.length - 1].createdAt : null;

  // Latest attempt per exercise → its wrong items.
  const latest = new Map<string, Attempt>();
  attempts.forEach((a) => latest.set(a.exerciseId, a));
  const exTitle = new Map(allEx.map((e) => [e.id, e.title.cs]));
  const mistakes = [...latest.values()]
    .flatMap((a) => a.items.filter((i) => !i.correct).map((i) => ({ ...i, ex: exTitle.get(a.exerciseId) ?? a.exerciseId })))
    .slice(0, 40);

  return (
    <section className="stack">
      <h2 style={{ margin: '8px 0 0' }}>
        Lekce {lesson.number}: {lesson.title.cs}
      </h2>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-n">
            {steps.length}/{lesson.steps.length}
          </div>
          <div className="stat-l">кроків пройдено</div>
        </div>
        <div className="stat">
          <div className="stat-n">
            {tried.length}/{allEx.length}
          </div>
          <div className="stat-l">вправ зроблено</div>
        </div>
        <div className="stat">
          <div className="stat-n">{avg}%</div>
          <div className="stat-l">середній найкращий результат</div>
        </div>
        <div className="stat">
          <div className="stat-n">
            {vocab.filter((v) => v.known).length}/{lesson.vocabulary.length}
          </div>
          <div className="stat-l">слів «знаю»</div>
        </div>
        <div className="stat">
          <div className="stat-n">{minutes} хв</div>
          <div className="stat-l">{lastAt ? `остання активність ${dateUk(lastAt)}` : 'ще не займалась'}</div>
        </div>
      </div>

      <div className="card">
        <h3>По кроках</h3>
        <div className="table-wrap">
          <table className="gtable">
            <thead>
              <tr>
                <th>Крок</th>
                <th>Вправа</th>
                <th>Найкраще</th>
                <th>Спроб</th>
                <th>Остання</th>
              </tr>
            </thead>
            <tbody>
              {[...lesson.steps.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.title.cs}`, exs: stepExercises(s), done: steps.some((p) => p.stepId === s.id) })),
                { id: 'test', label: 'Test', exs: lesson.test.exercises, done: false }].flatMap((s) =>
                s.exs.map((e, k) => {
                  const b = best.get(e.id);
                  const n = attempts.filter((a) => a.exerciseId === e.id);
                  return (
                    <tr key={`${s.id}/${e.id}`}>
                      <td>{k === 0 ? <Link to={s.id === 'test' ? `/lekce/${lesson.id}/test` : `/lekce/${lesson.id}/krok/${s.id}`}>{s.label}{s.done ? ' ✓' : ''}</Link> : ''}</td>
                      <td>{e.title.cs}</td>
                      <td>{b ? <ScoreBadge score={b.score} max={b.max} /> : <span className="muted">—</span>}</td>
                      <td>{n.length || ''}</td>
                      <td className="small muted">{n.length ? dateUk(n[n.length - 1].createdAt) : ''}</td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Помилки в останніх спробах</h3>
        {mistakes.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>Помилок немає (або вправи ще не робились).</p>
        ) : (
          mistakes.map((m, i) => (
            <div className="mistake" key={i}>
              <span className="muted">
                {m.ex}
                {m.label ? ` · ${m.label}` : ''} —{' '}
              </span>
              <s>{m.given || '∅'}</s> → <b>{m.expected}</b>
              {m.almost && <span className="chip" style={{ marginLeft: 6 }}>діакритика</span>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function TeacherPage() {
  const { profile, content, getLesson, student, store } = useApp();
  const lessons = useAsync(async () => Promise.all((await content.listLessons()).map((l) => getLesson(l.id))), [content]);
  const pending = useAsync(async () => {
    const subs = await store.listSubmissions({});
    return subs.filter((s) => s.status === 'submitted').length;
  }, [store]);

  if (profile?.role !== 'teacher') return <Navigate to="/" replace />;

  return (
    <main className="page">
      <h1>Кабінет учителя</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="chip teacher">Учениця: {student ? student.displayName : 'ще жодного разу не входила'}</span>
        <Link to="/ukoly" className="chip">
          Домашка на перевірку: {pending.data ?? '…'}
        </Link>
      </div>
      {!student && (
        <div className="note small" style={{ marginBottom: 16 }}>
          Акаунт учениці ще не створено. Коли він з’явиться, тут буде її прогрес.
        </div>
      )}
      {lessons.loading && <Loading />}
      {lessons.error && <ErrorBox error={lessons.error} />}
      {student && lessons.data?.map((l) => <LessonReport key={l.id} lesson={l} studentId={student.id} />)}
    </main>
  );
}
