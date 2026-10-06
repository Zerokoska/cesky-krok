import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SpeakButton } from '../components/Audio';
import { ErrorBox, Loading } from '../components/ui';
import type { VocabItem } from '../content/schema';
import { useApp } from '../data/context';
import { shuffledIndices } from '../lib/shuffle';
import { useProgress } from '../lib/useProgress';
import { useLesson } from './LessonPage';

const GENDER_LABEL: Record<NonNullable<VocabItem['gender']>, string> = {
  ma: 'r. m. životný',
  mi: 'r. m. neživotný',
  f: 'r. ž.',
  n: 'r. s.',
};

const clean = (cs: string) => cs.replace(/\*/g, '');

export function VocabPage() {
  const { lessonId = '' } = useParams();
  const { store, isTeacherView } = useApp();
  const lesson = useLesson(lessonId);
  const progress = useProgress(lessonId);
  const [mode, setMode] = useState<'list' | 'cards'>('cards');
  const [page, setPage] = useState<number | 'all'>('all');
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [round, setRound] = useState(0);
  const [local, setLocal] = useState<Record<string, boolean>>({});

  const status = useMemo(() => {
    const m: Record<string, boolean> = {};
    progress.data?.vocab.forEach((v) => (m[v.wordId] = v.known));
    return { ...m, ...local };
  }, [progress.data, local]);

  const words = lesson.data?.vocabulary ?? [];
  const pages = [...new Set(words.map((w) => w.page))];
  const filtered = words.filter((w) => (page === 'all' || w.page === page) && (!onlyUnknown || status[w.id] !== true));
  const deck = useMemo(
    () => shuffledIndices(filtered.length, `${page}:${onlyUnknown}:${round}`).map((i) => filtered[i]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered.length, page, onlyUnknown, round],
  );

  useEffect(() => {
    setPos(0);
    setFlipped(false);
  }, [page, onlyUnknown, round, mode]);

  if (lesson.loading) return <Loading />;
  if (lesson.error || !lesson.data) return <main className="page"><ErrorBox error={lesson.error ?? 'Урок не знайдено'} /></main>;

  const known = words.filter((w) => status[w.id] === true).length;
  const card = deck[pos];

  const mark = async (w: VocabItem, k: boolean) => {
    setLocal((s) => ({ ...s, [w.id]: k }));
    setFlipped(false);
    setPos((p) => p + 1);
    if (!isTeacherView) await store.setVocab(lessonId, w.id, k).catch(() => undefined);
  };

  return (
    <main className="page narrow">
      <div className="crumbs">
        <Link to="/">Уроки</Link> <span>›</span> <Link to={`/lekce/${lessonId}`}>Lekce {lesson.data.number}</Link> <span>›</span>
        <span>Slovíčka</span>
      </div>
      <h1>Slovíčka lekce {lesson.data.number}</h1>
      <p className="muted">
        Зі словничка до підручника, сторінки {pages[0]}–{pages[pages.length - 1]}. {isTeacherView ? 'Учень знає' : 'Знаю'}:{' '}
        <b>
          {known} / {words.length}
        </b>
      </p>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="seg">
          <button type="button" className={mode === 'cards' ? 'on' : ''} onClick={() => setMode('cards')}>
            Картки
          </button>
          <button type="button" className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>
            Список
          </button>
        </div>
        <select className="input" style={{ width: 'auto' }} value={page} onChange={(e) => setPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Усі сторінки</option>
          {pages.map((p) => (
            <option key={p} value={p}>
              s. {p}
            </option>
          ))}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={onlyUnknown} onChange={(e) => setOnlyUnknown(e.target.checked)} /> лише невивчені
        </label>
        {mode === 'cards' && (
          <label className="toggle">
            <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} /> UA → CZ
          </label>
        )}
      </div>

      {mode === 'cards' ? (
        card ? (
          <div className="stack">
            <div className="muted small">
              {pos + 1} / {deck.length}
            </div>
            <div className="card flash" onClick={() => setFlipped((f) => !f)} role="button" tabIndex={0} onKeyDown={(e) => e.key === ' ' && setFlipped((f) => !f)}>
              <div>
                {(!reverse || flipped) && (
                  <div className={`flash-word${card.gender ? ` g-${card.gender}` : ''}`}>{clean(card.cs)}</div>
                )}
                {card.gender && (!reverse || flipped) && <div className="muted small">{GENDER_LABEL[card.gender]}</div>}
                {(reverse || flipped) && <div className={reverse && !flipped ? 'flash-word' : 'flash-uk'}>{card.uk}</div>}
                {!flipped && <div className="muted small" style={{ marginTop: 14 }}>натисніть, щоб перевернути</div>}
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <SpeakButton text={clean(card.cs).split(',')[0]} />
              <button type="button" className="btn" onClick={() => mark(card, false)}>
                Ще вчу
              </button>
              <button type="button" className="btn primary" onClick={() => mark(card, true)}>
                Знаю
              </button>
            </div>
          </div>
        ) : (
          <div className="card empty stack">
            <b>{deck.length ? 'Колоду пройдено!' : 'Немає слів за цим фільтром.'}</b>
            <button type="button" className="btn" style={{ alignSelf: 'center' }} onClick={() => setRound((r) => r + 1)}>
              Ще раз
            </button>
          </div>
        )
      ) : (
        <div className="card">
          <div className="vocab-list">
            {filtered.map((w) => (
              <div className="vrow" key={w.id}>
                <span className={`dot${status[w.id] === true ? ' known' : status[w.id] === false ? ' unknown' : ''}`} />
                <div style={{ flex: 1 }}>
                  <div className={`vrow-cs${w.gender ? ` g-${w.gender}` : ''}`}>{clean(w.cs)}</div>
                  <div className="vrow-uk">{w.uk}</div>
                </div>
                <SpeakButton text={clean(w.cs).split(',')[0]} />
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="muted small" style={{ marginTop: 16 }}>
        Кольори як у підручнику: <span className="g-ma">чол. рід (істоти)</span>, <span className="g-mi">чол. рід (неістоти)</span>,{' '}
        <span className="g-f">жін. рід</span>, <span className="g-n">сер. рід</span>. Зірочка в підручнику означає неправильне дієслово.
      </p>
    </main>
  );
}
