import { useRef, useState, type ComponentType } from 'react';
import { Bi } from '../components/Bi';
import { AudioPlayer } from '../components/Audio';
import { Icon } from '../components/Icon';
import { ScoreBadge, dateUk, plural } from '../components/ui';
import type { Exercise } from '../content/schema';
import { useApp } from '../data/context';
import type { Attempt } from '../data/types';
import { grade, type AnyResponse, type GradeResult } from '../lib/grade';
import { Choice } from './Choice';
import { Classify } from './Classify';
import { Dictation } from './Dictation';
import { GapFill } from './GapFill';
import { Match } from './Match';
import { Multi } from './Multi';
import { Order } from './Order';
import { Table } from './Table';
import { initialResponse, KIND_LABEL, type ExProps } from './types';

const VIEWS: { [K in Exercise['type']]: ComponentType<ExProps<K>> } = {
  choice: Choice,
  multi: Multi,
  order: Order,
  match: Match,
  classify: Classify,
  gapfill: GapFill,
  table: Table,
  dictation: Dictation,
};

type Props = {
  ex: Exercise;
  lessonId: string;
  stepId: string;
  /** The subject's previous attempts at this exercise (oldest first). */
  history?: Attempt[];
  onSaved?: () => void;
};

export function ExerciseCard({ ex, lessonId, stepId, history = [], onSaved }: Props) {
  const { store, isTeacherView, profile } = useApp();
  const [value, setValue] = useState<AnyResponse>(() => initialResponse(ex));
  const [result, setResult] = useState<GradeResult | null>(null);
  const [reveal, setReveal] = useState(false);
  const [round, setRound] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Timed from the first answer, not page load (all cards on a step mount together).
  const started = useRef<number | null>(null);
  const change: typeof setValue = (v) => {
    if (started.current === null) started.current = Date.now();
    setValue(v);
  };

  const View = VIEWS[ex.type] as ComponentType<ExProps<typeof ex.type>>;
  const last = history[history.length - 1];
  const best = history.reduce<Attempt | undefined>((b, a) => (!b || a.score / a.max > b.score / b.max ? a : b), undefined);

  const check = async () => {
    const r = grade(ex, value);
    setResult(r);
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    try {
      await store.saveAttempt({
        lessonId,
        stepId,
        exerciseId: ex.id,
        score: r.score,
        max: r.max,
        items: r.items,
        // Capped so an answer left open for hours doesn't skew the stats.
        durationSec: started.current === null ? 0 : Math.min(1800, Math.round((Date.now() - started.current) / 1000)),
      });
      onSaved?.();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const retry = () => {
    setValue(initialResponse(ex));
    setResult(null);
    setReveal(false);
    setRound((r) => r + 1);
    started.current = null;
  };

  const almost = result?.items.some((i) => i.almost);
  const mistakes = isTeacherView && last ? last.items.filter((i) => !i.correct) : [];

  return (
    <article className="ex" id={`ex-${ex.id}`}>
      <header className="ex-head">
        <div style={{ flex: 1 }}>
          <div className="ex-kind">{KIND_LABEL[ex.type]}</div>
          <Bi text={ex.title} className="ex-title" as="div" />
        </div>
        {best && (
          <div className="row small muted" title={isTeacherView ? 'Найкращий результат учня' : 'Ваш найкращий результат'}>
            {isTeacherView ? 'учень' : 'найкраще'} <ScoreBadge score={best.score} max={best.max} />
          </div>
        )}
      </header>
      <div className="ex-body">
        {ex.instructions && <Bi text={ex.instructions} as="p" className="ex-instr" />}
        {ex.audio && (
          <div style={{ marginBottom: 14 }}>
            <AudioPlayer audio={ex.audio} />
          </div>
        )}
        <View ex={ex as never} value={value as never} onChange={change as never} result={result} reveal={reveal} seed={`${ex.id}:${round}`} />
      </div>
      <footer className="ex-foot">
        {!result ? (
          <button type="button" className="btn primary" onClick={check}>
            <Icon name="check" /> Перевірити
          </button>
        ) : (
          <>
            <div className="result-banner">
              <ScoreBadge score={result.score} max={result.max} />
              {result.score === result.max ? 'Výborně!' : result.score / result.max >= 0.7 ? 'Dobře!' : 'Zkuste to znovu.'}
            </div>
            <button type="button" className="btn" onClick={retry}>
              <Icon name="retry" /> Ще раз
            </button>
          </>
        )}
        {(result || isTeacherView) && (
          <button type="button" className={`btn ghost${isTeacherView ? ' teacher' : ''}`} onClick={() => setReveal((r) => !r)}>
            <Icon name="key" /> {reveal ? 'Сховати відповіді' : isTeacherView ? 'Ключ' : 'Показати відповіді'}
          </button>
        )}
        <span className="spacer" />
        {saving && <span className="muted small">Зберігаю…</span>}
        {saveError && <span className="almost-msg">Не збереглося: {saveError}</span>}
        {almost && <span className="almost-msg">Жовті відповіді майже правильні: перевірте háčky a čárky.</span>}
      </footer>
      {isTeacherView && last && (
        <div className="ex-foot" style={{ background: 'var(--teacher-bg)', borderTop: '1px solid var(--line)' }}>
          <div className="small" style={{ width: '100%' }}>
            <b style={{ color: 'var(--teacher)' }}>Остання спроба учня</b> · {dateUk(last.createdAt)} · {last.score}/{last.max} ·{' '}
            {plural(history.length, ['спроба', 'спроби', 'спроб'])}
            {last.durationSec > 0 && ` · ${last.durationSec < 60 ? `${last.durationSec} с` : `${Math.round(last.durationSec / 60)} хв`}`}
            {mistakes.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {mistakes.slice(0, 12).map((m, i) => (
                  <div className="mistake" key={i}>
                    {m.label && <span className="muted">{m.label} — </span>}
                    <s>{m.given || '∅'}</s> → <b>{m.expected}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
