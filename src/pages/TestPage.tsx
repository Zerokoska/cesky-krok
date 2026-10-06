import { Link, useParams } from 'react-router-dom';
import { Bi } from '../components/Bi';
import { ErrorBox, Loading, ScoreBadge } from '../components/ui';
import { useApp } from '../data/context';
import { ExerciseCard } from '../exercises/ExerciseCard';
import { bestByExercise, useProgress } from '../lib/useProgress';
import { useScrollToExercise } from '../lib/useScrollToExercise';
import { useLesson } from './LessonPage';

export function TestPage() {
  const { lessonId = '' } = useParams();
  const { isTeacherView } = useApp();
  const lesson = useLesson(lessonId);
  const progress = useProgress(lessonId);
  useScrollToExercise(!!lesson.data);

  if (lesson.loading) return <Loading />;
  if (lesson.error || !lesson.data) return <main className="page"><ErrorBox error={lesson.error ?? 'Урок не знайдено'} /></main>;
  const L = lesson.data;
  const attempts = progress.data?.attempts ?? [];
  const best = bestByExercise(attempts);
  const parts = L.test.exercises.map((e) => best.get(e.id)).filter(Boolean);

  return (
    <main className="page narrow">
      <div className="crumbs">
        <Link to="/">Уроки</Link> <span>›</span> <Link to={`/lekce/${L.id}`}>Lekce {L.number}</Link> <span>›</span>
        <span>Test</span>
      </div>
      <Bi text={L.test.title} as="h1" />
      <p className="muted">
        {isTeacherView
          ? 'Підсумковий тест. Після кожної частини результат учня зберігається і з’являється в кабінеті.'
          : 'Робіть без підручника. Після кожної частини натисніть «Перевірити».'}
        {parts.length > 0 && (
          <>
            {' '}
            Найкращий результат:{' '}
            <ScoreBadge score={parts.reduce((a, b) => a + b!.score, 0)} max={parts.reduce((a, b) => a + b!.max, 0)} />
          </>
        )}
      </p>
      <div className="stack">
        {L.test.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            lessonId={L.id}
            stepId="test"
            history={attempts.filter((a) => a.exerciseId === ex.id)}
            onSaved={progress.reload}
          />
        ))}
      </div>
    </main>
  );
}
