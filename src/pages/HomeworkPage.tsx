import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ErrorBox, Loading, dateUk } from '../components/ui';
import type { Lesson } from '../content/schema';
import { useApp } from '../data/context';
import type { Homework, Submission } from '../data/types';
import { compressImage } from '../lib/image';
import { useAsync } from '../lib/useAsync';
import { stepExercises } from './LessonPage';

function Photos({ paths, onRemove }: { paths: string[]; onRemove?: (p: string) => void }) {
  const { store } = useApp();
  // Links are looked up per path, so removing a photo never shifts images onto the wrong button.
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    for (const p of paths) {
      if (p in urls) continue;
      store.photoUrl(p).then(
        (u) => alive && setUrls((m) => ({ ...m, [p]: u })),
        () => alive && setUrls((m) => ({ ...m, [p]: null })),
      );
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, paths.join('|')]);
  if (!paths.length) return null;
  return (
    <>
      <div className="photos">
        {paths.map((p, i) => (
          <div key={p} style={{ position: 'relative' }}>
            {urls[p] ? (
              <img src={urls[p]!} alt={`Фото ${i + 1}`} onClick={() => setOpen(urls[p]!)} />
            ) : (
              <div className="photos-ph">{urls[p] === null ? 'не завантажилось' : '…'}</div>
            )}
            {onRemove && (
              <button
                type="button"
                className="icon-btn"
                style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28 }}
                onClick={() => onRemove(p)}
                title="Прибрати"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      {open && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <img src={open} alt="Фото домашки" />
        </div>
      )}
    </>
  );
}

function exerciseLink(h: Homework) {
  if (!h.exerciseRef) return null;
  const [stepId, exId] = h.exerciseRef.split('/');
  const path = stepId === 'test' ? `/lekce/${h.lessonId}/test` : `/lekce/${h.lessonId}/krok/${stepId}`;
  return `${path}?ex=${exId}`;
}

function StudentHomework({ h, sub, reload }: { h: Homework; sub?: Submission; reload: () => void }) {
  const { store } = useApp();
  const [text, setText] = useState(sub?.answerText ?? '');
  const [keep, setKeep] = useState<string[]>(sub?.photoPaths ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!sub);
  const link = exerciseLink(h);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const small = await Promise.all(files.map((f) => compressImage(f)));
      await store.submitHomework(h.id, text, small, keep);
      setFiles([]);
      setEditing(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card stack" id={h.id}>
      <div className="row">
        <h3 style={{ margin: 0 }}>{h.title}</h3>
        <span className="spacer" />
        {sub?.status === 'reviewed' ? (
          <span className="chip ok">перевірено{sub.grade ? ` · ${sub.grade}` : ''}</span>
        ) : sub ? (
          <span className="chip">здано {dateUk(sub.submittedAt)}</span>
        ) : (
          <span className="chip bad">не здано</span>
        )}
      </div>
      {h.dueDate && <div className="muted small">Термін: {new Date(h.dueDate).toLocaleDateString('uk-UA')}</div>}
      {h.instructions && <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{h.instructions}</p>}
      {link && (
        <Link to={link} className="btn small" style={{ alignSelf: 'flex-start' }}>
          Відкрити вправу <Icon name="chevron" size={14} />
        </Link>
      )}
      {sub?.teacherComment && (
        <div className="teacher-panel small">
          <b style={{ color: 'var(--teacher)' }}>Коментар учителя:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{sub.teacherComment}</span>
        </div>
      )}
      {editing ? (
        <form className="stack" onSubmit={submit}>
          <label className="field">
            Відповідь (можна писати чеською)
            <textarea className="input" data-cz="" value={text} onChange={(e) => setText(e.target.value)} placeholder="1. Já jsem…" />
          </label>
          <Photos paths={keep} onRemove={(p) => setKeep((k) => k.filter((x) => x !== p))} />
          <label className="btn" style={{ alignSelf: 'flex-start' }}>
            <Icon name="camera" /> Додати фото сторінки
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])])}
            />
          </label>
          {files.length > 0 && <div className="small muted">Нових фото: {files.map((f) => f.name).join(', ')}</div>}
          {error && <ErrorBox error={error} />}
          <div className="row">
            <button className="btn primary" disabled={busy || (!text.trim() && !files.length && !keep.length)}>
              {busy ? 'Надсилаю…' : 'Здати'}
            </button>
            {sub && (
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
                Скасувати
              </button>
            )}
          </div>
        </form>
      ) : (
        sub && (
          <div className="stack" style={{ gap: 8 }}>
            {sub.answerText && <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{sub.answerText}</p>}
            <Photos paths={sub.photoPaths} />
            <button type="button" className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)}>
              Змінити відповідь
            </button>
          </div>
        )
      )}
    </article>
  );
}

function ReviewForm({ sub, reload }: { sub: Submission; reload: () => void }) {
  const { store } = useApp();
  const [comment, setComment] = useState(sub.teacherComment ?? '');
  const [grade, setGrade] = useState(sub.grade ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="stack"
      style={{ gap: 8 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await store.reviewSubmission(sub.id, { teacherComment: comment, grade });
          reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && <ErrorBox error={`Відгук не збережено: ${error}`} />}
      <textarea
        className="input"
        data-cz=""
        style={{ minHeight: 80 }}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Коментар: що добре, що виправити…"
      />
      <div className="row">
        <input className="input" style={{ width: 160 }} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Оцінка (напр. 9/10)" />
        <button className="btn primary" disabled={busy}>
          {sub.status === 'reviewed' ? 'Оновити відгук' : 'Позначити перевіреним'}
        </button>
      </div>
    </form>
  );
}

function TeacherHomework({ h, subs, reload }: { h: Homework; subs: Submission[]; reload: () => void }) {
  const { store } = useApp();
  const link = exerciseLink(h);
  return (
    <article className="card stack" id={h.id}>
      <div className="row">
        <h3 style={{ margin: 0 }}>{h.title}</h3>
        <span className="chip">Lekce {Number(h.lessonId)}</span>
        <span className="spacer" />
        <button
          type="button"
          className="icon-btn"
          title="Видалити завдання"
          onClick={async () => {
            if (!confirm(`Видалити «${h.title}» разом із відповідями?`)) return;
            try {
              await store.deleteHomework(h.id);
              reload();
            } catch (err) {
              alert(`Не вдалося видалити: ${err instanceof Error ? err.message : err}`);
            }
          }}
        >
          <Icon name="trash" />
        </button>
      </div>
      <div className="muted small">
        Задано {dateUk(h.createdAt)}
        {h.dueDate ? ` · до ${new Date(h.dueDate).toLocaleDateString('uk-UA')}` : ''}
      </div>
      {h.instructions && <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{h.instructions}</p>}
      {link && (
        <Link to={link} className="btn small" style={{ alignSelf: 'flex-start' }}>
          Вправа в застосунку <Icon name="chevron" size={14} />
        </Link>
      )}
      {subs.length === 0 ? (
        <div className="chip bad" style={{ alignSelf: 'flex-start' }}>
          ще не здано
        </div>
      ) : (
        subs.map((s) => (
          <div key={s.id} className="teacher-panel stack" style={{ gap: 8 }}>
            <div className="row small">
              <b>Здано {dateUk(s.submittedAt)}</b>
              {s.status === 'reviewed' && <span className="chip ok">перевірено</span>}
            </div>
            {s.answerText && <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{s.answerText}</p>}
            <Photos paths={s.photoPaths} />
            <ReviewForm sub={s} reload={reload} />
          </div>
        ))
      )}
    </article>
  );
}

function CreateHomework({ onCreated }: { onCreated: () => void }) {
  const { store, content, getLesson } = useApp();
  const lessons = useAsync(() => content.listLessons(), [content]);
  const [lessonId, setLessonId] = useState('01');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [exerciseRef, setExerciseRef] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLesson(lessonId).then(setLesson, () => setLesson(null));
  }, [lessonId, getLesson]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await store.createHomework({ lessonId, title: title.trim(), instructions: instructions.trim(), exerciseRef: exerciseRef || null, dueDate: due || null });
      setTitle('');
      setInstructions('');
      setExerciseRef('');
      setDue('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h2 style={{ margin: 0 }}>Нове завдання</h2>
      <div className="row">
        <label className="field" style={{ flex: '0 0 140px' }}>
          Урок
          <select className="input" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
            {lessons.data?.map((l) => (
              <option key={l.id} value={l.id}>
                Lekce {l.number}
              </option>
            ))}
          </select>
        </label>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>
          Назва
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sešit s. 4, cv. 1–3" required />
        </label>
        <label className="field" style={{ flex: '0 0 170px' }}>
          Термін
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
      </div>
      <label className="field">
        Інструкція
        <textarea
          className="input"
          data-cz=""
          style={{ minHeight: 80 }}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Зроби вправи в зошиті та сфотографуй сторінку. / Napište 5 vět o sobě."
        />
      </label>
      <label className="field">
        Вправа із застосунку (необов'язково)
        <select className="input" value={exerciseRef} onChange={(e) => setExerciseRef(e.target.value)}>
          <option value="">— без вправи —</option>
          {lesson?.steps.map((s, i) =>
            stepExercises(s).map((ex) => (
              <option key={`${s.id}/${ex.id}`} value={`${s.id}/${ex.id}`}>
                Krok {i + 1} · {ex.title.cs}
              </option>
            )),
          )}
          {lesson?.test.exercises.map((ex) => (
            <option key={`test/${ex.id}`} value={`test/${ex.id}`}>
              Test · {ex.title.cs}
            </option>
          ))}
        </select>
      </label>
      {error && <ErrorBox error={error} />}
      <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={busy}>
        Задати
      </button>
    </form>
  );
}

export function HomeworkPage() {
  const { store, isTeacherView, profile, student } = useApp();
  const location = useLocation();
  const data = useAsync(async () => {
    const homework = await store.listHomework();
    const subs = await store.listSubmissions(isTeacherView ? {} : { studentId: profile?.id });
    return { homework, subs };
  }, [store, isTeacherView, profile?.id]);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (id && data.data) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, data.data]);

  return (
    <main className="page narrow">
      <h1>Домашні завдання</h1>
      <p className="muted">
        {isTeacherView
          ? 'Задавайте сторінки з робочого зошита або вправи із застосунку. Відповіді й фото учня з’являються тут.'
          : 'Робіть вправи в паперовому зошиті й завантажуйте фото або пишіть відповідь тут.'}
      </p>
      {isTeacherView && (
        <div style={{ marginBottom: 20 }}>
          <CreateHomework onCreated={data.reload} />
        </div>
      )}
      {data.loading && <Loading />}
      {data.error && <ErrorBox error={data.error} />}
      {data.data && data.data.homework.length === 0 && <div className="card empty">Завдань поки немає.</div>}
      <div className="stack">
        {data.data?.homework.map((h) =>
          isTeacherView ? (
            <TeacherHomework
              key={h.id}
              h={h}
              subs={data.data!.subs.filter((s) => s.homeworkId === h.id && (!student || s.studentId === student.id))}
              reload={data.reload}
            />
          ) : (
            <StudentHomework
              key={`${h.id}:${data.data!.subs.find((s) => s.homeworkId === h.id)?.submittedAt ?? ''}`}
              h={h}
              sub={data.data!.subs.find((s) => s.homeworkId === h.id)}
              reload={data.reload}
            />
          ),
        )}
      </div>
    </main>
  );
}
