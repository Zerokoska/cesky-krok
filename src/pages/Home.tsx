import { Link } from 'react-router-dom';
import { Bi } from '../components/Bi';
import { ErrorBox, Loading, Progress } from '../components/ui';
import { useApp } from '../data/context';
import { useAsync } from '../lib/useAsync';
import { useProgress } from '../lib/useProgress';
import type { LessonIndex } from '../content/schema';

function LessonCard({ l }: { l: LessonIndex[number] }) {
  const { getLesson } = useApp();
  const lesson = useAsync(() => getLesson(l.id), [l.id]);
  const progress = useProgress(l.id);
  const total = lesson.data?.steps.length ?? 0;
  const done = progress.data?.steps.length ?? 0;
  return (
    <Link to={`/lekce/${l.id}`} className="card card-link stack" style={{ gap: 10 }}>
      <div className="row">
        <span className="chip book">s. {l.pages[0]}–{l.pages[1]}</span>
        <span className="muted small">Lekce {l.number}</span>
      </div>
      <Bi text={l.title} as="h2" />
      {total > 0 && (
        <>
          <Progress value={done / total} />
          <span className="muted small">
            {done} з {total} кроків
          </span>
        </>
      )}
    </Link>
  );
}

export function Home() {
  const { content, isTeacherView, student } = useApp();
  const lessons = useAsync(() => content.listLessons(), [content]);

  return (
    <main className="page">
      <h1>Česky krok za krokem 1</h1>
      <p className="muted">
        Застосунок іде паралельно з паперовим підручником і робочим зошитом: відкривайте сторінку, яку показано в кожному кроці.
      </p>
      {isTeacherView && !student && (
        <div className="note small" style={{ marginBottom: 16 }}>
          Акаунт учениці ще не створено — її прогрес з’явиться тут після першого входу.
        </div>
      )}
      {lessons.loading && <Loading />}
      {lessons.error && <ErrorBox error={lessons.error} />}
      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {lessons.data?.map((l) => <LessonCard key={l.id} l={l} />)}
        <div className="card flat stack muted" style={{ justifyContent: 'center', borderStyle: 'dashed' }}>
          <b>Lekce 2–24</b>
          <span className="small">Наступні уроки додамо після того, як перевіримо формат першого.</span>
        </div>
      </div>
    </main>
  );
}
